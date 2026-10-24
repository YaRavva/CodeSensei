import { type NextRequest, NextResponse } from "next/server";
import {
  clipForPrompt,
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { requireApiAdmin } from "@/lib/appwrite/api";
import { logGeneration } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    // Проверка rate limit
    const { checkRateLimit } = await import("@/lib/utils/rate-limit");
    const rateLimitCheck = await checkRateLimit(userId, "module");
    if (!rateLimitCheck.canGenerate) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error || "Rate limit exceeded",
          remaining: rateLimitCheck.remaining,
        },
        { status: 429 }
      );
    }

    // Проверка наличия конфигурации Omniroute
    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { topic, level, description } = body;

    if (!topic || !level) {
      return NextResponse.json({ error: "Topic and level are required" }, { status: 400 });
    }

    // Формируем промпт для генерации модуля
    const levelNames: Record<string, string> = {
      "1": "начальный (для начинающих)",
      "2": "базовый (для продолжающих)",
      "3": "средний (для уверенных)",
      "4": "продвинутый (для опытных)",
      "5": "экспертный (для мастеров)",
    };

    const prompt = `Ты — опытный преподаватель программирования Python для школьников 7-9 классов.

Твоя задача: создать учебный модуль по теме "${topic}".

**Контекст:**
- Уровень сложности: ${levelNames[level] ?? "базовый"}
${description ? `- Дополнительные требования: ${clipForPrompt(description)}` : ""}
- Продолжительность урока: 30-45 минут

**Требования к ответу:**

Ты должен вернуть ТОЛЬКО валидный JSON объект со следующей структурой (без дополнительных комментариев или текста вне JSON):

{
  "description": "Подробное описание модуля для школьников (2-3 предложения)",
  "theory": {
    "introduction": "Краткое введение (2-3 предложения)",
    "sections": [
      {
        "heading": "Заголовок раздела",
        "content": "Markdown контент с объяснениями. Используй простой язык, понятный для школьников 7-9 классов.",
        "code_examples": [
          {
            "description": "Описание примера",
            "code": "код на Python",
            "output": "ожидаемый вывод",
            "explanation": "Краткое объяснение того, что делает код"
          }
        ]
      }
    ],
    "summary": "Краткое резюме изученного (1-2 предложения)",
    "key_concepts": ["концепция 1", "концепция 2", "концепция 3"]
  }
}

**Стиль изложения:**
- Дружелюбный, но профессиональный тон
- Используй простые аналогии из жизни школьников
- Избегай сложной терминологии без объяснений
- Каждый код-пример должен быть работоспособным
- Пиши на русском языке

**Важно:**
- Модуль должен быть посильным для указанного уровня
- Примеры должны быть понятными для школьников 7-9 классов
- Возвращай ТОЛЬКО валидный JSON, без markdown разметки`;

    // Генерация через Omniroute (OpenAI-совместимый chat completions)
    let generatedText = "";

    try {
      const completion = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        maxTokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      });
      generatedText = completion.content;
    } catch (error) {
      if (error instanceof OmnirouteError) {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 502 });
      }
      throw error;
    }

    // Пытаемся извлечь JSON из ответа
    let moduleData: unknown;
    try {
      // Убираем markdown разметку, если есть
      let jsonText = generatedText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      // Ищем JSON объект в тексте
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      // Быстрые правки типичных артефактов (например: ,"{ -> ,{)
      jsonText = jsonText.replace(/,\s*"\{/g, ",{");
      // и }" , -> },
      jsonText = jsonText.replace(/\}\s*"\s*,/g, "},");

      // Пытаемся починить незавершенный JSON
      let fixedJson = jsonText;

      // Функция для закрытия незавершенного JSON
      function tryFixJson(input: string): string {
        let text = input;
        // Удаляем завершающие запятые перед скобками
        text = text.replace(/,(\s*[}\]])/g, "$1");

        // Удаляем незавершенные строки (текст после последней закрытой строки)
        // Находим последнюю валидную позицию перед незавершенной строкой
        let lastValidPos = text.length;
        let quoteCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === "\\") {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            quoteCount++;
          }
          if (!inString) {
            lastValidPos = i + 1;
          }
        }

        // Если есть незавершенная строка, обрезаем до последней валидной позиции
        if (quoteCount % 2 !== 0 && lastValidPos < text.length) {
          text = text.substring(0, lastValidPos);
          // Удаляем последнюю незавершенную строку до предыдущего валидного элемента
          const lastQuote = text.lastIndexOf('"');
          if (lastQuote !== -1) {
            // Ищем начало этой строки
            let startQuote = -1;
            for (let i = lastQuote - 1; i >= 0; i--) {
              if (text[i] === '"' && (i === 0 || text[i - 1] !== "\\")) {
                startQuote = i;
                break;
              }
            }
            if (startQuote !== -1) {
              // Обрезаем до начала этой строки
              text = text.substring(0, startQuote);
            }
          }
        }

        // Подсчитываем скобки
        let depth = 0;
        let bracketDepth = 0;
        let lastCompletePos = text.length;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === "{") depth++;
          else if (char === "}") depth--;
          else if (char === "[") bracketDepth++;
          else if (char === "]") bracketDepth--;

          // Отмечаем последнюю позицию, где структуры сбалансированы
          if (depth === 0 && bracketDepth === 0 && (char === "}" || char === "]")) {
            lastCompletePos = i + 1;
          }
        }

        // Обрезаем до последней сбалансированной позиции
        if (lastCompletePos < text.length) {
          text = text.substring(0, lastCompletePos);
        }

        // Закрываем незавершенные структуры
        while (bracketDepth > 0) {
          text += "]";
          bracketDepth--;
        }
        while (depth > 0) {
          text += "}";
          depth--;
        }

        return text;
      }

      // Пробуем исправить JSON
      try {
        fixedJson = tryFixJson(jsonText);
        moduleData = JSON.parse(fixedJson);
      } catch (e) {
        // Если первая попытка не сработала, пробуем агрессивное обрезание
        try {
          // Находим последний завершенный объект или массив
          let lastValidPos = -1;
          let depth = 0;
          let bracketDepth = 0;

          for (let i = 0; i < jsonText.length; i++) {
            const char = jsonText[i];
            if (char === "{") depth++;
            else if (char === "}") {
              depth--;
              if (depth === 0 && bracketDepth === 0) {
                lastValidPos = i + 1;
              }
            } else if (char === "[") bracketDepth++;
            else if (char === "]") {
              bracketDepth--;
              if (depth === 0 && bracketDepth === 0) {
                lastValidPos = i + 1;
              }
            }
          }

          if (lastValidPos > 0) {
            fixedJson = jsonText.substring(0, lastValidPos);
            // Удаляем завершающую запятую если есть
            fixedJson = fixedJson.trim();
            if (fixedJson.endsWith(",")) {
              fixedJson = fixedJson.slice(0, -1);
            }
            // Закрываем открытые структуры
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;

            while (openBrackets > closeBrackets) {
              fixedJson += "]";
            }
            while (openBraces > closeBraces) {
              fixedJson += "}";
            }

            moduleData = JSON.parse(fixedJson);
          } else {
            throw e; // Если не нашли валидную позицию, перебрасываем ошибку
          }
        } catch (finalError) {
          // Последняя попытка - просто обрезаем до последней закрывающей скобки
          const lastBrace = jsonText.lastIndexOf("}");
          const lastBracket = jsonText.lastIndexOf("]");
          const lastValid = Math.max(lastBrace, lastBracket);

          if (lastValid > 0) {
            fixedJson = jsonText.substring(0, lastValid + 1);
            // Закрываем открытые структуры
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;

            while (openBrackets > closeBrackets) {
              fixedJson += "]";
            }
            while (openBraces > closeBraces) {
              fixedJson += "}";
            }

            moduleData = JSON.parse(fixedJson);
          } else {
            throw finalError; // Перебрасываем последнюю ошибку
          }
        }
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Generated text length:", generatedText.length);
      console.error("Generated text (first 2000 chars):", generatedText.substring(0, 2000));
      console.error(
        "Generated text (last 500 chars):",
        generatedText.substring(Math.max(0, generatedText.length - 500))
      );
      // Мягкий фолбэк: возвращаем текст как описание, чтобы UI мог продолжить работу
      moduleData = {
        description: generatedText,
        theory: null,
      } as any;
    }

    // Логируем успешную генерацию
    await logGeneration(userId, "module");

    return NextResponse.json({
      success: true,
      data: moduleData,
      remaining: rateLimitCheck.remaining - 1,
    });
  } catch (error) {
    console.error("Error generating module:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
