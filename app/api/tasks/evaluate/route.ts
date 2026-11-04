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

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, code, runtimeOutput, testSummary } = body || {};
    if (!taskId || typeof code !== "string") {
      return NextResponse.json({ error: "taskId and code are required" }, { status: 400 });
    }

    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY" },
        { status: 500 }
      );
    }

    const task = await getTask(String(taskId));

    const typedTask = task as { title: string; description: string; task_type?: string } | null;
    const taskType = (typedTask?.task_type as "linear" | "function") || "function";

    const prompt = buildEvaluationPrompt({
      taskTitle: typedTask?.title ?? "Без названия",
      taskDescription: typedTask?.description ?? "",
      taskType,
      studentCode: code,
      runtimeOutput,
      testSummary,
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
        return NextResponse.json({ error: error.message, details: error.details }, { status: 502 });
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
