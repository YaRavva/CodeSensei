/**
 * CSRF protection for state-changing API requests.
 *
 * The allowlist is built from the configuration only. The `Host` and
 * `X-Forwarded-Host` headers are never used: an attacker who can reach the
 * server directly (by IP address, for example) would otherwise be able to send
 * a request whose `Origin` matches the `Host` header and slip past the check.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** The public address of the production site (see PRD 16). */
const PRODUCTION_SITE_ORIGIN = "https://codesensei.ravva.su";

/** Origins that are allowed to send state-changing requests. */
export function allowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const add = (value: string | undefined | null) => {
    if (!value) return;
    const raw = value.trim();
    if (!raw) return;
    try {
      // A full URL is normalized to its origin, so that "https://site.ru/path"
      // and "https://site.ru" are the same origin.
      origins.add(new URL(raw).origin);
    } catch {
      // A malformed value is ignored rather than accepted.
    }
  };

  // The public address of the site.
  add(process.env.NEXT_PUBLIC_SITE_URL);

  // The Appwrite endpoint is a separate origin: the admin interface and the
  // OAuth callback may live on it.
  add(process.env.APPWRITE_ENDPOINT);
  add(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);

  // An explicit list of extra trusted origins, comma separated.
  for (const value of (process.env.CSRF_TRUSTED_ORIGINS ?? "").split(",")) {
    add(value);
  }

  // The production site, so that the check works even when the variable is
  // not set in the environment of the site.
  add(PRODUCTION_SITE_ORIGIN);

  // The local development server.
  if (process.env.NODE_ENV !== "production") {
    add("http://localhost:3000");
    add("http://127.0.0.1:3000");
  }

  return origins;
}

/** True when the origin belongs to a trusted source. */
export function isTrustedOrigin(origin: string | null, trusted: Set<string>): boolean {
  if (!origin) return false;
  try {
    return trusted.has(new URL(origin.trim()).origin);
  } catch {
    return false;
  }
}

/**
 * The Origin header as it must be compared.
 *
 * Surrounding whitespace is removed: a value like " https://site.ru" is
 * rejected by the browser, but a proxy or a filter could pass it on as is,
 * and it must not be able to hide the real origin.
 */
function normalizeOrigin(origin: string | null): string | null {
  if (origin === null) return null;
  const trimmed = origin.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when the request must be rejected as a cross-site write.
 *
 * A state-changing API call is rejected when the `Origin` header is missing
 * and the `Referer` header does not point at a trusted origin: a browser
 * always sends `Origin` for such a request, so its absence means the request
 * did not come from our own site.
 */
export function isCrossSiteApiWrite(
  request: { method: string; headers: { get(name: string): string | null } },
  pathname: string,
  trusted: Set<string> = allowedOrigins()
): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;

  // The browser states where the request comes from. The header is forbidden
  // for scripts, so a browser cannot forge it: "cross-site" and "same-site"
  // (another subdomain) never describe a request from our own pages.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return true;

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) {
    // "null" is sent for opaque origins (sandboxed frames, data: URLs).
    if (origin === "null") return true;
    return !isTrustedOrigin(origin, trusted);
  }

  // No Origin: fall back to the Referer, which the browser also sends.
  const referer = request.headers.get("referer");
  if (!referer) return true;
  try {
    return !trusted.has(new URL(referer.trim()).origin);
  } catch {
    return true;
  }
}
