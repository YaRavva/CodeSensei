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
    const { taskId, code } = body || {};
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    // Rate limit (простая заглушка — можно расширить позднее)
    // Здесь можно подключить lib/utils/rate-limit

    const task = await getTask(String(taskId));

    const typedTask = task as { title: string; description: string } | null;
    const prompt = `Ты наставник по Python. Дай поэтапную подсказку (не решение) к задаче. Структура JSON: {"type": "concept"|"edge_case"|"debug", "hint": string, "steps": string[]}.
Задача: ${typedTask?.title ?? "Без названия"}
Описание: ${clipForPrompt(typedTask?.description ?? "")}
Код ученика (может быть пустым):\n${clipForPrompt(code ?? "")}`;

    if (!isOmnirouteConfigured())
      return NextResponse.json(
        { error: "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY" },
        { status: 500 }
      );

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

    if (content.startsWith("```"))
      content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { type: "concept", hint: content.slice(0, 2000), steps: [] };
    }
    return NextResponse.json({ success: true, hint: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
