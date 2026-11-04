/**
 * Скрипт рефакторинга модуля "Консольный ввод и вывод данных"
 * Обновляет теорию, задания, тесты через Appwrite REST API (Node.js)
 */

const https = require('https');
const http = require('http');

const MODULE_ID = '8c8f076b-9879-47d8-b503-ce38db78f439';
const API_KEY = 'standard_***REMOVED***';
const PROJECT_ID = 'codesensei';
const ENDPOINT = 'appwrite.ravva.su';

// === НОВАЯ ТЕОРИЯ МОДУЛЯ ===
const NEW_THEORY = `Модуль «Консольный ввод и вывод данных» учит программу общаться с пользователем. Вы научитесь выводить текст на экран, запрашивать у пользователя информацию и красиво оформлять ответы.

## Введение

Представьте, что программа — это продавец в магазине. Он должен:
1. **Поздороваться** — сказать «Привет!»
2. **Спросить**, что нужно — «Что будете покупать?»
3. **Ответить** на вопросы — «С вас 100 рублей»

В Python за это отвечают две главные команды: **print** (вывод) и **input** (ввод).

## Вывод текста — print()

Функция \`print()\` показывает текст на экране. В скобках пишем то, что хотим вывести.

\`\`\`python
print("Привет, мир!")
print(42)
print("Меня зовут", "Питон")
\`\`\`

**Вывод:**
\`\`\`
Привет, мир!
42
Меня зовут Питон
\`\`\`

> 💡 **Совет:** \`print()\` может выводить несколько значений через запятую — они автоматически разделятся пробелом.

### Пример: приветствие

\`\`\`python
print("Добро пожаловать в калькулятор!")
print("Я помогу вам посчитать.")
\`\`\`

## Ввод данных — input()

Функция \`input()\` просит пользователя ввести текст. Программа **останавливается** и ждёт, пока пользователь напечатает ответ и нажмёт Enter.

\`\`\`python
name = input("Как тебя зовут? ")
print("Привет,", name, "!")
\`\`\`

**Как это работает:**
1. Программа показывает: \`Как тебя зовут? \`
2. Пользователь вводит: \`Аня\`
3. Переменная \`name\` получает значение \`"Аня"\`
4. Программа выводит: \`Привет, Аня !\`

> ⚠️ **Важно:** \`input()\` всегда возвращает **строку** (текст), даже если пользователь ввёл число!

### Преобразование ввода в число

Если нужно работать с числами, используйте \`int()\` или \`float()\`:

\`\`\`python
age_str = input("Сколько тебе лет? ")
age = int(age_str)  # Превращаем строку в число
print("Через год тебе будет", age + 1)
\`\`\`

**Или короче:**
\`\`\`python
age = int(input("Сколько тебе лет? "))
print("Через год тебе будет", age + 1)
\`\`\`

## Форматированный вывод — f-строки

Иногда нужно вставить значение переменной прямо в текст. Для этого используют **f-строки** — ставят букву \`f\` перед кавычками и переменные в фигурных скобках \`{}\`.

\`\`\`python
name = "Аня"
age = 12
print(f"Привет, {name}! Тебе {age} лет.")
\`\`\`

**Вывод:**
\`\`\`
Привет, Аня! Тебе 12 лет.
\`\`\`

> 💡 **Почему f-строки удобны:** код читается как обычный текст, не нужно склеивать части через запятые или плюсы.

## Практический пример: простой калькулятор

\`\`\`python
print("=== Простой калькулятор ===")
a = int(input("Введите первое число: "))
b = int(input("Введите второе число: "))
print(f"Сумма: {a + b}")
print(f"Разность: {a - b}")
print(f"Произведение: {a * b}")
\`\`\`

## Резюме

- \`print()\` — выводит текст на экран
- \`input()\` — запрашивает текст у пользователя
- \`int()\` и \`float()\` — превращают строку в число
- f-строки (\`f"...{переменная}..."\`) — удобный способ вставлять значения в текст

## Ключевые концепции

- Консольный вывод (print)
- Консольный ввод (input)
- Преобразование типов (int, float, str)
- Форматирование строк (f-strings)`;

