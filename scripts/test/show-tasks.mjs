import { loadEnv } from "./env.mjs";
import { Client, TablesDB } from "node-appwrite";

const env = await loadEnv();
const db = new TablesDB(new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY));

const ids = ["557224c5-90af-4bec-9a94-75825e382212", "35750884-a884-43d3-9b7d-c1bb9050d1d2", "2e515011-682b-4c0f-a454-370873142082"];
for (const id of ids) {
  const x = await db.getRow({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", rowId: id });
  console.log("\n===", x.title, "| difficulty:", x.difficulty, "| xp:", x.xp_reward, "| order:", x.order_index, "| id:", x.$id);
  console.log("starter:", JSON.stringify(x.starter_code));
  console.log("solution:", JSON.stringify(x.solution_code));
  console.log("test_cases:", x.test_cases);
  console.log("hints:", x.hints);
  console.log("desc:", "\n" + String(x.description));
}
