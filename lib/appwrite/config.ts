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
 */
function resolveServerEndpoint(endpoint: string): string {
  // If explicitly configured to internal or if running server-side targeting self
  if (typeof window === "undefined" && process.env.APPWRITE_INTERNAL_ENDPOINT) {
    return process.env.APPWRITE_INTERNAL_ENDPOINT;
  }
  // If server-side and endpoint is public domain, route through internal docker gateway
  if (typeof window === "undefined" && endpoint.includes("appwrite.ravva.su")) {
    return "http://172.18.0.1:80/v1";
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
