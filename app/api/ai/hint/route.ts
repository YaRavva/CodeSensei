export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { checkHintLimit, logHintEvent } from "@/lib/appwrite/hint-events";
import { getTask } from "@/lib/appwrite/tasks";
import { getAuthContext } from "@/lib/utils/auth";
import { buildHintPrompt, parseHintResponse } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, code } = body || {};
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    const task = await getTask(String(taskId));
    if (!task) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });

    const limit = await checkHintLimit(context.user.$id, task.id);
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.error }, { status: 429 });
    }

    const typedTask = task as { title: string; description: string; task_type?: string } | null;
    const taskType = typedTask?.task_type === "function" || typedTask?.task_type === "class"
      ? typedTask.task_type
      : "linear";

    const prompt = buildHintPrompt({
      taskTitle: typedTask?.title ?? "Без названия",
      taskDescription: typedTask?.description ?? "",
      taskType,
      studentCode: code ?? "",
    });

    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY" },
        { status: 500 }
      );
    }

    let content = "";

    try {
      const completion = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        maxTokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
      });
      content = completion.content.trim();
    } catch (error) {
      if (error instanceof OmnirouteError) {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 502 });
      }
      throw error;
    }

    // A hint counts as used once it was delivered; it lowers the XP for the task.
    await logHintEvent(context.user.$id, task.id);

    const parsed = parseHintResponse(content);
    return NextResponse.json({ success: true, hint: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
