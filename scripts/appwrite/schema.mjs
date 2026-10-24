/**
 * CodeSensei schema for self-hosted Appwrite 1.9.x (TablesDB).
 *
 * Every table is server-only: all access goes through Next.js route handlers and
 * server components using an API key, so table/row permissions stay empty.
 *
 * Column types follow the 1.9 API: varchar, text, mediumtext, longtext, integer,
 * float, boolean, datetime, email, url, enum.
 */

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "codesensei";

const ID = { type: "varchar", size: 36 };
const TITLE = { type: "varchar", size: 255 };
const SHORT = { type: "varchar", size: 100 };
const TEXT = { type: "mediumtext" };
const LONG = { type: "longtext" };
const INT = { type: "integer" };

/** @typedef {{ key: string, type: string, size?: number, required?: boolean, default?: unknown, elements?: string[] }} Column */
/** @typedef {{ key: string, type: "key" | "unique" | "fulltext", columns: string[] }} Index */

export const tables = [
  {
    id: "users",
    name: "Users",
    columns: [
      { key: "email", type: "email", required: false },
      { key: "display_name", ...SHORT, required: false },
      {
        key: "role",
        type: "enum",
        elements: ["student", "teacher", "admin"],
        required: false,
        default: "student",
      },
      { key: "avatar_url", type: "varchar", size: 2048, required: false },
      { key: "total_xp", ...INT, required: false, default: 0 },
      { key: "current_level", ...INT, required: false, default: 1 },
      { key: "last_active_at", type: "datetime", required: false },
    ],
    indexes: [
      { key: "idx_users_xp", type: "key", columns: ["total_xp"] },
      { key: "idx_users_role", type: "key", columns: ["role"] },
    ],
  },
  {
    id: "modules",
    name: "Modules",
    columns: [
      { key: "title", ...TITLE, required: true },
      { key: "description", ...TEXT, required: false },
      { key: "topic", ...SHORT, required: true },
      { key: "level", ...INT, required: true },
      { key: "order_index", ...INT, required: false, default: 0 },
      { key: "is_published", type: "boolean", required: false, default: false },
      { key: "created_by", ...ID, required: false },
    ],
    indexes: [
      {
        key: "idx_modules_published",
        type: "key",
        columns: ["is_published", "order_index"],
      },
      { key: "idx_modules_level", type: "key", columns: ["level"] },
    ],
  },
  {
    id: "tasks",
    name: "Tasks",
    columns: [
      { key: "module_id", ...ID, required: true },
      { key: "title", ...TITLE, required: true },
      { key: "description", ...TEXT, required: true },
      { key: "starter_code", ...TEXT, required: false, default: "" },
      { key: "solution_code", ...TEXT, required: false },
      { key: "test_cases", ...TEXT, required: true },
      { key: "xp_reward", ...INT, required: false, default: 10 },
      {
        key: "difficulty",
        type: "enum",
        elements: ["easy", "medium", "hard"],
        required: false,
        default: "easy",
      },
      { key: "hints", ...TEXT, required: false },
      { key: "order_index", ...INT, required: false, default: 0 },
      { key: "variant_number", ...INT, required: false },
    ],
    indexes: [
      {
        key: "idx_tasks_module",
        type: "key",
        columns: ["module_id", "order_index"],
      },
      {
        key: "idx_tasks_module_variant",
        type: "key",
        columns: ["module_id", "variant_number"],
      },
    ],
  },
  {
    id: "user_progress",
    name: "User progress",
    columns: [
      { key: "user_id", ...ID, required: true },
      { key: "module_id", ...ID, required: true },
      {
        key: "status",
        type: "enum",
        elements: ["not_started", "in_progress", "completed"],
        required: false,
        default: "not_started",
      },
      { key: "xp_earned", ...INT, required: false, default: 0 },
      { key: "attempts_count", ...INT, required: false, default: 0 },
      { key: "first_completed_at", type: "datetime", required: false },
      { key: "last_attempt_at", type: "datetime", required: false },
    ],
    indexes: [
      {
        key: "idx_progress_user_module",
        type: "unique",
        columns: ["user_id", "module_id"],
      },
      { key: "idx_progress_status", type: "key", columns: ["status"] },
    ],
  },
  {
    id: "task_attempts",
    name: "Task attempts",
    columns: [
      { key: "user_id", ...ID, required: true },
      { key: "task_id", ...ID, required: true },
      { key: "code_solution", ...TEXT, required: true },
      { key: "test_results", ...TEXT, required: true },
      { key: "is_successful", type: "boolean", required: false, default: false },
      { key: "used_ai_hint", type: "boolean", required: false, default: false },
      { key: "execution_time_ms", ...INT, required: false },
      { key: "solving_time_ms", ...INT, required: false },
      { key: "error_message", ...TEXT, required: false },
      { key: "created_at", type: "datetime", required: true },
    ],
    indexes: [
      {
        key: "idx_attempts_user_task",
        type: "key",
        columns: ["user_id", "task_id", "created_at"],
      },
      {
        key: "idx_attempts_task",
        type: "key",
        columns: ["task_id", "created_at"],
      },
    ],
  },
  {
    id: "achievements",
    name: "Achievements",
    columns: [
      { key: "title", ...TITLE, required: true },
      { key: "description", ...TEXT, required: true },
      { key: "icon_name", ...SHORT, required: true },
      { key: "xp_reward", ...INT, required: false, default: 0 },
      { key: "condition_type", ...SHORT, required: true },
      { key: "condition_value", ...TEXT, required: true },
      { key: "is_active", type: "boolean", required: false, default: true },
    ],
    indexes: [
      {
        key: "idx_achievements_condition",
        type: "key",
        columns: ["condition_type"],
      },
    ],
  },
  {
    id: "user_achievements",
    name: "User achievements",
    columns: [
      { key: "user_id", ...ID, required: true },
      { key: "achievement_id", ...ID, required: true },
      { key: "earned_at", type: "datetime", required: true },
      { key: "metadata", ...TEXT, required: false },
    ],
    indexes: [
      {
        key: "idx_user_achievements_unique",
        type: "unique",
        columns: ["user_id", "achievement_id"],
      },
      {
        key: "idx_user_achievements_user",
        type: "key",
        columns: ["user_id", "earned_at"],
      },
    ],
  },
  {
    id: "ai_generation_logs",
    name: "AI generation logs",
    columns: [
      { key: "user_id", ...ID, required: true },
      { key: "generation_type", ...SHORT, required: true },
      { key: "created_at", type: "datetime", required: true },
      { key: "created_date", type: "varchar", size: 10, required: true },
    ],
    indexes: [
      {
        key: "idx_ai_logs_unique",
        type: "unique",
        columns: ["user_id", "generation_type", "created_date"],
      },
      {
        key: "idx_ai_logs_user_date",
        type: "key",
        columns: ["user_id", "created_date"],
      },
    ],
  },
];

/** Table used by setup to verify that the database is reachable. */
export const CHECKS = tables.map((table) => table.id);

export { ID as idColumn, TITLE as titleColumn, TEXT as textColumn, INT as intColumn };
