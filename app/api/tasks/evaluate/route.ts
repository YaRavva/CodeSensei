export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { getTask } from "@/lib/appwrite/tasks";
import { getAuthContext } from "@/lib/utils/auth";
import { buildEvaluationPrompt, parseEvaluationResponse } from "@/lib/prompts";
import { HOUR, hit, MAX_CODE_LENGTH, MAX_TEXT_LENGTH, tooManyRequests } from "@/lib/security/rate-limit";
import { canAccessTask } from "@/lib/security/task-access";

function clip(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.slice(0, MAX_TEXT_LENGTH);
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, code, runtimeOutput, testSummary } = body || {};
    if (!taskId || typeof code !== "string") {
      return NextResponse.json({ error: "taskId and code are required" }, { status: 400 });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "Код слишком длинный" }, { status: 400 });
    }

    // Each evaluation is a paid AI call.
    const limit = hit(`evaluate:user:${context.user.$id}`, 60, HOUR);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "AI-проверка временно недоступна" },
        { status: 500 }
      );
    }

    const task = await getTask(String(taskId));
    if (!task || !(await canAccessTask(context.user.$id, context.profile.role, task))) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    }

    const typedTask = task as { title: string; description: string; task_type?: string } | null;
    const taskType = typedTask?.task_type === "function" || typedTask?.task_type === "class"
      ? typedTask.task_type
      : "linear";

    const prompt = buildEvaluationPrompt({
      taskTitle: typedTask?.title ?? "Без названия",
      taskDescription: typedTask?.description ?? "",
      taskType,
      studentCode: code,
      runtimeOutput: clip(runtimeOutput),
      testSummary: clip(testSummary),
    });

    let content = "";

    try {
      const completion = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
      });
      content = completion.content.trim();
    } catch (error) {
      if (error instanceof OmnirouteError) {
        console.error("Evaluate AI error:", error.message, error.details);
        return NextResponse.json({ error: "AI-сервис временно недоступен" }, { status: 502 });
      }
      throw error;
    }

    const parsed = parseEvaluationResponse(content);
    const passed = parsed.score >= 0.7;

    return NextResponse.json({
      success: true,
      score: parsed.score,
      feedback: parsed.feedback,
      passed,
    });
  } catch (e) {
    console.error("Evaluate failed:", e);
    return NextResponse.json({ error: "Не удалось проверить решение" }, { status: 500 });
  }
}
