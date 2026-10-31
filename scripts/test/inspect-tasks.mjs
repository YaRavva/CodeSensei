import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

const ids = [
  "6ce2aca8-cf0c-4852-92cd-20130529071a",
  "e9a21bf9-1ed4-4808-88a1-7ee9d1e6e940",
  "82206b7e-1ad5-42bf-b905-68ef65d47bf4",
  "1c396c75-02d2-4ffb-9969-aed3d5919d15",
  "fc1b3153-665d-4fba-82b1-8168078d619b"
];

for (const id of ids) {
  const task = await tablesDB.getRow({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", rowId: id });
  console.log(`\n=== Task: ${task.title} (${task.$id}) ===`);
  console.log("Starter Code:\n", task.starter_code);
  console.log("Test Cases:\n", task.test_cases);
}
