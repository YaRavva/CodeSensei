import { type NextRequest, NextResponse } from "next/server";
import { getAdminAccount, getAdminUsers } from "@/lib/appwrite/client";
import { sessionCookieOptions } from "@/lib/appwrite/session";
import { ensureUserProfile } from "@/lib/appwrite/users";
import { getPostAuthRedirect } from "@/lib/utils/auth-redirect";

function siteOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const secret = url.searchParams.get("secret");

  if (!userId || !secret) {
    console.error("OAuth callback: missing userId/secret");
    return NextResponse.redirect(`${origin}/login?oauth=failed`);
  }

  try {
    // Exchange the one-time OAuth2 token (userId + secret) for a real session.
    const session = await getAdminAccount().createSession({ userId, secret });

    // Read the user through the admin key: the session header alone is not
    // trusted by every Appwrite deployment, and this call must not fail here.
    const user = await getAdminUsers().get(userId);
    const profile = await ensureUserProfile(user);

    const response = NextResponse.redirect(new URL(getPostAuthRedirect(profile), origin));

    const options = sessionCookieOptions(session.expire);
    response.cookies.set(options.name, session.secret, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
      ...(options.expires ? { expires: options.expires } : {}),
    });

    return response;
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return NextResponse.redirect(`${origin}/login?oauth=failed`);
  }
}
