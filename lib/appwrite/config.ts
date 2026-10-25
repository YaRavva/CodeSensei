/**
 * Appwrite connection settings.
 *
 * All database access is server-side, so the API key never reaches the browser.
 */

export const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";

export const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ?? process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "codesensei";

/** Session cookie name expected by Appwrite (`a_session_<projectId>`). */
export const SESSION_COOKIE = `a_session_${APPWRITE_PROJECT_ID}`;

export const TABLES = {
  users: "users",
  modules: "modules",
  tasks: "tasks",
  userProgress: "user_progress",
  taskAttempts: "task_attempts",
  achievements: "achievements",
  userAchievements: "user_achievements",
  aiLogs: "ai_generation_logs",
} as const;

export function assertAppwriteConfig(): void {
  const missing: string[] = [];

  if (!APPWRITE_ENDPOINT) missing.push("APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) missing.push("APPWRITE_PROJECT_ID");
  if (!process.env.APPWRITE_API_KEY) missing.push("APPWRITE_API_KEY");

  if (missing.length > 0) {
    throw new Error(`Appwrite is not configured. Missing: ${missing.join(", ")}`);
  }
}
