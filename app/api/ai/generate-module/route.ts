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
    // Используем as any для обхода проблемы с типами, так как функция была создана через миграцию
    const { data: userRole, error: roleError } = await (supabase.rpc as any)("get_user_role", {
      user_id: user.id,
    });

    const role = typeof userRole === "string" ? userRole : String(userRole ?? "");

    if (roleError || (role !== "admin" && role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Проверка rate limit
    const { checkRateLimit, logGeneration } = await import("@/lib/utils/rate-limit");
    const rateLimitCheck = await checkRateLimit(user.id, "module");
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
${description ? `- Дополнительные требования: ${description}` : ""}
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

    // Единый вызов только к openai/gpt-oss-20b через общий chat completions endpoint
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Hugging Face API error: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 1000),
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Извлекаем текст из ответа OpenAI-совместимого формата
    let generatedText = "";
    
    if (data?.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      generatedText = data.choices[0].message.content;
    } else {
      console.error("Unexpected API response format:", data);
      return NextResponse.json(
        { error: "No generated text received", rawResponse: JSON.stringify(data).substring(0, 500) },
        { status: 500 }
      );
    }

    // Пытаемся извлечь JSON из ответа
    let moduleData;
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
      function tryFixJson(text: string): string {
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
            }
            else if (char === "[") bracketDepth++;
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
      console.error("Generated text (last 500 chars):", generatedText.substring(Math.max(0, generatedText.length - 500)));
      // Мягкий фолбэк: возвращаем текст как описание, чтобы UI мог продолжить работу
      moduleData = {
        description: generatedText,
        theory: null,
      } as any;
    }

    // Логируем успешную генерацию
    await logGeneration(user.id, "module");

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
