/**
 * Seeds demo content and the standard achievement set.
 *
 * Idempotent: rows are created with stable IDs.
 * Achievements are upserted so changes to titles/icons/conditions reach the DB,
 * modules and tasks are only created when missing (to not overwrite content).
 *
 * Usage:
 *   pnpm appwrite:seed
 */

import { Client, TablesDB } from "node-appwrite";
import { DATABASE_ID } from "./schema.mjs";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

async function rowExists(tableId, rowId) {
  try {
    await tablesDB.getRow({ databaseId: DATABASE_ID, tableId, rowId });
    return true;
  } catch (error) {
    if (error.code === 404) return false;
    throw error;
  }
}

async function createIfMissing(tableId, rowId, data) {
  if (await rowExists(tableId, rowId)) {
    console.log(`= ${tableId}/${rowId} already exists`);
    return;
  }

  await tablesDB.createRow({ databaseId: DATABASE_ID, tableId, rowId, data });
  console.log(`+ ${tableId}/${rowId}`);
}

async function upsertRow(tableId, rowId, data) {
  if (await rowExists(tableId, rowId)) {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId, rowId, data });
    console.log(`~ ${tableId}/${rowId} updated`);
    return;
  }

  await tablesDB.createRow({ databaseId: DATABASE_ID, tableId, rowId, data });
  console.log(`+ ${tableId}/${rowId}`);
}

const achievements = [
  {
    id: "ach_first_task",
    title: "Первая победа",
    description: "Решите первое задание.",
    icon_name: "🎯",
    xp_reward: 20,
    condition_type: "task_count",
    condition_value: { count: 1 },
  },
  {
    id: "ach_five_tasks",
    title: "Пятёрка",
    description: "Решите пять заданий.",
    icon_name: "⭐",
    xp_reward: 50,
    condition_type: "task_count",
    condition_value: { count: 5 },
  },
  {
    id: "ach_ten_tasks",
    title: "Десятка",
    description: "Решите десять заданий.",
    icon_name: "🏆",
    xp_reward: 100,
    condition_type: "task_count",
    condition_value: { count: 10 },
  },
  {
    id: "ach_first_module",
    title: "Модуль пройден",
    description: "Завершите первый модуль полностью.",
    icon_name: "📚",
    xp_reward: 80,
    condition_type: "module_count",
    condition_value: { count: 1 },
  },
  {
    id: "ach_no_hints",
    title: "Своими силами",
    description: "Решите три задания без подсказок.",
    icon_name: "💡",
    xp_reward: 40,
    condition_type: "no_hints_tasks",
    condition_value: { count: 3 },
  },
  {
    id: "ach_perfect",
    title: "Без права на ошибку",
    description: "Решите три задания с первой попытки.",
    icon_name: "🎯",
    xp_reward: 60,
    condition_type: "perfect_tasks",
    condition_value: { count: 3 },
  },
  {
    id: "ach_night_owl",
    title: "Ночная сова",
    description: "Решите три задания между 22:00 и 06:00.",
    icon_name: "🦉",
    xp_reward: 30,
    condition_type: "time_based_tasks",
    condition_value: { count: 3, time_range: { start: 22, end: 6 } },
  },
  {
    id: "ach_early_bird",
    title: "Ранняя птица",
    description: "Решите три задания между 06:00 и 09:00.",
    icon_name: "🐦",
    xp_reward: 30,
    condition_type: "time_based_tasks",
    condition_value: { count: 3, time_range: { start: 6, end: 9 } },
  },
  {
    id: "ach_streak_days",
    title: "Регулярность",
    description: "Занимайтесь три дня подряд.",
    icon_name: "🔥",
    xp_reward: 70,
    condition_type: "streak_days",
    condition_value: { count: 3 },
  },
];

const modules = [
  {
    id: "module_basics",
    title: "Основы Python: Переменные и функции",
    description: "Первый шаг в Python: переменные, простые функции и возврат значений.",
    topic: "Первое знакомство с синтаксисом Python, создание простых функций и возврат результатов.",
    level: 1,
    order_index: 1,
    is_published: true,
  },
  {
    id: "module_loops",
    title: "Циклы и условия",
    description:
      "Учимся повторять действия с помощью циклов и принимать решения с помощью условий. Задания становятся чуть сложнее.",
    topic: "Повторение блоков кода с помощью циклов и ветвление логики для обработки последовательностей.",
    level: 2,
    order_index: 2,
    is_published: true,
  },
];

