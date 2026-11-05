/**
 * Full JSON backup of all CodeSensei tables (read-only).
 * Run: node --env-file=.env.local --import tsx scripts/maintenance/backup.ts [outDir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client, Query, TablesDB } from "node-appwrite";

const TABLES = [
  "users", "modules", "tasks", "user_progress", "task_attempts", "achievements",
  "user_achievements", "xp_events", "hint_events", "ai_generation_logs",
];

export function adminTables(): TablesDB {
  const client = new Client()
    .setEndpoint(String(process.env.APPWRITE_ENDPOINT).replace(/"/g, ""))
    .setProject(String(process.env.APPWRITE_PROJECT_ID))
    .setKey(String(process.env.APPWRITE_API_KEY));
  return new TablesDB(client);
}

// biome-ignore lint/suspicious/noExplicitAny: raw Appwrite rows
export async function listAll(db: TablesDB, tableId: string): Promise<Record<string, any>[]> {
  const databaseId = String(process.env.APPWRITE_DATABASE_ID || "codesensei");
  // biome-ignore lint/suspicious/noExplicitAny: raw Appwrite rows
  const rows: Record<string, any>[] = [];
  let cursor: string | undefined;
  for (;;) {
    const queries = [Query.limit(500), Query.orderAsc("$id")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await db.listRows({ databaseId, tableId, queries });
    rows.push(...(page.rows as never[]));
    if (page.rows.length < 500) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }
  return rows;
}

async function main() {
  const out = process.argv[2] || join("backups", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(out, { recursive: true });
  const db = adminTables();
  for (const table of TABLES) {
    const rows = await listAll(db, table);
    writeFileSync(join(out, `${table}.json`), JSON.stringify(rows, null, 1));
    console.log(`${table}: ${rows.length}`);
  }
  console.log(`saved to ${out}`);
}

if (process.argv[1]?.endsWith("backup.ts")) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
