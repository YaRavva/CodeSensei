/**
 * Imports a Supabase dump (see export-supabase.mjs) into the Appwrite
 * `codesensei` database.
 *
 * Usage:
 *   node --env-file-if-exists=.env.local scripts/migrate/import-supabase.mjs          # dry run
 *   node --env-file-if-exists=.env.local scripts/migrate/import-supabase.mjs --apply  # write
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client, Query, TablesDB } from "node-appwrite";

const APPLY = process.argv.includes("--apply");
const DIR = ".migration/supabase";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "codesensei";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new TablesDB(client);

const read = async (name) => JSON.parse(await readFile(join(DIR, `${name}.json`), "utf8"));

const log = (...args) => console.log(...args);

function asString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function clip(value, maxLength) {
  const text = asString(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function asNullableString(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonString(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  return JSON.stringify(value);
}

const roles = new Set(["student", "teacher", "admin"]);
const statuses = new Set(["not_started", "in_progress", "completed"]);
const difficulties = new Set(["easy", "medium", "hard"]);
const generationTypes = new Set(["module", "task", "hint"]);

async function upsert(table, rowId, data) {
  const id = asString(rowId);
  if (!id) return "skipped";

  if (!APPLY) return "dry";

  try {
    await db.createRow({ databaseId: DATABASE_ID, tableId: table, rowId: id, data });
    return "created";
  } catch (error) {
    if (error.code !== 409) throw error;
  }

  try {
    await db.updateRow({ databaseId: DATABASE_ID, tableId: table, rowId: id, data });
    return "updated";
  } catch {
    return "failed";
  }
}

async function listIds(table, prefix) {
  const rows = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: table,
    queries: [Query.limit(100)],
  });

  return rows.rows.map((row) => row.$id).filter((id) => id.startsWith(prefix));
}

async function removeDemoContent() {
  if (!APPLY) {
    log("dry run: demo content cleanup skipped");
    return;
  }

  const demoModules = ["module_basics", "module_loops"];
  const demoTasks = ["task_sum", "task_greet", "task_sum_to_n", "task_evens"];
  const demoAchievements = await listIds("achievements", "ach_");

  for (const [table, ids] of [
    ["modules", demoModules],
    ["tasks", demoTasks],
    ["achievements", demoAchievements],
  ]) {
    for (const id of ids) {
      try {
        await db.deleteRow({ databaseId: DATABASE_ID, tableId: table, rowId: id });
      } catch {
        // Already removed.
      }
    }
    log(`removed demo rows from ${table}: ${ids.length}`);
  }
}

const stats = {};

function tally(table, status) {
  stats[table] ??= {};
  stats[table][status] = (stats[table][status] ?? 0) + 1;
}

await removeDemoContent();

const modules = await read("modules");
for (const module of modules) {
  if (!asString(module.title)) {
    tally("modules", "skipped");
    continue;
  }

  tally(
    "modules",
    await upsert("modules", module.id, {
      title: clip(module.title, 255),
      description: asNullableString(module.description),
      topic: clip(module.topic || "Без темы", 100),
      level: Math.min(5, Math.max(1, asNumber(module.level, 1))),
      order_index: asNumber(module.order_index),
      is_published: Boolean(module.is_published),
      created_by: module.created_by ? clip(module.created_by, 36) : null,
    }),
  );
}
log(`modules: ${JSON.stringify(stats.modules ?? {})}`);

const tasks = await read("tasks");
for (const task of tasks) {
  if (!asString(task.title) || !asString(task.module_id)) {
    tally("tasks", "skipped");
    continue;
  }

  const difficulty = difficulties.has(task.difficulty) ? task.difficulty : "easy";

  tally(
    "tasks",
    await upsert("tasks", task.id, {
      module_id: clip(task.module_id, 36),
      title: clip(task.title, 255),
      description: asString(task.description),
      starter_code: asString(task.starter_code),
      solution_code: asNullableString(task.solution_code),
      test_cases: jsonString(task.test_cases, "[]"),
      xp_reward: asNumber(task.xp_reward, 10),
      difficulty,
      hints: jsonString(task.hints, null),
      order_index: asNumber(task.order_index),
      variant_number: asNullableNumber(task.variant_number),
    }),
  );
}
log(`tasks: ${JSON.stringify(stats.tasks ?? {})}`);

const achievements = await read("achievements");
for (const achievement of achievements) {
  if (!asString(achievement.title)) {
    tally("achievements", "skipped");
    continue;
  }

  tally(
    "achievements",
    await upsert("achievements", achievement.id, {
      title: clip(achievement.title, 255),
      description: asString(achievement.description),
      icon_name: clip(achievement.icon_name || "Trophy", 100),
      xp_reward: asNumber(achievement.xp_reward),
      condition_type: clip(achievement.condition_type || "task_count", 100),
      condition_value: jsonString(achievement.condition_value, "{}"),
      is_active: achievement.is_active !== false,
    }),
  );
}
log(`achievements: ${JSON.stringify(stats.achievements ?? {})}`);

const authUsers = await read("auth-users");
const profiles = await read("users");
const profileIds = new Set(profiles.map((profile) => profile.id));

for (const profile of profiles) {
  const role = roles.has(profile.role) ? profile.role : "student";
  const displayName = clip(profile.display_name ?? "", 100);

  tally(
    "users",
    await upsert("users", profile.id, {
      email: profile.email ? clip(profile.email, 255) : null,
      display_name: displayName,
      role,
      avatar_url: profile.avatar_url ? clip(profile.avatar_url, 2048) : null,
      total_xp: asNumber(profile.total_xp),
      current_level: asNumber(profile.current_level, 1),
      last_active_at: asNullableString(profile.last_active_at),
    }),
  );
}

// Every migrated auth user should have a profile row.
for (const user of authUsers) {
  if (profileIds.has(user.id)) continue;

  tally(
    "users",
    await upsert("users", user.id, {
      email: user.email ? clip(user.email, 255) : null,
      display_name: clip(user.email ? user.email.split("@")[0] : "Ученик", 100),
      role: "student",
      avatar_url: null,
      total_xp: 0,
      current_level: 1,
      last_active_at: null,
    }),
  );
}
log(`users: ${JSON.stringify(stats.users ?? {})}`);

const progress = await read("user_progress");
for (const item of progress) {
  if (!asString(item.user_id) || !asString(item.module_id)) {
    tally("user_progress", "skipped");
    continue;
  }

  const status = statuses.has(item.status) ? item.status : "in_progress";

  tally(
    "user_progress",
    await upsert("user_progress", item.id, {
      user_id: asString(item.user_id),
      module_id: asString(item.module_id),
      status,
      xp_earned: asNumber(item.xp_earned),
      attempts_count: asNumber(item.attempts_count),
      first_completed_at: asNullableString(item.first_completed_at),
      last_attempt_at: asNullableString(item.last_attempt_at),
    }),
  );
}
log(`user_progress: ${JSON.stringify(stats.user_progress ?? {})}`);

const attempts = await read("task_attempts");
for (const attempt of attempts) {
  if (!asString(attempt.user_id) || !asString(attempt.task_id)) {
    tally("task_attempts", "skipped");
    continue;
  }

  tally(
    "task_attempts",
    await upsert("task_attempts", attempt.id, {
      user_id: asString(attempt.user_id),
      task_id: asString(attempt.task_id),
      code_solution: asString(attempt.code_solution),
      test_results: jsonString(attempt.test_results, "{}"),
      is_successful: Boolean(attempt.is_successful),
      used_ai_hint: Boolean(attempt.used_ai_hint),
      execution_time_ms: asNullableNumber(attempt.execution_time_ms),
      solving_time_ms: asNullableNumber(attempt.solving_time_ms),
      error_message: asNullableString(attempt.error_message),
      created_at: asString(attempt.created_at, new Date().toISOString()),
    }),
  );
}
log(`task_attempts: ${JSON.stringify(stats.task_attempts ?? {})}`);

const userAchievements = await read("user_achievements");
for (const item of userAchievements) {
  if (!asString(item.user_id) || !asString(item.achievement_id)) {
    tally("user_achievements", "skipped");
    continue;
  }

  tally(
    "user_achievements",
    await upsert("user_achievements", item.id, {
      user_id: asString(item.user_id),
      achievement_id: asString(item.achievement_id),
      earned_at: asString(item.earned_at, new Date().toISOString()),
    }),
  );
}
log(`user_achievements: ${JSON.stringify(stats.user_achievements ?? {})}`);

const logs = await read("ai_generation_logs");
for (const item of logs) {
  if (!asString(item.user_id)) {
    tally("ai_generation_logs", "skipped");
    continue;
  }

  const generationType = generationTypes.has(item.generation_type)
    ? item.generation_type
    : "task";

  tally(
    "ai_generation_logs",
    await upsert("ai_generation_logs", item.id, {
      user_id: asString(item.user_id),
      generation_type: generationType,
      created_at: asString(item.created_at, new Date().toISOString()),
      created_date: asString(item.created_date, new Date().toISOString().slice(0, 10)),
    }),
  );
}
log(`ai_generation_logs: ${JSON.stringify(stats.ai_generation_logs ?? {})}`);

log(APPLY ? "\nImport completed." : "\nDry run completed. Pass --apply to write.");
