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

  console.log(`Total tasks: ${response.total}`);
  for (const task of response.rows) {
    const hasDef = task.starter_code && task.starter_code.includes("def ");
    const testCases = JSON.parse(task.test_cases || "[]");
    const firstInput = testCases[0]?.input || {};
    const inputKeys = Object.keys(firstInput);

    if (!hasDef && inputKeys.length > 0) {
      console.log(`\n-----------------------------------------`);
      console.log(`Task ID: ${task.$id}`);
      console.log(`Title: ${task.title}`);
      console.log(`Input keys: ${inputKeys.join(", ")}`);
      console.log(`Starter Code:\n${task.starter_code}`);
      
      // Check if starter code defines input keys
      const definesInputs = inputKeys.every((key) => task.starter_code.includes(key));
      console.log(`Defines inputs in starter code? ${definesInputs}`);
    }
  }
} catch (error) {
  console.error("Error:", error);
}
