import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/appwrite/config";

function shouldUseSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // Local production checks run over plain HTTP.
  if (siteUrl?.startsWith("http://")) return false;

  return true;
}

export function sessionCookieOptions(expire?: string) {
  const expires = expire ? new Date(expire) : undefined;

  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
    ...(expires ? { expires } : {}),
  };
}

export async function setSessionCookie(secret: string, expire?: string): Promise<void> {
  const store = await cookies();
  const options = sessionCookieOptions(expire);
  store.set(options.name, secret, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    ...(options.expires ? { expires: options.expires } : {}),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
