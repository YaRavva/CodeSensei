/**
 * Централизованная система промптов для AI-функций CodeSensei.
 * Все промпты типизированы, версионируются и легко тестируются.
 */

import { clipForPrompt } from "./ai/omniroute";

// ─── Типы ───────────────────────────────────────────────────────────

export type TaskType = "linear" | "function" | "class";

export interface HintResult {
  type: "concept" | "edge_case" | "debug";
  hint: string;
  steps: string[];
}

export interface EvaluationResult {
  score: number;
  feedback: string;
}

export interface TaskGenerationInput {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  lessonTheory?: string;
  taskType: TaskType;
}

export interface ModuleGenerationInput {
  topic: string;
  level: string;
  description?: string;
}

export interface NameCheckResult {
  valid: boolean;
  reason: string;
  suggested_name?: string;
}

// ─── Утилиты ────────────────────────────────────────────────────────

const difficultyNames: Record<string, string> = {
  easy: "легкое (для начинающих)",
  medium: "среднее (для продолжающих)",
  hard: "сложное (для опытных)",
};

const levelNames: Record<string, string> = {
  "1": "начальный (для начинающих)",
  "2": "базовый (для продолжающих)",
  "3": "средний (для уверенных)",
  "4": "продвинутый (для опытных)",
  "5": "экспертный (для мастеров)",
};

function taskTypeLabel(type: TaskType): string {
  if (type === "function") return "ФУНКЦИОНАЛЬНЫЙ (def/return разрешены только в модуле функций)";
  if (type === "class") return "КЛАСС (разрешены методы внутри class; вложенные функции запрещены)";
  return "ЛИНЕЙНЫЙ КОД (без def; значения предоставляет проверяющая система)";
}

// ─── Промпт: AI-подсказка ───────────────────────────────────────────

export function buildHintPrompt(params: {
  taskTitle: string;
  taskDescription: string;
  taskType: TaskType;
  studentCode: string;
}): string {
  const { taskTitle, taskDescription, taskType, studentCode } = params;
  return `Ты — дружелюбный наставник по Python для школьников 7-9 классов.

Твоя задача: дать ПОЭТАПНУЮ ПОДСКАЗКУ, которая поможет ученику самостоятельно прийти к решению. НЕ давай готовый ответ.

**Формат ответа — строго JSON:**
{
  "type": "concept" | "edge_case" | "debug",
  "hint": "Краткая подсказка (1-3 предложения)",
  "steps": ["Шаг 1", "Шаг 2", "Шаг 3"]
}

- type: "concept" — если ученик не понимает подход; "edge_case" — если забыл граничный случай; "debug" — если в коде ошибка.
- hint: Общая идея, НЕ решение. Мотивируй, направь мысль.
- steps: 2-4 конкретных шага мышления. Каждый шаг — одно действие или вопрос.

**Задача:** ${taskTitle}
**Тип задания:** ${taskTypeLabel(taskType)}
**Описание:**
${clipForPrompt(taskDescription)}

**Код ученика (может быть пустым):**
${clipForPrompt(studentCode || "(пусто)")}`;
}

// ─── Промпт: AI-оценка ──────────────────────────────────────────────

export function buildEvaluationPrompt(params: {
  taskTitle: string;
  taskDescription: string;
  taskType: TaskType;
  studentCode: string;
  runtimeOutput?: string;
  testSummary?: string;
}): string {
  const { taskTitle, taskDescription, taskType, studentCode, runtimeOutput, testSummary } = params;
  return `Ты — наставник по Python для школьника 7-9 классов.

Оцени решение задачи по критериям: корректность, покрытие крайних случаев, читаемость.

**Формат ответа — строго JSON:**
{
  "score": number от 0 до 1,
  "feedback": "Развёрнутый, конструктивный отзыв на русском языке (3-6 предложений)"
}

- score: 0.0-0.3 — решение не работает или сильно ошибочно; 0.4-0.6 — частично работает, есть заметные проблемы; 0.7-0.85 — работает, но можно улучшить; 0.9-1.0 — отличное решение.
- feedback: Объясни, что сделано хорошо и что можно улучшить. Будь конкретным, но поддерживающим. Укажи конкретные строки кода, если есть проблемы.

**Задача:** ${taskTitle}
**Тип задания:** ${taskTypeLabel(taskType)}
**Описание:**
${clipForPrompt(taskDescription)}

**Код ученика:**
\`\`\`python
${clipForPrompt(studentCode)}
\`\`\`

**Вывод выполнения:**
${runtimeOutput ? clipForPrompt(runtimeOutput) : "(нет)"}

**Результаты тестов:**
${testSummary ? clipForPrompt(testSummary) : "(нет)"}`;
}

