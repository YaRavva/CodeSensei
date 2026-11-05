import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = `a_session_${process.env.APPWRITE_PROJECT_ID ?? ""}`;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/modules",
  "/profile",
  "/admin",
  "/achievements",
  "/leaderboard",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** CSRF guard: state-changing API calls must come from our own origin. */
function isCrossSiteApiWrite(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  if (SAFE_METHODS.has(request.method)) return false;

  if (request.headers.get("sec-fetch-site") === "cross-site") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }

  const allowed = new Set<string>();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).host);
    } catch {
      // ignore malformed env
    }
  }
  for (const header of ["x-forwarded-host", "host"]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) allowed.add(value);
  }
  return !allowed.has(originHost);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCrossSiteApiWrite(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Note: an existing cookie is not proof of a valid session. Redirecting
  // /login based on cookie presence alone would loop with requireAuth() when
  // the Appwrite session has expired. The login page validates the session.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
