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
  for (const row of response.rows) {
    console.log(`- Task ID: ${row.$id} | Module: ${row.module_id} | Title: ${row.title}`);
    console.log(`  Starter code:\n${row.starter_code}\n`);
  }
} catch (error) {
  console.error("Failed to list tasks:", error);
}