// ─── Промпт: генерация задания ──────────────────────────────────────

export function buildTaskGenerationPrompt(input: TaskGenerationInput): string {
  const { topic, difficulty, lessonTheory, taskType } = input;
  const diffName = difficultyNames[difficulty] ?? "среднее";

  const linearRules =
    taskType === "linear"
      ? `
**КРИТИЧЕСКИ ВАЖНО — ЛИНЕЙНЫЙ КОД:**
- Стартовый код и solution_code НЕ ДОЛЖНЫ содержать \`def\`, \`return\` или определения функций
- Не используй \`input()\`: задания выполняются в браузерном Pyodide, значения передаются как переменные
- Тесты передают входные переменные через объект input и проверяют result или stdout`
      : "";
  const classRules =
    taskType === "class"
      ? `
**КРИТИЧЕСКИ ВАЖНО — КЛАССЫ:**
- Разрешены только методы внутри class
- Вложенные функции и самостоятельные def вне class запрещены
- Скрипт должен сохранить итог в переменной result`
      : "";

  return `Ты — опытный преподаватель программирования Python для школьников 7-9 классов.

Твоя задача: создать практическое задание по теме "${topic}".

**Контекст:**
- Сложность задания: ${diffName}
- Тип задания: ${taskTypeLabel(taskType)}
${lessonTheory ? `- Теория урока:\n${clipForPrompt(lessonTheory)}` : ""}${linearRules}${classRules}

**Требования к ответу — строго JSON:**

{
  "title": "Название задания (3-7 слов)",
  "description": "Подробное описание в Markdown. Объясни задачу, приведи примеры входных и выходных данных.",
  "starter_code": "${taskType === "linear" ? "# Значения уже переданы в переменных\\n# Запишите ответ в result\\n" : taskType === "class" ? "class Example:\n    def __init__(self):\n        pass\n\nresult = None" : "def function_name(параметры):\n    # Напишите здесь ваше решение\n    pass"}",
  "solution_code": "Рабочее решение на Python",
  "test_cases": [
    {
      "id": "test_1",
      "description": "Базовый случай",
      "input": {"param1": значение1},
      "expected_output": ожидаемый_результат,
      "category": "basic",
      "is_visible": true,
      "verification_mode": "${taskType === "function" ? "function" : "variable"}"
    }
  ],
  "hints": ["Подсказка 1", "Подсказка 2", "Подсказка 3"],
  "xp_reward": ${difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30},
  "rubric": [
    { "name": "Корректность", "weight": 0.6, "criteria": "Проходит базовые и граничные тесты" },
    { "name": "Крайние случаи", "weight": 0.2, "criteria": "Учитывает пустые/некорректные входы, большие значения" },
    { "name": "Стиль и читаемость", "weight": 0.2, "criteria": "Понятные имена, простота, отсутствие лишней сложности" }
  ],
  "eval_prompt": "Ты проверяешь решение ученика. Дай краткий отзыв (3-5 предложений) и числовую оценку 0..1 согласно rubric. Верни JSON {\\"score\\": number, \\"feedback\\": string}."
}

**Правила:**
1. Название — короткое и понятное (3-7 слов)
2. Описание — на русском, Markdown, понятно для школьников 7-9 классов
3. Стартовый код — ${taskType === "linear" ? "линейный код с готовыми переменными, БЕЗ input и def" : taskType === "class" ? "class с методами и итогом в result" : "функция с pass, без реализации"}
4. solution_code — рабочий Python${taskType === "linear" ? ", БЕЗ определения функций" : taskType === "class" ? ", с методами только внутри class" : ""}
5. Тестовые случаи: минимум 3 (1 базовый видимый, 2 граничных/скрытых)
6. Подсказки — постепенные, от общей к конкретной, минимум 3
7. XP: 10 (easy), 20 (medium), 30 (hard)
8. rubric — массив критериев, сумма весов = 1
9. eval_prompt — шаблон для автоматической проверки

**Стиль:** простой язык, понятные аналогии, избегай сложных терминов без объяснений.

**Важно:** ТОЛЬКО валидный JSON, без markdown-разметки вокруг.`;
}

