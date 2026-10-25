import { NextResponse } from "next/server";
import { OAuthProvider } from "node-appwrite";
import { getOAuthAdminAccount } from "@/lib/appwrite/client";

const PROVIDERS = {
  google: OAuthProvider.Google,
  github: OAuthProvider.Github,
} as const;

type ProviderKey = keyof typeof PROVIDERS;

function isProvider(value: string): value is ProviderKey {
  return value === "google" || value === "github";
}

function siteOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 404 });
  }

  const origin = siteOrigin(request);

  try {
    const redirectUrl = await getOAuthAdminAccount().createOAuth2Token({
      provider: PROVIDERS[provider],
      success: `${origin}/api/auth/oauth/callback`,
      failure: `${origin}/login?oauth=failed`,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Failed to start OAuth flow:", error);
    return NextResponse.redirect(`${origin}/login?oauth=failed`);
  }
}
