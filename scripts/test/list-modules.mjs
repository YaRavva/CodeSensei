/**
 * Lists all modules and their topics from the Appwrite database.
 * Read-only diagnostic script for the AI module generation test.
 */

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
    tableId: "modules",
    queries: [],
  });

  console.log(`Total modules: ${response.total}`);
  for (const row of response.rows) {
    console.log(
      `- ${row.$id} | topic=${row.topic ?? ""} | title=${row.title ?? ""} | level=${row.level ?? ""} | order_index=${row.order_index ?? ""} | published=${row.is_published ?? ""} | created_by=${row.created_by ?? ""}`
    );
  }
} catch (error) {
  console.error(`Module list failed: ${error.type ?? ""} ${error.message ?? error}`);
  process.exitCode = 1;
}
