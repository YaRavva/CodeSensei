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

    // Запрос к Hugging Face Inference Providers API (новый формат с 2 ноября 2025)
    // Используем формат из примера: baseURL с провайдером nebius
    // Пробуем несколько вариантов модели
    const baseUrls = [
      "https://router.huggingface.co/nebius/v1/chat/completions", // Chat completions с nebius
      "https://router.huggingface.co/nebius/v1/completions", // Completions с nebius
      "https://router.huggingface.co/v1/chat/completions", // Без провайдера
    ];
    
    const modelsToTry = [
      "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
      "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct:nebius",
      "openai/gpt-oss-20b", // Из примера пользователя
    ];
    
    let lastError: string = "";
    let data: any = null;
    
    for (const baseUrl of baseUrls) {
      for (const modelName of modelsToTry) {
        try {
          // Формируем запрос в формате OpenAI Chat Completions
          const requestBody = {
            model: modelName,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          max_tokens: 4000,
          temperature: 0.7,
          };

          const response = await fetch(baseUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            data = await response.json();
            console.log(`Success with baseUrl: ${baseUrl}, model: ${modelName}`);
            break; // Успешно получили ответ
          } else {
            const errorText = await response.text();
            lastError = errorText;
            console.error(`Failed with baseUrl ${baseUrl}, model ${modelName}:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText.substring(0, 200),
            });
            
            // Если это не 404, возможно проблема с авторизацией
            if (response.status !== 404) {
              return NextResponse.json(
                {
                  error: `Hugging Face API error: ${response.statusText}`,
                  details: errorText.substring(0, 500),
                },
                { status: response.status }
              );
            }
            // Продолжаем пробовать следующий вариант если 404
          }
        } catch (error) {
          console.error(`Error with baseUrl ${baseUrl}, model ${modelName}:`, error);
          lastError = error instanceof Error ? error.message : String(error);
          // Продолжаем пробовать следующий вариант
        }
      }
      
      // Если нашли рабочий вариант, выходим из цикла baseUrls
      if (data) break;
    }

    // Если ни один вариант не сработал
    if (!data) {
      return NextResponse.json(
        {
          error: `Hugging Face API error: All endpoints and models failed (404 Not Found)`,
          details: `Попробованы baseURLs: ${baseUrls.join(", ")} и модели: ${modelsToTry.join(", ")}. 
Возможные причины:
1. Модель недоступна через Inference Providers API
2. Требуется другой провайдер или endpoint
3. Проверьте доступность модели на https://huggingface.co/models

Попробуйте:
- Проверить страницу модели на Hugging Face для правильного имени
- Использовать другую модель, доступную через Inference Providers`,
          lastError: lastError.substring(0, 500),
        },
        { status: 500 }
      );
    }

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
      
      return NextResponse.json(
        {
          error: "Failed to parse AI response as JSON",
          details: parseError instanceof Error ? parseError.message : String(parseError),
          rawResponse: generatedText.substring(0, 2000),
          responseLength: generatedText.length,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: moduleData });
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
