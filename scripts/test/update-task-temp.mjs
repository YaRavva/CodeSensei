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

Напиши функцию \`check_temperature(temp)\`, которая принимает температуру в градусах Цельсия (\`temp\`) и возвращает строку:

- **"тепло"**, если температура выше 20° (\`temp > 20\`);
- **"прохладно"**, если температура от 10° до 20° включительно (\`10 <= temp <= 20\`);
- **"холодно"**, если температура ниже 10° (\`temp < 10\`).`,
      starter_code: `def check_temperature(temp):
    # Напишите здесь ваше решение
    pass
`,
      solution_code: `def check_temperature(temp):
    if temp > 20:
        return "тепло"
    elif temp >= 10:
        return "прохладно"
    else:
        return "холодно"
`,
    },
  });
  console.log("Task updated successfully:", updated.$id);
} catch (error) {
  console.error("Error updating task:", error);
}
