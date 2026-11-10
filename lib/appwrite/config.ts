/**
 * Appwrite connection settings.
 *
 * All database access is server-side, so the API key never reaches the browser.
 */

const RAW_APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";

/**
 * On the server (Next.js SSR), loopback requests to public appwrite.ravva.su via Cloudflare
 * suffer from ETIMEDOUT socket stalls in undici. When running inside the server environment,
 * routes can route directly to the host Tailscale Caddy port or internal endpoint if configured,
 * or rewrite host-internal loopback.
 *
 * The internal endpoint is used only when it is configured explicitly: the hardcoded
 * docker gateway address does not exist on a developer machine, so falling back to it
 * made every server-side request fail locally with a connect timeout.
 */
function resolveServerEndpoint(endpoint: string): string {
  if (typeof window === "undefined" && process.env.APPWRITE_INTERNAL_ENDPOINT) {
    return process.env.APPWRITE_INTERNAL_ENDPOINT;
  }
  return endpoint;
}

export const APPWRITE_ENDPOINT = resolveServerEndpoint(RAW_APPWRITE_ENDPOINT);

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
  xpEvents: "xp_events",
  hintEvents: "hint_events",
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
