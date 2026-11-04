const { Client, Databases } = require('node-appwrite');
const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/APPWRITE_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : '';

const PROJECT_ID = '6adc4f50003202881547';
const DB_ID = 'codesensei';
const TABLE_ID = 'tasks';

// Use public endpoint (same as CLI)
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function main() {
  try {
    // First, test connection by getting the task
    console.log('Testing connection...');
    const task = await databases.getDocument(DB_ID, TABLE_ID, '82206b7e-1ad5-42bf-b905-68ef65d47bf4');
    console.log('Current task_type:', task.task_type);
    console.log('Current title:', task.title);
    console.log('Connection OK!');
    
    // Update task 1: simplify to string concatenation
    console.log('\nUpdating task 1...');
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

    const updated1 = await databases.updateDocument(DB_ID, TABLE_ID, '82206b7e-1ad5-42bf-b905-68ef65d47bf4', {
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
    console.log('Task 1 updated! task_type:', updated1.task_type);

    // Update task 2: set linear type
    console.log('\nUpdating task 2...');
    const updated2 = await databases.updateDocument(DB_ID, TABLE_ID, 'f6a9f408-db31-47da-8f68-86843b8f751e', {
      task_type: 'linear',
    });
    console.log('Task 2 updated! task_type:', updated2.task_type);

    // Update task 3: set linear type
    console.log('\nUpdating task 3...');
    const updated3 = await databases.updateDocument(DB_ID, TABLE_ID, 'fc1b3153-665d-4fba-82b1-8168078d619b', {
      task_type: 'linear',
    });
    console.log('Task 3 updated! task_type:', updated3.task_type);

    console.log('\nAll tasks updated successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
  }
}

main();
