import { loadEnv } from "./env.mjs";
import { Client, TablesDB } from "node-appwrite";
import { writeFileSync } from "node:fs";

const env = await loadEnv();
const db = new TablesDB(new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY));

const ids = ["557224c5-90af-4bec-9a94-75825e382212", "35750884-a884-43d3-9b7d-c1bb9050d1d2", "2e515011-682b-4c0f-a454-370873142082"];
const tasks = [];
for (const id of ids) {
  const x = await db.getRow({ databaseId: env.APPWRITE_DATABASE_ID, tableId: "tasks", rowId: id });
  tasks.push({
    id: x.$id,
    title: x.title,
    difficulty: x.difficulty,
    starter_code: x.starter_code,
    solution_code: x.solution_code,
    test_cases: JSON.parse(x.test_cases),
    hints: x.hints ? JSON.parse(x.hints) : null,
  });
}
writeFileSync(new URL("./tasks-export.json", import.meta.url), JSON.stringify(tasks, null, 2), "utf8");
console.log(`Exported ${tasks.length} tasks to scripts/test/tasks-export.json`);
for (const t of tasks) console.log("-", t.title, t.difficulty, t.test_cases.length, "tests");
