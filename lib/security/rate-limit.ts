/**
 * In-memory fixed-window rate limiter for abuse-prone endpoints (login,
 * registration, password reset, AI evaluation).
 *
 * Server-side Appwrite calls use the API key, which bypasses Appwrite's own
 * abuse limits, so these limits are the only brute-force protection. They are
 * per server instance; that is enough for a single Appwrite Sites container.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

function sweep(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

export interface LimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/** Counts one hit for `key`; fails once more than `limit` hits happen within `windowMs`. */
export function hit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  sweep(now);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Best-effort client IP behind Caddy / Appwrite proxies. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Checks several limits at once; every limit is counted. */
export function hitAll(rules: { key: string; limit: number; windowMs: number }[]): LimitResult {
  let result: LimitResult = { ok: true, retryAfterSec: 0 };
  for (const rule of rules) {
    const r = hit(rule.key, rule.limit, rule.windowMs);
    if (!r.ok && (result.ok || r.retryAfterSec > result.retryAfterSec)) result = r;
  }
  return result;
}

export function tooManyRequests(retryAfterSec: number): Response {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return Response.json(
    { error: `Слишком много попыток. Попробуйте через ${minutes} мин.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** Upper bounds for user-supplied payloads. */
export const MAX_CODE_LENGTH = 20_000;
export const MAX_TEXT_LENGTH = 5_000;
