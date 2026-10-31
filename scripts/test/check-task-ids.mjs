import { loadEnv } from "./env.mjs";
import { Client, TablesDB } from "node-appwrite";

const env = await loadEnv();
const db = new TablesDB(new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY));

const ids = ["557224c5-90af-4bec-9a94-75825e382212", "35750884-a884-43d3-9b7d-c1bb9050d1d2", "2e515011-682b-4c0f-a454-370873142082"];
for (const id of ids) {
  try {
    const row = await db.getRow({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", rowId: id });
    console.log("FOUND", id, "->", row.title, "| module", row.module_id);
  } catch (error) {
    console.log("NOT FOUND", id, "->", error.code ?? error.message ?? error);
  }
}

// Also list by query to see module tasks properly
const r = await db.listRows({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", queries: [] });
console.log("total tasks:", r.total, "rows fetched:", r.rows.length);
