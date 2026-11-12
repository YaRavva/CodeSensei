const { Client, Databases } = require("node-appwrite");

const key = process.env.APPWRITE_API_KEY;
if (!key) throw new Error("APPWRITE_API_KEY is missing");

const db = new Databases(
  new Client()
    .setEndpoint("https://appwrite.ravva.su/v1")
    .setProject("6adc4f50003202881547")
    .setKey(key)
);

const databaseId = "codesensei";
const tasksTable = "tasks";
const moduleId = "8c8f076b-9879-47d8-b503-ce38db78f439";
const task1Id = "82206b7e-1ad5-42bf-b905-68ef65d47bf4";
const task2Id = "f6a9f408-db31-47da-8f68-86843b8f751e";
const task3Id = "fc1b3153-665d-4fba-82b1-8168078d619b";
const NL = String.fromCharCode(10);

const theory = [
  "Модуль «Консольный ввод и вывод данных» знакомит с тем, как программа показывает информацию пользователю.",
  "",
  "## Что изучаем",
  "",
  "В этом модуле используем только:",
  "- текстовые значения и переменные;",
  "- `print()` для вывода;",
  "- запятые в `print()` для вывода нескольких значений.",
  "",
  "Сейчас программа получает готовые значения в переменных, а наша задача — правильно вывести их на экран.",
  "",
  "## Вывод текста",
  "",
  "Команда `print()` показывает значение в консоли:",
  "",
  "```python",
  'print("Привет, мир!")',
  "```",
  "",
  "Результат:",
  "",
  "```text",
  "Привет, мир!",
  "```",
  "",
  "## Переменные",
  "",
  "Переменная хранит значение, чтобы его можно было использовать позже:",
  "",
  "```python",
  'name = "Аня"',
  "print(name)",
  "```",
  "",
  "Сначала в `name` сохраняется текст «Аня», затем `print(name)` выводит этот текст.",
  "",
  "## Несколько значений в print()",
  "",
  "Значения можно передать в `print()` через запятую. Python автоматически поставит между ними пробел:",
  "",
  "```python",
  'name = "Аня"',
  'city = "Москва"',
  'print("Имя:", name, "Город:", city)',
  "```",
  "",
  "Результат:",
  "",
  "```text",
  "Имя: Аня Город: Москва",
  "```",
  "",
  "Чтобы соединить текст без автоматических пробелов, можно использовать `+`, но обе части должны быть строками:",
  "",
  "```python",
  'name = "Аня"',
  'print("Привет, " + name + "!")',
  "```",
  "",
  "## Важно",
  "",
  "- Кавычки нужны для текста: `\"Привет\"`.",
  "- Имя переменной пишется без кавычек: `name`.",
  "- В `print()` запятая между значениями добавляет пробел.",
  "- Пробелы и знаки препинания должны точно совпадать с условием задания.",
].join(NL);

const task1 = {
  title: "Простое приветствие",
  description: [
    "Вам дана переменная `name`, которая содержит имя пользователя.",
    "",
    "Сформируйте приветственную строку точно в таком виде:",
    "",
    "```text",
    "Hello, <имя>!",
    "```",
    "",
    "Запишите готовую строку в переменную `result`.",
    "",
    "Например, если `name` содержит `Alice`, в `result` должна быть строка `Hello, Alice!`.",
    "",
    "Не изменяйте переменную `name` и не объявляйте функции.",
  ].join(NL),
  starter_code: [
    "# Переменная name задаётся проверяющей системой.",
    "# Например: name = \"Alice\"",
    "",
    "# Сформируйте приветствие и запишите его в result:",
    "result = \"\"",
    "",
  ].join(NL),
  solution_code: 'result = "Hello, " + name + "!"' + NL,
  hints: JSON.stringify([
    { id: "hint_1", text: 'Сложите три части: "Hello, " + name + "!" и запишите полученную строку в result.', unlock_after_attempts: 1 },
  ]),
  tests: [
    { id: "test_1", description: "Имя Alice из примера", input: { name: "Alice" }, expected_output: "Hello, Alice!", category: "basic", is_visible: true, verification_mode: "variable" },
    { id: "test_2", description: "Другое имя", input: { name: "Bob" }, expected_output: "Hello, Bob!", category: "basic", is_visible: true, verification_mode: "variable" },
    { id: "test_3", description: "Пустое имя", input: { name: "" }, expected_output: "Hello, !", category: "edge", is_visible: true, verification_mode: "variable" },
    { id: "test_4", description: "Имя из двух слов", input: { name: "John Doe" }, expected_output: "Hello, John Doe!", category: "edge", is_visible: true, verification_mode: "variable" },
  ],
};

