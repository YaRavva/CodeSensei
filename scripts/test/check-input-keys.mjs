import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

try {
  const response = await tablesDB.listRows({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "tasks",
    queries: [],
  });

  console.log(`Checking ${response.total} tasks for variable/input consistency...`);

  for (const task of response.rows) {
    const hasDef = task.starter_code && task.starter_code.includes("def ");
    if (hasDef) continue; // Function tasks take explicit parameters

    const testCases = JSON.parse(task.test_cases || "[]");
    if (testCases.length === 0) continue;

    const firstInput = testCases[0].input || {};
    const inputKeys = Object.keys(firstInput);

    // Let's inspect starter code and description for mentions of variables
    console.log(`Task [${task.$id}] "${task.title}": input keys = [${inputKeys.join(", ")}]`);
  }
} catch (error) {
  console.error("Error:", error);
}
