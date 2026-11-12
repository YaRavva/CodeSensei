const { Client, Databases } = require("node-appwrite");

const key = process.env.APPWRITE_API_KEY;
if (!key) throw new Error("APPWRITE_API_KEY is missing");

const client = new Client()
  .setEndpoint("https://appwrite.ravva.su/v1")
  .setProject("6adc4f50003202881547")
  .setKey(key);

const db = new Databases(client);
const databaseId = "codesensei";
const tableId = "tasks";
const NL = String.fromCharCode(10);

const task1Id = "82206b7e-1ad5-42bf-b905-68ef65d47bf4";
const task2Id = "f6a9f408-db31-47da-8f68-86843b8f751e";
const task3Id = "fc1b3153-665d-4fba-82b1-8168078d619b";

const tests1 = [
  { id: "test_1", description: "Имя Alice из примера", input: { name: "Alice" }, expected_output: "Hello, Alice!", category: "basic", is_visible: true },
  { id: "test_2", description: "Другое имя", input: { name: "Bob" }, expected_output: "Hello, Bob!", category: "basic", is_visible: true },
  { id: "test_3", description: "Пустое имя", input: { name: "" }, expected_output: "Hello, !", category: "edge", is_visible: true },
  { id: "test_4", description: "Имя из двух слов", input: { name: "John Doe" }, expected_output: "Hello, John Doe!", category: "edge", is_visible: true },
  { id: "test_5", description: "Имя с запятой — содержимое не изменяется", input: { name: "A,B" }, expected_output: "Hello, A,B!", category: "edge", is_visible: true },
];

const tests2 = [
  { id: "test_1", description: "Сообщение из примера", input: { message: "Привет" }, expected_output: "Получено: 'Привет' (длина: 6)", category: "basic", is_visible: true },
  { id: "test_2", description: "Сообщение с пробелом", input: { message: "Python 3" }, expected_output: "Получено: 'Python 3' (длина: 8)", category: "basic", is_visible: true },
  { id: "test_3", description: "Пустое сообщение", input: { message: "" }, expected_output: "Получено: '' (длина: 0)", category: "edge", is_visible: true },
];

const tests3 = [
  { id: "test_1", description: "Положительный возраст из примера", input: { name: "Алексей", age: 14 }, expected_output: "Привет, Алексей! Тебе 14 лет.", category: "basic", is_visible: true },
  { id: "test_2", description: "Нулевой возраст", input: { name: "Денис", age: 0 }, expected_output: "Привет, Денис! Возраст неизвестен.", category: "edge", is_visible: true },
  { id: "test_3", description: "Отрицательный возраст из примера", input: { name: "Ирина", age: -5 }, expected_output: "Привет, Ирина! Возраст неизвестен.", category: "edge", is_visible: true },
  { id: "test_4", description: "Положительный возраст и пустое имя", input: { name: "", age: 10 }, expected_output: "Привет, ! Тебе 10 лет.", category: "edge", is_visible: true },
];

async function update(id, data) {
  const row = await db.updateDocument(databaseId, tableId, id, data);
  console.log(`Updated ${row.title}: ${row.$id}`);
}

async function main() {
  await update(task1Id, {
    task_type: "linear",
    starter_code: [
      "# Переменная name уже задаётся проверяющей системой.",
      "# Не присваивайте name самостоятельно.",
      "# Например, система может передать name = \"Alice\".",
      "",
      "# Сформируйте приветствие и запишите его в result:",
      "result = \"\"",
      "",
    ].join(NL),
    solution_code: ["result = \"Hello, \" + name + \"!\"", ""].join(NL),
    hints: JSON.stringify([
      { id: "hint_1", text: 'Сложите три части строки: "Hello, " + name + "!"', unlock_after_attempts: 1 },
    ]),
    test_cases: JSON.stringify(tests1),
  });

  await update(task2Id, {
    task_type: "linear",
    starter_code: [
      "# Переменная message уже задаётся проверяющей системой.",
      "# Не присваивайте message самостоятельно.",
      "",
      "# Сформируйте строку с сообщением и его длиной:",
      "result = \"\"",
      "",
    ].join(NL),
    solution_code: [
      "result = \"Получено: '\" + message + \"' (длина: \" + str(len(message)) + \")\"",
      "",
    ].join(NL),
    hints: JSON.stringify([
      { id: "hint_1", text: "Сложите части строки через +. Длину получите как str(len(message)), потому что число нужно превратить в текст.", unlock_after_attempts: 1 },
    ]),
    test_cases: JSON.stringify(tests2),
  });

  await update(task3Id, {
    task_type: "linear",
    starter_code: [
      "# Переменные name и age уже задаются проверяющей системой.",
      "# Не присваивайте name и age самостоятельно.",
      "",
      "# Запишите результат с проверкой условия в переменную result:",
      "result = \"\"",
      "",
    ].join(NL),
    solution_code: [
      "if age > 0:",
      '    result = "Привет, " + name + "! Тебе " + str(age) + " лет."',
      "else:",
      '    result = "Привет, " + name + "! Возраст неизвестен."',
      "",
    ].join(NL),
    hints: JSON.stringify([
      { id: "hint_1", text: "Используйте if age > 0:. В первой ветке сложите приветствие, имя, возраст через str(age) и окончание. В else используйте текст «Возраст неизвестен».", unlock_after_attempts: 1 },
    ]),
    test_cases: JSON.stringify(tests3),
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