const tasks = [
  {
    id: "task_sum",
    module_id: "module_basics",
    title: "Сумма двух чисел",
    description: `### Как устроена функция в Python?
Функция — это мини-программа или «рецепт». Она принимает входящие данные (в скобках), что-то с ними делает и возвращает результат с помощью ключевого слова \`return\`.

Напишите функцию \`add(a, b)\`, которая принимает два числа \`a\` и \`b\` и возвращает их сумму.

**Пример использования:**
\`\`\`python
add(2, 3)  # Вернет 5
\`\`\``,
    starter_code: `def add(a, b):
    # Напишите return a + b
    pass
`,
    solution_code: `def add(a, b):
    return a + b
`,
    test_cases: [
      {
        id: "test_1",
        description: "Положительные числа",
        input: { a: 5, b: 3 },
        expected_output: 8,
        category: "basic",
        is_visible: true,
      },
      {
        id: "test_2",
        description: "Отрицательные числа",
        input: { a: -5, b: -3 },
        expected_output: -8,
        category: "edge",
        is_visible: true,
      },
      {
        id: "test_3",
        description: "Ноль",
        input: { a: 0, b: 5 },
        expected_output: 5,
        category: "edge",
        is_visible: false,
      },
    ],
    xp_reward: 10,
    difficulty: "easy",
    hints: [
      { id: "hint_1", text: "Используйте ключевое слово return перед сложением: return a + b", unlock_after_attempts: 1 },
    ],
    order_index: 1,
    variant_number: null,
  },
  {
    id: "task_greet",
    module_id: "module_basics",
    title: "Приветствие",
    description: `### Работа со строками и f-строками
В Python строки можно объединять. Удобный способ подставить переменную внутрь строки — использовать **f-строки** (ставим букву \`f\` перед кавычками, а переменные оборачиваем в фигурные скобки \`{name}\`).

Напишите функцию \`greet(name)\`, которая принимает строку с именем и возвращает приветствие вида \`Привет, <name>!\`.

**Пример:**
\`\`\`python
greet("Аня")  # Вернет "Привет, Аня!"
\`\`\``,
    starter_code: `def greet(name):
    # Верните f"Привет, {name}!"
    pass
`,
    solution_code: `def greet(name):
    return f"Привет, {name}!"
`,
    test_cases: [
      {
        id: "test_1",
        description: "Обычное имя",
        input: { name: "Аня" },
        expected_output: "Привет, Аня!",
        category: "basic",
        is_visible: true,
      },
      {
        id: "test_2",
        description: "Другое имя",
        input: { name: "Миша" },
        expected_output: "Привет, Миша!",
        category: "basic",
        is_visible: true,
      },
    ],
    xp_reward: 10,
    difficulty: "easy",
    hints: [
      { id: "hint_1", text: "Используйте f-строку: return f\"Привет, {name}!\"", unlock_after_attempts: 1 },
    ],
    order_index: 2,
    variant_number: null,
  },
  {
    id: "task_sum_to_n",
    module_id: "module_loops",
    title: "Сумма от 1 до N",
    description: `Напишите функцию \`sum_to_n(n)\`, которая возвращает сумму всех целых чисел от 1 до \`n\` включительно.

**Пример:**
\`\`\`python
sum_to_n(4)  # 10
\`\`\``,
    starter_code: `def sum_to_n(n):
    total = 0
    # Добавьте цикл
    return total
`,
    solution_code: `def sum_to_n(n):
    total = 0
    for number in range(1, n + 1):
        total += number
    return total
`,
    test_cases: [
      {
        id: "test_1",
        description: "Небольшое число",
        input: { n: 4 },
        expected_output: 10,
        category: "basic",
        is_visible: true,
      },
      {
        id: "test_2",
        description: "Единица",
        input: { n: 1 },
        expected_output: 1,
        category: "edge",
        is_visible: true,
      },
      {
        id: "test_3",
        description: "Ноль",
        input: { n: 0 },
        expected_output: 0,
        category: "edge",
        is_visible: false,
      },
    ],
    xp_reward: 15,
    difficulty: "medium",
    hints: [
      { id: "hint_1", text: "range(1, n + 1) даёт числа от 1 до n.", unlock_after_attempts: 1 },
    ],
    order_index: 1,
    variant_number: null,
  },
  {
    id: "task_evens",
    module_id: "module_loops",
    title: "Только чётные",
    description: `Напишите функцию \`evens(numbers)\`, которая возвращает список только чётных чисел из входного списка, сохраняя порядок.

**Пример:**
\`\`\`python
evens([1, 2, 3, 4])  # [2, 4]
\`\`\``,
    starter_code: `def evens(numbers):
    result = []
    # Пройдите по списку и оставьте чётные числа
    return result
`,
    solution_code: `def evens(numbers):
    return [number for number in numbers if number % 2 == 0]
`,
    test_cases: [
      {
        id: "test_1",
        description: "Смешанный список",
        input: { numbers: [1, 2, 3, 4] },
        expected_output: [2, 4],
        category: "basic",
        is_visible: true,
      },
      {
        id: "test_2",
        description: "Все нечётные",
        input: { numbers: [1, 3, 5] },
        expected_output: [],
        category: "edge",
        is_visible: true,
      },
      {
        id: "test_3",
        description: "Отрицательные числа",
        input: { numbers: [-2, -1, 0] },
        expected_output: [-2, 0],
        category: "edge",
        is_visible: false,
      },
    ],
    xp_reward: 15,
    difficulty: "medium",
    hints: [
      { id: "hint_1", text: "Число чётное, если number % 2 == 0.", unlock_after_attempts: 1 },
    ],
    order_index: 2,
    variant_number: null,
  },
];

async function main() {
  console.log(`Seeding project ${process.env.APPWRITE_PROJECT_ID} (database ${DATABASE_ID})`);

  for (const achievement of achievements) {
    await upsertRow("achievements", achievement.id, {
      title: achievement.title,
      description: achievement.description,
      icon_name: achievement.icon_name,
      xp_reward: achievement.xp_reward,
      condition_type: achievement.condition_type,
      condition_value: JSON.stringify(achievement.condition_value),
      is_active: true,
    });
  }

  for (const module of modules) {
    const { id, ...data } = module;
    await createIfMissing("modules", id, data);
  }

  for (const task of tasks) {
    const { id, ...data } = task;
    await createIfMissing("tasks", id, {
      ...data,
      test_cases: JSON.stringify(task.test_cases),
      hints: JSON.stringify(task.hints),
    });
  }

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(`Seed failed: ${error.type ?? ""} ${error.message ?? error}`);
  process.exit(1);
});
