import { type NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { isCrossSiteApiWrite } from "@/lib/security/csrf";

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
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/}`)
  );
}

/** A fresh nonce for every request: an attacker cannot guess it. */
function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCrossSiteApiWrite(request, pathname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nonce = createNonce();
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  // Next.js reads the nonce from the policy of the request header and puts it
  // on every script and style it renders.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  // Note: an existing cookie is not proof of a valid session. Redirecting
  // /login based on cookie presence alone would loop with requireAuth() when
  // the Appwrite session has expired. The login page validates the session.

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
