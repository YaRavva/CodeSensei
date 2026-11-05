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
import { MAX_CODE_LENGTH } from "@/lib/security/rate-limit";
import { canAccessTask } from "@/lib/security/task-access";

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, code } = body || {};
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    const task = await getTask(String(taskId));
    if (!task || !(await canAccessTask(context.user.$id, context.profile.role, task))) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    }
    if (typeof code === "string" && code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "Код слишком длинный" }, { status: 400 });
    }

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
      studentCode: typeof code === "string" ? code : "",
    });

    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "AI-подсказки временно недоступны" },
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
        console.error("Hint AI error:", error.message, error.details);
        return NextResponse.json({ error: "AI-сервис временно недоступен" }, { status: 502 });
      }
      throw error;
    }

    // A hint counts as used once it was delivered; it lowers the XP for the task.
    await logHintEvent(context.user.$id, task.id);

    const parsed = parseHintResponse(content);
    return NextResponse.json({ success: true, hint: parsed });
  } catch (e) {
    console.error("Hint failed:", e);
    return NextResponse.json({ error: "Не удалось получить подсказку" }, { status: 500 });
  }
}
