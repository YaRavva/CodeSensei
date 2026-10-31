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

  for (const task of response.rows) {
    const hasDef = task.starter_code && task.starter_code.includes("def ");
    if (hasDef) continue;

    let starter = task.starter_code || "";
    // If starter code contains lines like "a = 5" or "temp = 20" added by our fix script, remove them
    // Keep lines starting with # or empty lines or comments
    const lines = starter.split("\n");
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();
      // If a line is a variable assignment without '#' and matches input keys, remove it
      if (trimmed && !trimmed.startsWith("#") && !trimmed.includes("result") && !trimmed.includes("pass")) {
        return false;
      }
      return true;
    });

    const cleanedStarter = cleanedLines.join("\n");
    if (cleanedStarter !== starter) {
      await tablesDB.updateRow({
        databaseId: env.APPWRITE_DATABASE_ID,
        tableId: "tasks",
        rowId: task.$id,
        data: {
          starter_code: cleanedStarter,
        },
      });
      console.log(`✓ Cleaned starter code for task: ${task.title}`);
    }
  }

  console.log("All task starter codes cleaned successfully!");
} catch (error) {
  console.error("Error cleaning starter codes:", error);
}