// === ЗАДАНИЕ 1: Простое приветствие ===
const TASK_1 = {
  id: '82206b7e-1ad5-42bf-b905-68ef65d47bf4',
  title: 'Простое приветствие',
  description: `Напишите программу, которая:
1. Запрашивает у пользователя имя с помощью \`input()\`
2. Выводит приветствие вида: \`Привет, <имя>!\`

#### Пример работы программы:
\`\`\`
Как тебя зовут? Аня
Привет, Аня!
\`\`\`

> 💡 **Подсказка:** используйте \`input()\` для получения имени и \`print()\` для вывода приветствия.`,
  starter_code: `# Запросите имя у пользователя и выведите приветствие

name = input("Как тебя зовут? ")
`,
  solution_code: `name = input("Как тебя зовут? ")
print(f"Привет, {name}!")`,
  test_cases: [
    { id: "test_1", description: "Имя Аня", input: "Аня\n", expected_output: "Привет, Аня!", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_2", description: "Имя Alex", input: "Alex\n", expected_output: "Привет, Alex!", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_3", description: "Пустое имя", input: "\n", expected_output: "Привет, !", category: "edge", is_visible: false, verification_mode: "stdout" },
    { id: "test_4", description: "Имя из нескольких слов", input: "John Doe\n", expected_output: "Привет, John Doe!", category: "edge", is_visible: false, verification_mode: "stdout" }
  ],
  xp_reward: 10,
  difficulty: 'easy',
  task_type: 'linear',
  hints: [
    "Используйте input() с текстом-приглашением: name = input('Как тебя зовут? ')",
    "Для вывода используйте print() с f-строкой: print(f'Привет, {name}!')",
    "Не забудьте пробел после вопроса в input(), чтобы ответ пользователя не прилипал к тексту"
  ],
  order_index: 1
};

// === ЗАДАНИЕ 2: Эхо и длина сообщения ===
const TASK_2 = {
  id: 'f6a9f408-db31-47da-8f68-86843b8f751e',
  title: 'Эхо и длина сообщения',
  description: `Напишите программу, которая:
1. Запрашивает у пользователя сообщение с помощью \`input()\`
2. Выводит строку вида: \`Получено: '<сообщение>' (длина: <число>)\`

#### Пример работы программы:
\`\`\`
Введите сообщение: Привет
Получено: 'Привет' (длина: 6)
\`\`\`

> 💡 **Подсказка:** длину строки можно узнать с помощью функции \`len()\`.`,
  starter_code: `# Запросите сообщение у пользователя и выведите его с длиной

message = input("Введите сообщение: ")
`,
  solution_code: `message = input("Введите сообщение: ")
print(f"Получено: '{message}' (длина: {len(message)})")`,
  test_cases: [
    { id: "test_1", description: "Слово 'Привет'", input: "Привет\n", expected_output: "Получено: 'Привет' (длина: 6)", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_2", description: "Фраза 'Python 3'", input: "Python 3\n", expected_output: "Получено: 'Python 3' (длина: 8)", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_3", description: "Пустая строка", input: "\n", expected_output: "Получено: '' (длина: 0)", category: "edge", is_visible: false, verification_mode: "stdout" }
  ],
  xp_reward: 20,
  difficulty: 'medium',
  task_type: 'linear',
  hints: [
    "Используйте input('Введите сообщение: ') для запроса текста",
    "Функция len(message) возвращает количество символов в строке",
    "Используйте f-строку для форматирования: print(f\"Получено: '{message}' (длина: {len(message)})\")"
  ],
  order_index: 2
};

