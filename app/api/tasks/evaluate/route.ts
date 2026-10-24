export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import {
  clipForPrompt,
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { getTask } from "@/lib/appwrite/tasks";
import { getAuthContext } from "@/lib/utils/auth";

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

    // Получим описание задачи (минимальный контекст)
    const task = await getTask(String(taskId));

    const typedTask = task as { title: string; description: string } | null;
    const prompt = `Ты — наставник по Python для школьника. Оцени решение задачи по критериям: корректность, покрытие крайних случаев, читаемость. Верни ТОЛЬКО JSON {"score": number 0..1, "feedback": string}.

Задача: ${typedTask?.title ?? "Без названия"}
Описание (Markdown):\n${clipForPrompt(typedTask?.description ?? "")}

Код ученика:\n\n${clipForPrompt(code)}

Вывод выполнения:${runtimeOutput ? `\n${clipForPrompt(runtimeOutput)}` : "\n(нет)"}
Результаты тестов (сводка):${testSummary ? `\n${clipForPrompt(testSummary)}` : "\n(нет)"}`;

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

    if (content.startsWith("```")) {
      content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
    }
    let parsed: { score: number; feedback: string } | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { score: 0, feedback: "Оценка недоступна. Попробуйте ещё раз." };
    }

    const score = typeof parsed?.score === "number" ? parsed.score : 0;
    const feedback = typeof parsed?.feedback === "string" ? parsed.feedback : "";
    const passed = score >= 0.7;
    return NextResponse.json({ success: true, score, feedback, passed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
