import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

try {
  const taskId = "d5e11adb-5276-4b6f-aee6-b71e41db2558";
  const updated = await tablesDB.updateRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "tasks",
    rowId: taskId,
    data: {
      description: `## Задача

Напишите программу, которая использует переменную \`temp\` (температура в градусах Цельсия) и записывает в переменную \`result\` строку:

- **"тепло"**, если температура выше 20° (\`temp > 20\`);
- **"прохладно"**, если температура от 10° до 20° включительно (\`10 <= temp <= 20\`);
- **"холодно"**, если температура ниже 10° (\`temp < 10\`).`,
      starter_code: `# Входная переменная temp уже задана автоматически (например, temp = 22)
# Запишите результат в переменную result

# Напишите здесь ваше решение:
`,
      solution_code: `if temp > 20:
    result = "тепло"
elif temp >= 10:
    result = "прохладно"
else:
    result = "холодно"
`,
    },
  });
  console.log("Task updated back to global variable successfully:", updated.$id);
} catch (error) {
  console.error("Error updating task:", error);
}