const task2 = {
  title: "Сообщение и автор",
  description: [
    "Вам даны две переменные:",
    "- `message` — текст сообщения;",
    "- `author` — имя автора.",
    "",
    "Выведите их одной командой `print()` в таком виде:",
    "",
    "```text",
    "Сообщение: <текст> Автор: <имя>",
    "```",
    "",
    "Если `message` равно `Привет`, а `author` равно `Аня`, результат должен быть:",
    "",
    "```text",
    "Сообщение: Привет Автор: Аня",
    "```",
    "",
    "Используйте `print()` с несколькими значениями через запятую.",
  ].join(NL),
  starter_code: [
    "# Переменные message и author задаются проверяющей системой.",
    "# Примеры: message = \"Привет\", author = \"Аня\"",
    "",
    "# Выведите сообщение и автора одной командой print():",
    "",
  ].join(NL),
  solution_code: 'print("Сообщение:", message, "Автор:", author)' + NL,
  hints: JSON.stringify([
    { id: "hint_1", text: 'Передайте в print() четыре значения через запятую: "Сообщение:", message, "Автор:", author.', unlock_after_attempts: 1 },
  ]),
  tests: [
    { id: "test_1", description: "Сообщение из примера", input: { message: "Привет", author: "Аня" }, expected_output: "Сообщение: Привет Автор: Аня", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_2", description: "Другое сообщение", input: { message: "До встречи", author: "Илья" }, expected_output: "Сообщение: До встречи Автор: Илья", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_3", description: "Пустое сообщение", input: { message: "", author: "Аня" }, expected_output: "Сообщение:  Автор: Аня", category: "edge", is_visible: true, verification_mode: "stdout" },
  ],
};

const task3 = {
  title: "Карточка пользователя",
  description: [
    "Вам даны две переменные:",
    "- `name` — имя пользователя;",
    "- `city` — город пользователя.",
    "",
    "Выведите карточку одной командой `print()` в таком виде:",
    "",
    "```text",
    "Имя: <имя> Город: <город>",
    "```",
    "",
    "Если `name` равно `Олег`, а `city` равно `Казань`, результат должен быть:",
    "",
    "```text",
    "Имя: Олег Город: Казань",
    "```",
    "",
    "Используйте `print()` с несколькими значениями через запятую.",
  ].join(NL),
  starter_code: [
    "# Переменные name и city задаются проверяющей системой.",
    "# Примеры: name = \"Олег\", city = \"Казань\"",
    "",
    "# Выведите имя и город одной командой print():",
    "",
  ].join(NL),
  solution_code: 'print("Имя:", name, "Город:", city)' + NL,
  hints: JSON.stringify([
    { id: "hint_1", text: 'Передайте в print() значения через запятую: "Имя:", name, "Город:", city.', unlock_after_attempts: 1 },
  ]),
  tests: [
    { id: "test_1", description: "Имя и город из примера", input: { name: "Олег", city: "Казань" }, expected_output: "Имя: Олег Город: Казань", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_2", description: "Другой город", input: { name: "Маша", city: "Тула" }, expected_output: "Имя: Маша Город: Тула", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_3", description: "Имя из двух слов", input: { name: "Иван Петров", city: "Самара" }, expected_output: "Имя: Иван Петров Город: Самара", category: "edge", is_visible: true, verification_mode: "stdout" },
  ],
};

async function updateTask(id, task, orderIndex, difficulty, xp) {
  const row = await db.updateDocument(databaseId, tasksTable, id, {
    title: task.title,
    description: task.description,
    starter_code: task.starter_code,
    solution_code: task.solution_code,
    test_cases: JSON.stringify(task.tests),
    hints: task.hints,
    task_type: "linear",
    order_index: orderIndex,
    difficulty,
    xp_reward: xp,
  });
  console.log(`Updated ${row.title}`);
}

(async () => {
  await db.updateDocument(databaseId, "modules", moduleId, { description: theory });
  console.log("Updated module theory");
  await updateTask(task1Id, task1, 1, "easy", 10);
  await updateTask(task2Id, task2, 2, "easy", 10);
  await updateTask(task3Id, task3, 3, "easy", 10);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
