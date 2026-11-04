const https = require('https');

const API_KEY = process.env.APPWRITE_API_KEY;
const PROJECT_ID = '6adc4f50003202881547';
const DB_ID = 'codesensei';
const TABLE_ID = 'tasks';
const ENDPOINT = 'appwrite.ravva.su';

function apiRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ENDPOINT,
      port: 443,
      path: '/v1' + path,
      method: method || 'GET',
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function updateTask(taskId, data) {
  const result = await apiRequest(
    '/databases/' + DB_ID + '/tables/' + TABLE_ID + '/rows/' + taskId,
    'PATCH',
    data
  );
  console.log('Updated ' + taskId + ':', result.$id ? 'OK' : JSON.stringify(result).substring(0, 200));
  return result;
}

async function main() {
  // Task 1: Simplify to string concatenation
  const task1Desc = '### Простое приветствие\n\n' +
    'Вам дана переменная `name`, которая содержит имя пользователя.\n\n' +
    'Напишите программу, которая формирует приветственную строку вида:\n' +
    '```text\nHello, <имя>!\n```\n' +
    'и сохраняет её в переменную `result`.\n\n' +
    '> **Важно:**\n' +
    '> 1. Не объявляйте функции (не используйте `def`).\n' +
    '> 2. Запишите итоговый ответ в переменную `result`.\n' +
    '> 3. Обязательно добавьте восклицательный знак в конце строки.\n\n' +
    '#### Пример:\n' +
    'Если `name = "Alice"`, то в переменную `result` должна быть записана строка `"Hello, Alice!"`.\n\n' +
    '**Подсказка:** Используйте сложение строк (конкатенацию) с помощью знака `+`:\n' +
    '```python\nresult = "Hello, " + name + "!"\n```';

  const task1Starter = '# Переменная name задаётся автоматически проверяющей системой.\n' +
    '# Для тестирования в редакторе:\n' +
    'name = "Alice"\n\n' +
    '# Сформируйте приветствие и запишите его в result:\n' +
    '# Используйте сложение строк: "Hello, " + name + "!"\n' +
    'result = ""\n';

  await updateTask('82206b7e-1ad5-42bf-b905-68ef65d47bf4', {
    task_type: 'linear',
    description: task1Desc,
    starter_code: task1Starter,
    solution_code: 'result = "Hello, " + name + "!"\n',
    hints: JSON.stringify([{
      id: "hint_1",
      text: 'Сложите три части строки: "Hello, " + name + "!"',
      unlock_after_attempts: 1
    }]),
  });

  // Task 2: Set linear type
  await updateTask('f6a9f408-db31-47da-8f68-86843b8f751e', {
    task_type: 'linear',
  });

  // Task 3: Set linear type  
  await updateTask('fc1b3153-665d-4fba-82b1-8168078d619b', {
    task_type: 'linear',
  });

  console.log('\nAll tasks updated!');
}

main().catch(console.error);