// ─── Промпт: генерация модуля ───────────────────────────────────────

export function buildModuleGenerationPrompt(input: ModuleGenerationInput): string {
  const { topic, level, description } = input;
  const levelName = levelNames[level] ?? "базовый";

  return `Ты — опытный преподаватель программирования Python для школьников 7-9 классов.

Твоя задача: создать учебный модуль по теме "${topic}".

**Контекст:**
- Уровень сложности: ${levelName}
${description ? `- Дополнительные требования: ${clipForPrompt(description)}` : ""}
- Продолжительность урока: 30-45 минут

**Требования к ответу — строго JSON:**

{
  "description": "Подробное описание модуля для школьников (2-3 предложения)",
  "theory": {
    "introduction": "Краткое введение (2-3 предложения)",
    "sections": [
      {
        "heading": "Заголовок раздела",
        "content": "Markdown контент с объяснениями. Простой язык, понятный для школьников 7-9 классов.",
        "code_examples": [
          {
            "description": "Описание примера",
            "code": "код на Python",
            "output": "ожидаемый вывод",
            "explanation": "Краткое объяснение"
          }
        ]
      }
    ],
    "summary": "Краткое резюме (1-2 предложения)",
    "key_concepts": ["концепция 1", "концепция 2", "концепция 3"]
  }
}

**Стиль изложения:**
- Дружелюбный, но профессиональный тон
- Простые аналогии из жизни школьников
- Избегай сложной терминологии без объяснений
- Каждый код-пример — работоспособный
- Пиши на русском языке

**Важно:**
- Модуль посилен для указанного уровня
- Примеры понятны для школьников 7-9 классов
- ТОЛЬКО валидный JSON, без markdown-разметки`;
}

// ─── Промпт: проверка имени ─────────────────────────────────────────

/**
 * Имя ученика должно быть записано по-русски в формате «Фамилия Имя»
 * (например, «Петров Иван»): так его удобно искать по фамилии.
 */
export function buildNameCheckPrompt(name: string): string {
  return `Ты — строгий, но доброжелательный лингвист. Ты проверяешь, как ученик записал своё имя в школьном тренажёре.

**Требуемый формат:** «Фамилия Имя» — сначала фамилия, затем имя.
Примеры правильного формата: «Петров Иван», «Кузнецова Мария», «Смирнов Пётр».

**Проверь, что:**
1. В имени ровно два слова: фамилия и имя.
2. Оба слова написаны по-русски: кириллица, без латиницы и цифр.
3. Первое слово — фамилия, второе — имя. Если слова переставлены местами (например, «Иван Петров»), это НЕ соответствует формату.
4. Оба слова — настоящие фамилия и имя, а не псевдоним, никнейм или выдуманное слово.
5. Имя и фамилия не пустые, без лишних пробелов и точек.

**Допустимые знаки в словах:**
- Дефис: двойные фамилии — «Иванов-Петров», «Роум-Ричардс». Это НЕ ошибка.
- Апостроф: фамилии иноязычного происхождения — «О'Нил», «Д'Аркон». Это НЕ ошибка.

**Формат ответа — строго JSON:**
{
  "valid": true | false,
  "reason": "Короткое объяснение на русском, 1 предложение. Если имя верное — поясни, почему всё в порядке.",
  "suggested_name": "Правильная запись в формате «Фамилия Имя», если имя нужно исправить; иначе пустая строка"
}

**Важно:**
- Если хотя бы одно условие нарушено — \`"valid": false\`.
- \`reason\` — вежливое обращение к ученику, без резких слов.
- В \`suggested_name\` верни только имя и фамилию, без пояснений.
- ТОЛЬКО валидный JSON, без markdown-разметки вокруг.

**Имя для проверки:**
${clipForPrompt(name)}`;
}

