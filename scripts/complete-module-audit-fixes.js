const { Client, Databases, Query } = require("node-appwrite");

const key = process.env.APPWRITE_API_KEY;
if (!key) throw new Error("APPWRITE_API_KEY is missing");
const db = new Databases(new Client().setEndpoint("https://appwrite.ravva.su/v1").setProject("6adc4f50003202881547").setKey(key));
const databaseId = "codesensei";
const tasksTable = "tasks";
const modulesTable = "modules";
const NL = String.fromCharCode(10);

async function get(id) { return db.getDocument(databaseId, tasksTable, id); }
async function updateTask(id, patch) { const row = await db.updateDocument(databaseId, tasksTable, id, patch); console.log("Updated task:", row.title); return row; }
async function updateModule(id, description) { const row = await db.updateDocument(databaseId, modulesTable, id, { description }); console.log("Updated module:", row.title); }
function tests(value) { return typeof value === "string" ? JSON.parse(value) : value; }
function hints(value) { return typeof value === "string" ? JSON.parse(value) : value; }

async function main() {
  const loopsTheory = [
    "Модуль «Циклы и условия» учит повторять действия и выбирать ветку программы. Значения для заданий уже передаются в переменных; `input()` в браузерных упражнениях не используется.",
    "",
    "## Цикл for и range()",
    "",
    "`for` повторяет блок кода для каждого значения последовательности. `range(1, n + 1)` создаёт числа от 1 до `n` включительно:",
    "",
    "```python",
    "result = 0",
    "for number in range(1, n + 1):",
    "    result = result + number",
    "```",
    "",
    "## Условия внутри цикла",
    "",
    "`if` позволяет выполнить код только при выполнении условия. Например, `number % 2 == 0` проверяет, что число чётное:",
    "",
    "```python",
    "result = []",
    "for number in numbers:",
    "    if number % 2 == 0:",
    "        result.append(number)",
    "```",
    "",
    "## Подсчёт простых чисел",
    "",
    "Простое число больше 1 делится только на 1 и на себя. Чтобы проверить число, перебирают возможные делители от 2 до квадратного корня числа. Для этого нужны вложенные `for`, остаток от деления `%` и условие `if`.",
    "",
    "## Важно",
    "",
    "- Отступы показывают, какие строки входят в тело цикла или условия.",
    "- Переменную-накопитель (`result`, `total` или `count`) нужно создать до цикла.",
    "- Не объявляйте функции в этом модуле.",
  ].join(NL);
  await updateModule("module_loops", loopsTheory);

  const exceptionTheory = [
    "Модуль «Обработка исключений» учит безопасно обрабатывать ошибки выполнения. В браузерном тренажёре значения уже находятся в переменных: `input()` не используется.",
    "",
    "## Что такое исключение",
    "",
    "Исключение — ошибка, которая возникает во время работы программы. Например, `int(\"привет\")` вызывает `ValueError`, потому что текст нельзя превратить в число.",
    "",
    "## Конструкция try-except",
    "",
    "Опасную операцию помещают в `try`, а способ исправить ошибку — в `except`:",
    "",
    "```python",
    "try:",
    "    result = int(value)",
    "except ValueError:",
    "    result = -1",
    "```",
    "",
    "Если преобразование удалось, в `result` попадёт число. Если возник `ValueError`, в `result` попадёт `-1`.",
    "",
    "## Конкретные типы ошибок",
    "",
    "Лучше указывать конкретный тип исключения, например `ValueError`. Так программа не скрывает другие ошибки, которые нужно исправить отдельно.",
    "",
    "```python",
    "try:",
    "    age = int(input_str)",
    "    if 0 <= age <= 120:",
    "        result = age",
    "    else:",
    "        result = \"Некорректный возраст\"",
    "except ValueError:",
    "    result = \"Некорректный возраст\"",
    "```",
    "",
    "В заданиях этого модуля не используйте `input()`: тестовая система сама подставляет `value` и `input_str`.",
  ].join(NL);
  await updateModule("e244629c-2ad1-452c-b757-c3273440ae63", exceptionTheory);

  const filesTheory = [
    "# Файловый ввод-вывод",
    "",
    "В этом модуле учимся читать и записывать текстовые файлы. В браузерном Pyodide используется временная виртуальная файловая система: тест создаёт файлы перед запуском, а после проверки они не сохраняются на компьютере пользователя.",
    "",
    "## Открытие файла",
    "",
    "Для безопасной работы используйте `with open(...) as file`. После выхода из блока файл закрывается автоматически.",
    "",
    "```python",
    "with open(filename, \"r\", encoding=\"utf-8\") as file:",
    "    result = file.readline().rstrip(\"\\r\\n\")",
    "```",
    "",
    "Режим `r` читает существующий файл. Режим `w` создаёт файл или заменяет его содержимое. Режим `a` добавляет текст в конец.",
    "",
    "## Чтение строк",
    "",
    "`readline()` читает одну строку, `readlines()` возвращает список всех строк, а цикл `for line in file` читает файл построчно.",
    "",
    "## Запись файла",
    "",
    "```python",
    "with open(output_filename, \"w\", encoding=\"utf-8\") as file:",
    "    file.write(\"Готово\\n\")",
    "```",
    "",
    "В заданиях файлы создаются проверяющей системой в виртуальной файловой системе. `input()` и постоянное сохранение на диске не используются.",
  ].join(NL);
  await updateModule("mod_files", filesTheory);

  const lists = await Promise.all(["9ce1f0f3-f7ea-4ee7-b4ee-5e205c86b11e", "b780519a-ef28-4db8-a050-e216b0002b48", "57c76d8d-e2fc-4fc8-ba9d-e2624a85dcf4"].map(get));
  await updateModule("1bb33e2a-0ba6-4d7c-b3cc-e9f03ca11ef8", [
    "Модуль «Списки» учит хранить несколько значений в одном порядке и обрабатывать их по одному.", "",
    "## Создание и изменение списка", "", "Список записывают в квадратных скобках. Индекс первого элемента равен 0. Методы `append`, `remove` и `pop` изменяют список.", "",
    "## Перебор списка", "", "Цикл `for` позволяет обработать каждый элемент. Условие `if` и оператор `in` помогают выбрать нужные элементы. Функция `len` возвращает количество элементов.", "",
    "```python", "total = 0", "for number in numbers:", "    total = total + number", "result = total", "```", "",
    "В заданиях ответ нужно сохранить в `result`. Значения уже переданы в переменных; `input()` и функции `def` не используются.",
  ].join(NL));

  // Browser-safe file tasks with explicit fixtures and side-effect assertions.
  await updateTask("task_file_read", {
    description: "Вам дана переменная `filename` с именем текстового файла. Откройте файл, прочитайте первую строку и запишите её в `result`, убрав только символы переноса строки `\\n` и `\\r`. Не удаляйте обычные пробелы.",
    starter_code: "# Переменная filename и файл уже подготовлены проверяющей системой.\n# Запишите первую строку файла в result.\n",
    solution_code: "with open(filename, 'r', encoding='utf-8') as f:\n    result = f.readline().rstrip('\\r\\n')\n",
    hints: JSON.stringify([{ id: "h1", text: "Используйте with open(filename, 'r', encoding='utf-8') as f: и f.readline(). Для удаления только переноса примените rstrip('\\r\\n').", unlock_after_attempts: 1 }]),
    test_cases: JSON.stringify([
      { id: "t1", description: "Обычная первая строка", input: { filename: "test.txt" }, files: { "test.txt": "Hello\nSecond\n" }, expected_output: "Hello", category: "basic", is_visible: true },
      { id: "t2", description: "Пробелы в начале и конце сохраняются", input: { filename: "spaces.txt" }, files: { "spaces.txt": "  Hello  \n" }, expected_output: "  Hello  ", category: "edge", is_visible: true },
    ]),
  });
  await updateTask("task_file_count", {
    description: "Вам дана переменная `filename` с именем текстового файла. Запишите в `result` количество строк в этом файле.",
    starter_code: "# Переменная filename и файл уже подготовлены проверяющей системой.\n# Запишите количество строк в result.\n",
    solution_code: "with open(filename, 'r', encoding='utf-8') as f:\n    result = len(f.readlines())\n",
    hints: JSON.stringify([{ id: "h1", text: "Откройте файл в режиме r, получите все строки методом readlines() и посчитайте их количество через len().", unlock_after_attempts: 1 }]),
    test_cases: JSON.stringify([{ id: "t1", description: "Три строки", input: { filename: "test.txt" }, files: { "test.txt": "one\ntwo\nthree\n" }, expected_output: 3, category: "basic", is_visible: true }]),
  });
  await updateTask("task_file_filter", {
    test_cases: JSON.stringify([{ id: "t1", description: "Записать только строки с ERROR", input: { input_filename: "logs.txt", output_filename: "errors.txt" }, files: { "logs.txt": "INFO start\nERROR failed\nINFO done\nERROR retry\n" }, output_files: { "errors.txt": "ERROR failed\nERROR retry\n" }, expected_output: 2, category: "basic", is_visible: true }]),
  });

  await updateTask("653f83f4-3a74-416d-be07-35dff8ff754c", {
    test_cases: JSON.stringify([
      { id: "test_1", input: { operations: [["deposit", 200], ["withdraw", 50]] }, category: "basic", is_visible: true, description: "Пополнение и снятие", expected_output: 150 },
      { id: "test_2", input: { operations: [] }, category: "edge", is_visible: true, description: "Пустой список операций", expected_output: 0 },
      { id: "test_3", input: { operations: [["deposit", 50], ["withdraw", 100]] }, category: "edge", is_visible: true, description: "Недостаточно средств — баланс не уходит в минус", expected_output: 50 },
    ]),
  });

  // Make hardcoded advanced examples use injected test variables.
  await updateTask("task_fstring_card", { starter_code: "# Переменные name, age и score заданы системой.\nresult = \"\"\n", solution_code: 'result = f"Имя: {name}, Возраст: {age}, Баллы: {score}"\n', test_cases: JSON.stringify([{ id: "test_1", description: "Данные пользователя", input: { name: "Мария", age: 16, score: 100 }, expected_output: "Имя: Мария, Возраст: 16, Баллы: 100", category: "basic", is_visible: true }]) });
  await updateTask("task_fstring_math", { starter_code: "# Переменные a и b заданы системой.\nresult = \"\"\n", solution_code: 'result = f"Сумма чисел {a} и {b} равна {a + b}"\n', test_cases: JSON.stringify([{ id: "test_1", description: "Сумма разных чисел", input: { a: 5, b: 7 }, expected_output: "Сумма чисел 5 и 7 равна 12", category: "basic", is_visible: true }]) });
  await updateTask("task_lambda_double", { starter_code: "# Список numbers задан системой.\nresult = []\n", solution_code: "result = list(map(lambda x: x * 2, numbers))\n", test_cases: JSON.stringify([{ id: "test_1", description: "Обычный список", input: { numbers: [1, 2, 3] }, expected_output: [2, 4, 6], category: "basic", is_visible: true }, { id: "test_2", description: "Пустой список", input: { numbers: [] }, expected_output: [], category: "edge", is_visible: true }]) });
  await updateTask("task_lambda_filter_pos", { starter_code: "# Список numbers задан системой.\nresult = []\n", solution_code: "result = list(filter(lambda x: x > 0, numbers))\n", test_cases: JSON.stringify([{ id: "test_1", description: "Смешанные числа", input: { numbers: [-2, 0, 4, 7] }, expected_output: [4, 7], category: "basic", is_visible: true }, { id: "test_2", description: "Нет положительных", input: { numbers: [-3, 0] }, expected_output: [], category: "edge", is_visible: true }]) });
  await updateTask("task_lambda_sort_tuples", { starter_code: "# Список students задан системой.\nresult = []\n", solution_code: "result = sorted(students, key=lambda x: x[1], reverse=True)\n", test_cases: JSON.stringify([{ id: "test_1", description: "Сортировка по баллам", input: { students: [["Анна", 88], ["Борис", 95], ["Виктор", 72]] }, expected_output: [["Борис", 95], ["Анна", 88], ["Виктор", 72]], category: "basic", is_visible: true }, { id: "test_2", description: "Одинаковые баллы сохраняют порядок", input: { students: [["Анна", 90], ["Борис", 90]] }, expected_output: [["Анна", 90], ["Борис", 90]], category: "edge", is_visible: true }]) });

  // Clarify script contracts where descriptions promised functions.
  await updateTask("eb6b426d-3ceb-496f-b498-9025bae2f8d7", { description: "Вам дана переменная `words` — кортеж слов. Отсортируйте слова по длине и сохраните результат в переменную `result`. Используйте готовую переменную `words`; объявлять функцию не нужно." });
  await updateTask("task_sum_to_n", { description: "Вам дана переменная `n`. С помощью цикла for посчитайте сумму чисел от 1 до n и сохраните её в переменную `result`." });
  await updateTask("task_evens", { description: "Вам дана переменная `numbers` — список чисел. С помощью цикла и условия выберите чётные числа и сохраните новый список в `result`." });

  // Define explicit edge contracts for out-of-range function inputs.
  const kth = await get("16e34823-3669-4415-bbd2-da5eb79e9ec8");
  const kthTests = tests(kth.test_cases); if (kthTests[2]) kthTests[2].expected_output = null;
  await updateTask(kth.$id, { test_cases: JSON.stringify(kthTests) });
  const fib = await get("edb692eb-8741-4124-bd08-1dadbf093914");
  const fibTests = tests(fib.test_cases); if (fibTests[2]) fibTests[2].expected_output = null;
  await updateTask(fib.$id, { test_cases: JSON.stringify(fibTests) });

  // Sequential order for modules where all legacy rows were 0.
  for (const moduleId of ["a8666f99-1cf9-4121-abf3-110d82957e95", "0d6aa089-39bf-4f64-9038-d866802c4b83", "cdf35d2e-f323-4a61-9f9a-97184be99290", "219e9052-2f10-4b14-919e-2ced851821b4"]) {
    const page = await db.listDocuments(databaseId, tasksTable, [Query.equal("module_id", moduleId), Query.orderAsc("$createdAt"), Query.limit(100)]);
    for (let i = 0; i < page.documents.length; i++) await updateTask(page.documents[i].$id, { order_index: i + 1 });
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
