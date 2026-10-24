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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
