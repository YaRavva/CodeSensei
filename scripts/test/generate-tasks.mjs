/**
 * Generates 3 tasks (easy, medium, hard) for the "Строки" module via
 * Omniroute and persists them to Appwrite.
 *
 * Uses the same prompt template as app/api/ai/generate-task/route.ts
 * plus the module's stored theory as context, so tasks match the module.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();

const MODULE_ID = "9264df56-05de-4f10-8a23-8d3160f7ca8f"; // module "Строки"
const DIFFICULTIES = [
  { key: "easy", xp: 10 },
  { key: "medium", xp: 20 },
  { key: "hard", xp: 30 },
];

const OMNIROUTE_BASE_URL = (process.env.OMNIROUTE_BASE_URL ?? "").replace(/\/+$/, "");
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || "antigravity/gemini-3-flash";
const OMNIROUTE_MAX_OUTPUT_TOKENS = Number(process.env.OMNIROUTE_MAX_OUTPUT_TOKENS) || 8192;

if (!OMNIROUTE_BASE_URL || !OMNIROUTE_API_KEY) {
  console.error("Omniroute не настроен");
  process.exit(1);
}

/** Load module theory from the DB (markdown description). */
async function getModuleDescription(client) {
  const db = new TablesDB(client);
  const row = await db.getRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "modules",
    rowId: MODULE_ID,
  });
  return row.description ?? "";
}

function clipForPrompt(value, limit = 100_000) {
  const text = typeof value === "string" ? value : String(value ?? "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[... текст обрезан: ещё ${text.length - limit} символов ...]`;
}

const difficultyNames = {
  easy: "легкое (для начинающих)",
  medium: "среднее (для продолжающих)",
  hard: "сложное (для опытных)",
};

function buildPrompt(topic, difficulty, lessonTheory, extraNote = "") {
  return `Ты — опытный преподаватель программирования Python для школьников 7-9 классов.

Твоя задача: создать практическое задание по теме "${topic}".

**Контекст:**
- Сложность задания: ${difficultyNames[difficulty] ?? "среднее"}
${lessonTheory ? `- Теория урока (для контекста):\n${clipForPrompt(lessonTheory)}` : ""}

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
  "xp_reward": 10,
  "rubric": [
    { "name": "Корректность", "weight": 0.6, "criteria": "Проходит базовые и граничные тесты" },
    { "name": "Крайние случаи", "weight": 0.2, "criteria": "Учитывает пустые/некорректные входы, большие значения" },
    { "name": "Стиль и читаемость", "weight": 0.2, "criteria": "Понятные имена, простота, отсутствие лишней сложности" }
  ],
  "eval_prompt": "Ты проверяешь решение ученика. Дай краткий отзыв (3-5 предложений) и числовую оценку 0..1 согласно rubric. Верни JSON {"score": number, "feedback": string}."
}

**Правила:**
1. Название задания должно быть коротким и понятным (3-7 слов) и НЕ повторяться с другими заданиями этого набора
2. Описание должно быть на русском языке, в формате Markdown, понятным для школьников 7-9 классов
3. Стартовый код должен содержать определение функции с параметрами, но без реализации (используй \`pass\` или комментарии)
4. Правильное решение (solution_code) должно быть рабочим Python кодом
5. Тестовые случаи:
   - Ровно 3 теста (1 базовый видимый, 2 граничных/скрытых)
   - \`input\` - объект с именованными параметрами функции
   - \`expected_output\` - БУКВАЛЬНОЕ значение (строка, число, булево или массив). Это данные в JSON, а НЕ код: запрещены выражения вроде "x" if ... else "y". Просто укажи точное итоговое значение.
   - \`category\` - "basic", "edge" или "error"
   - \`is_visible\` - true только для базовых тестов
6. Подсказки должны быть постепенными (от общей к конкретной), минимум 3 подсказки
7. XP награда: 10 для easy, 20 для medium, 30 для hard
8. Возвращай rubric как массив критериев с весами (сумма весов = 1)
9. eval_prompt — краткий шаблон для дальнейшей автоматической проверки решения

**Стиль:**
- Используй простой язык
- Избегай сложных терминов без объяснений
- Примеры должны быть релевантными для школьников
- Задание должно опираться на тему "строки": индексы, срезы, методы строк
${extraNote}
**Важно:** Возвращай ТОЛЬКО валидный JSON, без markdown разметки`;
}

function tryFixJson(jsonText) {
  try {
    let fixed = jsonText.replace(/,(\s*[}\]])/g, "$1");
    // Python ternary inside a string: "A" if cond else "B" -> keep the true-branch literal
    fixed = fixed.replace(/\}(\s*)$/, "}");
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    if (openBraces > closeBraces) fixed += "}".repeat(openBraces - closeBraces);
    if (openBrackets > closeBrackets) fixed += "]".repeat(openBrackets - closeBrackets);
    return JSON.parse(fixed);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

