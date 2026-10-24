import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Models } from "node-appwrite";
import { getSessionAccount } from "@/lib/appwrite/client";
import { SESSION_COOKIE } from "@/lib/appwrite/config";
import { ensureUserProfile, getUserProfile, touchLastActive } from "@/lib/appwrite/users";
import type { UserProfile } from "@/types/db";

export interface AuthContext {
  user: Models.User;
  profile: UserProfile;
}

export async function getSessionSecret(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentAccount(): Promise<Models.User | null> {
  const secret = await getSessionSecret();
  if (!secret) return null;

  try {
    return await getSessionAccount(secret).get();
  } catch {
    return null;
  }
}

/** Returns the current user and profile, or null for anonymous requests (API routes). */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getCurrentAccount();
  if (!user) return null;

  const profile = await ensureUserProfile(user);
  return { user, profile };
}

/** Server components: redirects unauthenticated users to /login. */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  await touchLastActive(context.user.$id);

  return context;
}

/** Server components: requires the admin or teacher role. */
export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireAuth();

  if (context.profile.role !== "admin" && context.profile.role !== "teacher") {
    redirect("/modules");
  }

  return context;
}

export { getUserProfile };