// ─── Парсинг ответов ────────────────────────────────────────────────

/**
 * Извлекает JSON из markdown-блока или возвращает как есть.
 */
export function extractJsonFromMarkdown(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned;
}

/**
 * Парсит подсказку из AI-ответа с фолбэком.
 */
export function parseHintResponse(content: string): HintResult {
  const cleaned = extractJsonFromMarkdown(content);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      type: ["concept", "edge_case", "debug"].includes(parsed.type) ? parsed.type : "concept",
      hint: String(parsed.hint || "").slice(0, 2000),
      steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    };
  } catch {
    return {
      type: "concept",
      hint: content.slice(0, 2000),
      steps: [],
    };
  }
}

/**
 * Парсит оценку из AI-ответа с фолбэком.
 */
export function parseEvaluationResponse(content: string): EvaluationResult {
  const cleaned = extractJsonFromMarkdown(content);
  try {
    const parsed = JSON.parse(cleaned);
    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0;
    const feedback =
      typeof parsed.feedback === "string"
        ? parsed.feedback
        : "Оценка недоступна. Попробуйте ещё раз.";
    return { score, feedback };
  } catch {
    return {
      score: 0,
      feedback: "Оценка недоступна. Попробуйте ещё раз.",
    };
  }
}

/**
 * Парсит вердикт проверки имени.
 * Возвращает null, если ответ модели не разобран: это не «неверное имя»,
 * а сбой проверки, и ученика нельзя блокировать по такому ответу.
 */
export function parseNameCheckResponse(content: string): NameCheckResult | null {
  const cleaned = extractJsonFromMarkdown(content);

  try {
    const parsed = JSON.parse(cleaned);

    if (typeof parsed?.valid !== "boolean") return null;

    return {
      valid: parsed.valid,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim().length > 0
          ? parsed.reason.trim().slice(0, 250)
          : parsed.valid
            ? "Имя записано в нужном формате."
            : "Имя не соответствует формату «Фамилия Имя».",
      suggested_name:
        typeof parsed.suggested_name === "string" ? parsed.suggested_name.trim().slice(0, 100) : "",
    };
  } catch {
    return null;
  }
}

/**
 * Пытается исправить неполный или повреждённый JSON.
 */
export function tryFixJson(jsonText: string): any {
  try {
    let fixed = jsonText.replace(/,(\s*[}\]])/g, "$1");

    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    if (openBraces > closeBraces) fixed += "\n" + "}".repeat(openBraces - closeBraces);
    if (openBrackets > closeBrackets) fixed += "\n" + "]".repeat(openBrackets - closeBrackets);

    const lines = fixed.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes('"') && !lastLine.match(/".*":\s*".*",?\s*$/)) {
      lines.pop();
      fixed = lines.join("\n");
    }

    let lastValidIndex = fixed.length;
    for (let i = fixed.length - 1; i >= 0; i--) {
      const testStr = fixed.substring(0, i + 1);
      try {
        JSON.parse(testStr);
        lastValidIndex = i + 1;
        break;
      } catch {}
    }

    fixed = fixed.substring(0, lastValidIndex);
    if (openBraces > closeBraces) fixed += "}".repeat(openBraces - closeBraces);

    return JSON.parse(fixed);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