async function callOmniroute(messages) {
  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OMNIROUTE_API_KEY}`,
    },
    body: JSON.stringify({
      model: OMNIROUTE_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const details = (await response.text().catch(() => "")).slice(0, 1000);
    throw new Error(`Omniroute HTTP ${response.status}: ${details}`);
  }
  return response.json();
}

function extractJson(generatedText) {
  let jsonText = generatedText.trim();
  if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");

  const objStart = jsonText.indexOf("{");
  const objEnd = jsonText.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    jsonText = jsonText.slice(objStart, objEnd + 1);
  }
  jsonText = jsonText.replace(/,\s*"\{/g, ",{").replace(/\}\s*"\s*,/g, "},");
  return jsonText;
}

const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);
const tablesDB = new TablesDB(client);

async function withRetry(fn, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const waitMs = 700 * (i + 1);
      console.error(`Попытка ${i + 1} не удалась: ${error.code ?? error.message ?? error} — повтор через ${waitMs} мс`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

// Get module theory from DB
const moduleRow = await withRetry(() =>
  tablesDB.getRow({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "modules", rowId: MODULE_ID })
);
const lessonTheory = moduleRow.description ?? "";
const topic = "Строки";

// Check tasks already in this module to avoid duplicates & set order_index
const existing = await withRetry(() =>
  tablesDB.listRows({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", queries: [] })
);
const moduleTasks = existing.rows.filter((t) => t.module_id === MODULE_ID);
const maxOrder = Math.max(-1, ...moduleTasks.map((t) => Number(t.order_index ?? 0)));
console.log(`Модуль ${MODULE_ID}: уже ${moduleTasks.length} заданий, max order_index=${maxOrder}`);

const generatedTasks = [];

for (let i = 0; i < DIFFICULTIES.length; i++) {
  const { key, xp } = DIFFICULTIES[i];
  const orderIndex = maxOrder + 1 + i;
  const retries = 3;
  let taskData = null;

  for (let attempt = 1; attempt <= retries && !taskData; attempt++) {
    console.log(`\n→ Генерация ${key} задания (попытка ${attempt}/${retries})...`);
    const startedAt = Date.now();
    const prompt = buildPrompt(topic, key, lessonTheory, `Разнообразь название и сюжет задания: не делай его похожим на "секретное послание/шифрование".`);
    const data = await withRetry(() => callOmniroute([{ role: "user", content: prompt }]));
    const elapsed = Date.now() - startedAt;
    console.log(`  ✓ Omniroute ответил ${elapsed} мс, model=${data.model ?? OMNIROUTE_MODEL}`);

    const generatedText = data.choices?.[0]?.message?.content;
    if (typeof generatedText !== "string" || !generatedText.trim()) {
      console.error("  Omniroute вернул пустой ответ, повтор...");
      continue;
    }

    const jsonText = extractJson(generatedText);
    try {
      taskData = JSON.parse(jsonText);
    } catch (error) {
      console.error(`  JSON parse error: ${error.message}`);
      console.error(`  First 800 chars:\n${generatedText.slice(0, 800)}`);
      try {
        taskData = tryFixJson(jsonText);
        console.log("  ✓ JSON восстановлен через tryFixJson");
      } catch (repairError) {
        console.error(`  tryFixJson не сработал: ${repairError.message}`);
      }
    }
  }

  if (!taskData) {
    throw new Error(`Не удалось сгенерировать ${key} задание после ${retries} попыток`);
  }

  // Normalize required fields
  taskData.title = taskData.title ?? `${topic} (${difficultyNames[key]})`;
  taskData.description = taskData.description ?? `Задание по теме ${topic}.`;
  taskData.starter_code = taskData.starter_code ?? `# Напишите решение здесь`;
  taskData.solution_code = taskData.solution_code ?? "";
  taskData.test_cases = Array.isArray(taskData.test_cases) ? taskData.test_cases : [];
  taskData.xp_reward = xp; // enforce schema rule despite model
  taskData.difficulty = key;
  taskData.hints = Array.isArray(taskData.hints) && taskData.hints.length > 0 ? taskData.hints : null;
  delete taskData.rubric;
  delete taskData.eval_prompt;

  generatedTasks.push({ ...taskData, orderIndex });
  console.log(`  ✓ ${taskData.title} ready (${taskData.test_cases.length} tests, xp=${xp})`);
}

// Persist all three tasks
const persistedIds = [];
for (const taskData of generatedTasks) {
  const row = await withRetry(() =>
    tablesDB.createRow({
      databaseId: env.APPWRITE_DATABASE_ID,
      tableId: "tasks",
      rowId: crypto.randomUUID(),
      data: {
        module_id: MODULE_ID,
        title: taskData.title,
        description: taskData.description,
        starter_code: taskData.starter_code || "",
        solution_code: taskData.solution_code || "",
        test_cases: JSON.stringify(taskData.test_cases),
        xp_reward: Number(taskData.xp_reward),
        difficulty: taskData.difficulty,
        hints: taskData.hints ? JSON.stringify(taskData.hints) : null,
        order_index: taskData.orderIndex,
        variant_number: null,
      },
    })
  );
  persistedIds.push(row.$id);
  console.log(`✓ Создано задание ${row.$id} — "${taskData.title}" (${taskData.difficulty}, order ${taskData.orderIndex})`);
}

console.log(`\nГотово: добавлено ${persistedIds.length} заданий в модуль ${MODULE_ID}.`);
