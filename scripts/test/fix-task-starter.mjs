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
      starter_code: `# Переменная temp уже задана автоматически (например, temp = 20)
# Запишите результат в переменную result:
# "тепло", если temp > 20
# "прохладно", если 10 <= temp <= 20
# "холодно", если temp < 10

# Напишите ваше решение здесь:
`,
    },
  });
  console.log("Task starter_code fixed successfully:", updated.$id);
} catch (error) {
  console.error("Error fixing task starter code:", error);
}