// === ЗАДАНИЕ 3: Форматированная анкета ===
const TASK_3 = {
  id: 'fc1b3153-665d-4fba-82b1-8168078d619b',
  title: 'Форматированная анкета',
  description: `Напишите программу, которая:
1. Запрашивает имя пользователя с помощью \`input()\`
2. Запрашивает возраст с помощью \`input()\` и преобразует его в число через \`int()\`
3. Выводит приветствие:
   - Если возраст больше 0: \`Привет, <имя>! Тебе <возраст> лет.\`
   - Если возраст 0 или меньше: \`Привет, <имя>! Возраст неизвестен.\`

#### Примеры работы программы:
\`\`\`
Как тебя зовут? Алексей
Сколько тебе лет? 14
Привет, Алексей! Тебе 14 лет.
\`\`\`

\`\`\`
Как тебя зовут? Ирина
Сколько тебе лет? -5
Привет, Ирина! Возраст неизвестен.
\`\`\``,  
  starter_code: `# Запросите имя и возраст, затем выведите форматированное приветствие

name = input("Как тебя зовут? ")
`,
  solution_code: `name = input("Как тебя зовут? ")
age = int(input("Сколько тебе лет? "))

if age > 0:
    print(f"Привет, {name}! Тебе {age} лет.")
else:
    print(f"Привет, {name}! Возраст неизвестен.")`,
  test_cases: [
    { id: "test_1", description: "Положительный возраст 14 лет", input: "Алексей\n14\n", expected_output: "Привет, Алексей! Тебе 14 лет.", category: "basic", is_visible: true, verification_mode: "stdout" },
    { id: "test_2", description: "Нулевой возраст", input: "Денис\n0\n", expected_output: "Привет, Денис! Возраст неизвестен.", category: "edge", is_visible: true, verification_mode: "stdout" },
    { id: "test_3", description: "Отрицательный возраст", input: "Ирина\n-5\n", expected_output: "Привет, Ирина! Возраст неизвестен.", category: "edge", is_visible: false, verification_mode: "stdout" },
    { id: "test_4", description: "Пустое имя", input: "\n10\n", expected_output: "Привет, ! Тебе 10 лет.", category: "edge", is_visible: false, verification_mode: "stdout" }
  ],
  xp_reward: 30,
  difficulty: 'hard',
  task_type: 'linear',
  hints: [
    "Используйте int(input('Сколько тебе лет? ')) для получения числа",
    "Проверьте условие: if age > 0: ... else: ...",
    "В обеих ветках используйте f-строки для форматирования вывода"
  ],
  order_index: 3
};

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: ENDPOINT,
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function updateModule() {
  console.log('Updating module theory...');
  try {
    const result = await makeRequest(
      'PATCH',
      `/v1/databases/codesensei/tables/modules/rows/${MODULE_ID}`,
      { description: NEW_THEORY }
    );
    console.log('Module updated successfully');
  } catch (e) {
    console.error('Failed to update module:', e.message);
  }
}

async function updateTask(task) {
  console.log(`\nUpdating task: ${task.title} (${task.id})`);
  try {
    const result = await makeRequest(
      'PATCH',
      `/v1/databases/codesensei/tables/tasks/rows/${task.id}`,
      {
        title: task.title,
        description: task.description,
        starter_code: task.starter_code,
        solution_code: task.solution_code,
        test_cases: JSON.stringify(task.test_cases),
        xp_reward: task.xp_reward,
        difficulty: task.difficulty,
        task_type: task.task_type,
        hints: JSON.stringify(task.hints),
        order_index: task.order_index
      }
    );
    console.log('Task updated successfully');
  } catch (e) {
    console.error('Failed to update task:', e.message);
  }
}

async function main() {
  console.log('=== Рефакторинг модуля "Консольный ввод и вывод данных" ===\n');
  
  await updateModule();
  await updateTask(TASK_1);
  await updateTask(TASK_2);
  await updateTask(TASK_3);
  
  console.log('\n=== Done ===');
}

main().catch(console.error);
