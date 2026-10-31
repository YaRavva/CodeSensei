import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

try {
  const task = await tablesDB.getRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "tasks",
    rowId: "d5e11adb-5276-4b6f-aee6-b71e41db2558",
  });
  console.log("Task details:", JSON.stringify(task, null, 2));
} catch (error) {
  console.error("Error:", error);
}
