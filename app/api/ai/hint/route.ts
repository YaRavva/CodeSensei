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
    const { taskId, code } = body || {};
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    // Rate limit (простая заглушка — можно расширить позднее)
    // Здесь можно подключить lib/utils/rate-limit

    const { data: task } = await supabase
      .from("tasks")
      .select("title, description")
      .eq("id", taskId)
      .maybeSingle();

    const typedTask = task as { title: string; description: string } | null;
    const prompt = `Ты наставник по Python. Дай поэтапную подсказку (не решение) к задаче. Структура JSON: {\"type\": \"concept\"|\"edge_case\"|\"debug\", \"hint\": string, \"steps\": string[]}.
Задача: ${typedTask?.title ?? "Без названия"}
Описание: ${(typedTask?.description ?? "").slice(0, 1000)}
Код ученика (может быть пустым):\n${(code ?? "").slice(0, 1200)}`;

    if (!HF_API_KEY) return NextResponse.json({ error: "Hugging Face API key is not configured" }, { status: 500 });

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ model: "openai/gpt-oss-20b", messages: [{ role: "user", content: prompt }], temperature: 0.4, max_tokens: 600 }),
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `HF error ${response.status}`, details: err.slice(0, 1000) }, { status: 502 });
    }
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "";
    if (content.startsWith("```")) content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { type: "concept", hint: content.slice(0, 400), steps: [] };
    }
    return NextResponse.json({ success: true, hint: parsed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}


