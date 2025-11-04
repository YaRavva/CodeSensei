export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, code, runtimeOutput, testSummary } = body || {};
    if (!taskId || typeof code !== "string") {
      return NextResponse.json({ error: "taskId and code are required" }, { status: 400 });
    }

    if (!HF_API_KEY) {
      return NextResponse.json({ error: "Hugging Face API key is not configured" }, { status: 500 });
    }

    // Получим описание задачи (минимальный контекст)
    const { data: task } = await supabase
      .from("tasks")
      .select("title, description")
      .eq("id", taskId)
      .maybeSingle();

    const typedTask = task as { title: string; description: string } | null;
    const prompt = `Ты — наставник по Python для школьника. Оцени решение задачи по критериям: корректность, покрытие крайних случаев, читаемость. Верни ТОЛЬКО JSON {\"score\": number 0..1, \"feedback\": string}.

Задача: ${typedTask?.title ?? "Без названия"}
Описание (Markdown):\n${(typedTask?.description ?? "").slice(0, 2000)}

Код ученика:\n\n${code.slice(0, 4000)}

Вывод выполнения:${runtimeOutput ? `\n${String(runtimeOutput).slice(0, 2000)}` : "\n(нет)"}
Результаты тестов (сводка):${testSummary ? `\n${String(testSummary).slice(0, 1000)}` : "\n(нет)"}`;

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `HF error ${response.status}`, details: err.slice(0, 1000) }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "";
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}


