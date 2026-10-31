/**
 * End-to-end test of the Omniroute AI API call.
 *
 * 1. Loads Omniroute config from .env.local (same env vars the route uses).
 * 2. Builds the exact prompt the generate-module route uses, for a missing theme.
 * 3. Calls POST {OMNIROUTE_BASE_URL}/chat/completions (OpenAI-compatible).
 * 4. Prints the response meta and saves the extracted module JSON to scripts/test/.
 *
 * Theme choice: "Строки" — string operations are a core foundation topic,
 * absent from the live modules list.
 */

import { loadEnv } from "./env.mjs";

// Load .env.local so Omniroute params are available to this process.
await loadEnv();

const OMNIROUTE_BASE_URL = (process.env.OMNIROUTE_BASE_URL ?? "").replace(/\/+$/, "");
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || "antigravity/gemini-3-flash";
const OMNIROUTE_MAX_OUTPUT_TOKENS = Number(process.env.OMNIROUTE_MAX_OUTPUT_TOKENS) || 8192;

if (!OMNIROUTE_BASE_URL || !OMNIROUTE_API_KEY) {
  console.error("Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY");
  process.exit(1);
}

const topic = "Строки";
const level = "2";
const levelNames = {
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

console.log(`→ Calling ${OMNIROUTE_BASE_URL}/chat/completions`);
console.log(`→ Model: ${OMNIROUTE_MODEL}, topic: "${topic}", level: ${level}`);

const startedAt = Date.now();

let response;
try {
  response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OMNIROUTE_API_KEY}`,
    },
    body: JSON.stringify({
      model: OMNIROUTE_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
    }),
    signal: AbortSignal.timeout(120_000),
  });
} catch (error) {
  console.error(`Ошибка сети к Omniroute: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (!response.ok) {
  const details = (await response.text().catch(() => "")).slice(0, 1000);
  console.error(`Omniroute HTTP ${response.status}: ${details}`);
  process.exit(1);
}

const data = await response.json();
console.log(`✓ HTTP ${response.status} за ${Date.now() - startedAt} мс`);
console.log(`✓ model="${data.model}" usage=${JSON.stringify(data.usage ?? {})}`);

const generatedText = data.choices?.[0]?.message?.content;
if (typeof generatedText !== "string" || !generatedText.trim()) {
  console.error("Omniroute вернул пустой ответ");
  process.exit(1);
}

// Extract JSON object from the response
let jsonText = generatedText.trim();
if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```\n?/g, "");

const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
if (jsonMatch) jsonText = jsonMatch[0];

// Minor cleanup of typical artifacts
jsonText = jsonText.replace(/,\s*"\{/g, ",{").replace(/\}\s*"\s*,/g, "},");

let moduleData;
try {
  moduleData = JSON.parse(jsonText);
} catch (error) {
  console.error(`JSON parse error: ${error.message}`);
  console.error(`First 2000 chars: ${generatedText.slice(0, 2000)}`);
  process.exit(1);
}

if (!moduleData.theory || !Array.isArray(moduleData.theory.sections)) {
  console.error("Generated module is missing theory.sections — unexpected shape");
  console.error(JSON.stringify(moduleData, null, 2).slice(0, 3000));
  process.exit(1);
}

const outputPath = new URL("./generated-module-stroki.json", import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, "$1")
  .replace(/\//g, "\\");

import { writeFileSync } from "node:fs";
writeFileSync(outputPath, JSON.stringify({ topic, level: Number(level), ...moduleData }, null, 2), "utf8");

console.log(`\nСводка сгенерированного модуля:`);
console.log(`- description: ${moduleData.description}`);
console.log(`- sections: ${moduleData.theory.sections.map((s) => s.heading).join(" | ")}`);
console.log(`- key concepts: ${moduleData.theory.key_concepts.join(", ")}`);
console.log(`-> Сохранено в: ${outputPath}`);
