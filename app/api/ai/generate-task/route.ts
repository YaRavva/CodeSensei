import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации и прав админа/учителя
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверка роли через RPC функцию
    const { data: userRole, error: roleError } = await (supabase.rpc as any)("get_user_role", {
      user_id: user.id,
    });

    const role = typeof userRole === "string" ? userRole : String(userRole ?? "");

    if (roleError || (role !== "admin" && role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверка rate limit
    const { checkRateLimit, logGeneration } = await import("@/lib/utils/rate-limit");
    const rateLimitCheck = await checkRateLimit(user.id, "task");
    if (!rateLimitCheck.canGenerate) {
      return NextResponse.json(
        { error: rateLimitCheck.error || "Rate limit exceeded", remaining: rateLimitCheck.remaining },
        { status: 429 }
      );
    }

    // Проверка наличия API ключа
    if (!HF_API_KEY) {
      return NextResponse.json(
        { error: "Hugging Face API key is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { topic, difficulty, lessonTheory } = body;

    if (!topic || !difficulty) {
      return NextResponse.json({ error: "Topic and difficulty are required" }, { status: 400 });
    }

    const difficultyNames: Record<string, string> = {
      easy: "легкое (для начинающих)",
      medium: "среднее (для продолжающих)",
      hard: "сложное (для опытных)",
    };

    const prompt = `Ты — опытный преподаватель программирования Python для школьников 7-9 классов.

Твоя задача: создать практическое задание по теме "${topic}".

**Контекст:**
- Сложность задания: ${difficultyNames[difficulty] ?? "среднее"}
${lessonTheory ? `- Теория урока (для контекста):\n${lessonTheory.substring(0, 500)}...` : ""}

**Требования к ответу:**

Ты должен вернуть ТОЛЬКО валидный JSON объект со следующей структурой (без дополнительных комментариев или текста вне JSON):

{
  "title": "Название задания",
  "description": "Подробное описание задания в формате Markdown. Объясни, что нужно сделать, приведите примеры входных и выходных данных.",
  "starter_code": "def function_name(параметры):\n    # Напишите здесь ваше решение\n    pass",
  "solution_code": "def function_name(параметры):\n    # Правильное решение\n    return результат",
  "test_cases": [
    {
      "id": "test_1",
      "description": "Базовый случай",
      "input": {"param1": значение1, "param2": значение2},
      "expected_output": ожидаемый_результат,
      "category": "basic",
      "is_visible": true
    },
    {
      "id": "test_2",
      "description": "Граничный случай",
      "input": {"param1": значение1, "param2": значение2},
      "expected_output": ожидаемый_результат,
      "category": "edge",
      "is_visible": false
    }
  ],
  "hints": [
    "Подсказка 1: ...",
    "Подсказка 2: ...",
    "Подсказка 3: ..."
  ],
  "xp_reward": 10
}

**Правила:**
1. Название задания должно быть коротким и понятным (3-7 слов)
2. Описание должно быть на русском языке, в формате Markdown, понятным для школьников 7-9 классов
3. Стартовый код должен содержать определение функции с параметрами, но без реализации (используй `pass` или комментарии)
4. Правильное решение (solution_code) должно быть рабочим Python кодом
5. Тестовые случаи:
   - Минимум 3 теста (1 базовый видимый, 2 граничных/скрытых)
   - `input` - объект с именованными параметрами функции
   - `expected_output` - ожидаемый результат любого типа
   - `category` - "basic", "edge" или "error"
   - `is_visible` - true только для базовых тестов
6. Подсказки должны быть постепенными (от общей к конкретной), минимум 3 подсказки
7. XP награда: 10 для easy, 20 для medium, 30 для hard

**Стиль:**
- Используй простой язык
- Избегай сложных терминов без объяснений
- Примеры должны быть релевантными для школьников

**Важно:** Возвращай ТОЛЬКО валидный JSON, без markdown разметки`;

    // Запрос к Hugging Face Inference Providers API
    const modelConfigs = [
      {
        baseURL: "https://router.huggingface.co/nebius/v1/chat/completions",
        model: "openai/gpt-oss-20b",
      },
    ];

    let lastError: Error | null = null;

    for (const config of modelConfigs) {
      try {
        const response = await fetch(config.baseURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HF_API_KEY}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Hugging Face API error: ${JSON.stringify({ status: response.status, statusText: response.statusText, error: errorText })}`
          );
        }

        const data = await response.json();
        const generatedText = data.choices?.[0]?.message?.content || "";

        if (!generatedText) {
          throw new Error("Empty response from AI");
        }

        // Извлекаем JSON из ответа
        let jsonText = generatedText.trim();

        // Удаляем markdown код блоки, если есть
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        // Попытка исправить неполный JSON
        let taskData: any = null;
        try {
          taskData = JSON.parse(jsonText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Generated text:", generatedText);
          // Попытка исправить JSON
          taskData = tryFixJson(jsonText);
        }

        // Логируем успешную генерацию
        await logGeneration(user.id, "task");

        return NextResponse.json({
          success: true,
          data: taskData,
          remaining: rateLimitCheck.remaining - 1,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error with ${config.model}:`, lastError);
        continue;
      }
    }

    throw lastError || new Error("All models failed");
  } catch (error) {
    console.error("Generate task error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Пытается исправить неполный или поврежденный JSON
 */
function tryFixJson(jsonText: string): any {
  try {
    // Удаляем trailing commas
    let fixed = jsonText.replace(/,(\s*[}\]])/g, "$1");

    // Пытаемся балансировать скобки
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    // Закрываем незакрытые скобки
    if (openBraces > closeBraces) {
      fixed += "\n" + "}".repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      fixed += "\n" + "]".repeat(openBrackets - closeBrackets);
    }

    // Удаляем неполные строки в конце
    const lines = fixed.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes('"') && !lastLine.match(/".*":\s*".*",?\s*$/)) {
      // Удаляем последнюю строку, если она неполная
      lines.pop();
      fixed = lines.join("\n");
    }

    // Обрезаем до последнего валидного символа
    let lastValidIndex = fixed.length;
    for (let i = fixed.length - 1; i >= 0; i--) {
      const testStr = fixed.substring(0, i + 1);
      try {
        JSON.parse(testStr);
        lastValidIndex = i + 1;
        break;
      } catch {
        continue;
      }
    }

    fixed = fixed.substring(0, lastValidIndex);
    if (openBraces > closeBraces) {
      fixed += "}".repeat(openBraces - closeBraces);
    }

    return JSON.parse(fixed);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

