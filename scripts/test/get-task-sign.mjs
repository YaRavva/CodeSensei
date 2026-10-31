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
    rowId: "2537b081-5fde-4060-883b-6ac04920291f",
  });
  console.log("Task details:", JSON.stringify(task, null, 2));
} catch (error) {
  console.error("Error:", error);
}
