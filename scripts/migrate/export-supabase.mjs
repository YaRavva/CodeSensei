/**
 * Exports Supabase content to .migration/supabase/*.json for backup and migration.
 *
 * Usage:
 *   node --env-file-if-exists=.env.local scripts/migrate/export-supabase.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const tables = [
  "users",
  "modules",
  "tasks",
  "user_progress",
  "task_attempts",
  "achievements",
  "user_achievements",
  "ai_generation_logs",
];

const outDir = ".migration/supabase";

async function fetchAll(table) {
  const pageSize = 1000;
  const rows = [];
  let offset = 0;

  while (true) {
    const response = await fetch(
      `${url}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`${table}: ${response.status} ${await response.text()}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function fetchAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`auth users: ${response.status} ${await response.text()}`);
    }

    const body = await response.json();
    const batch = body.users ?? [];
    users.push(...batch);

    if (batch.length < 100) break;
    page += 1;
  }

  return users;
}

await mkdir(outDir, { recursive: true });

for (const table of tables) {
  const rows = await fetchAll(table);
  await writeFile(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  console.log(`${table}: ${rows.length} rows`);
}

const authUsers = await fetchAuthUsers();
await writeFile(join(outDir, "auth-users.json"), JSON.stringify(authUsers, null, 2), "utf8");
console.log(`auth users: ${authUsers.length} rows`);

console.log(`\nDump written to ${outDir}`);
