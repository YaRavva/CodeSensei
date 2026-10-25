import type { Models } from "node-appwrite";
import { TABLES } from "@/lib/appwrite/config";
import {
  createRow,
  deleteRow,
  getRowOrNull,
  incrementColumn,
  listRows,
  Query,
  updateRow,
} from "@/lib/appwrite/db";
import { toUserProfile } from "@/lib/appwrite/mappers";
import { calculateLevel } from "@/lib/utils/levels";
import type { UserProfile } from "@/types/db";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const row = await getRowOrNull(TABLES.users, userId);
  return row ? toUserProfile(row) : null;
}

export async function createUserProfile(
  user: Pick<Models.User, "$id" | "email" | "name">
): Promise<UserProfile> {
  const fallbackName = user.email ? user.email.split("@")[0] : "Ученик";

  const row = await createRow(
    TABLES.users,
    {
      email: user.email ?? null,
      display_name: user.name?.trim() || fallbackName,
      role: "student",
      total_xp: 0,
      current_level: 1,
      last_active_at: new Date().toISOString(),
    },
    user.$id
  );

  return toUserProfile(row);
}

async function findProfileByEmail(email: string): Promise<UserProfile | null> {
  for (const value of [email, email.toLowerCase()]) {
    const rows = await listRows(TABLES.users, [Query.equal("email", value)]);
    if (rows.length > 0) return toUserProfile(rows[0]);
  }

  return null;
}

async function moveUserRows(
  table: string,
  oldId: string,
  newId: string,
  uniqueFields: string[] = [],
): Promise<void> {
  const rows = await listRows(table, [Query.equal("user_id", oldId)]);

  for (const row of rows) {
    if (uniqueFields.length > 0) {
      const queries = [Query.equal("user_id", newId)];
      for (const field of uniqueFields) queries.push(Query.equal(field, row[field] as string));

      const existing = await listRows(table, queries);
      if (existing.length > 0) {
        await deleteRow(table, row.$id);
        continue;
      }
    }

    try {
      await updateRow(table, row.$id, { user_id: newId });
    } catch {
      // A conflicting row already belongs to the new user.
      await deleteRow(table, row.$id);
    }
  }
}

/**
 * Links an OAuth/email user to an existing profile with the same email.
 *
 * Appwrite sign-in can produce a different user ID than the ID imported from
 * Supabase. Re-keying the profile and all user-owned rows keeps progress and
 * attempts attached to the account.
 */
async function reconcileByEmail(
  user: Pick<Models.User, "$id" | "email" | "name">,
): Promise<UserProfile | null> {
  const email = user.email?.trim();
  if (!email) return null;

  const oldProfile = await findProfileByEmail(email);
  if (!oldProfile || oldProfile.id === user.$id) return oldProfile;

  await moveUserRows(TABLES.userProgress, oldProfile.id, user.$id, ["module_id"]);
  await moveUserRows(TABLES.taskAttempts, oldProfile.id, user.$id);
  await moveUserRows(TABLES.userAchievements, oldProfile.id, user.$id, ["achievement_id"]);
  await moveUserRows(TABLES.aiLogs, oldProfile.id, user.$id, [
    "generation_type",
    "created_date",
  ]);

  const row = await createRow(
    TABLES.users,
    {
      email,
      display_name: oldProfile.display_name || user.name?.trim() || email.split("@")[0],
      role: oldProfile.role || "student",
      avatar_url: oldProfile.avatar_url,
      total_xp: oldProfile.total_xp,
      current_level: oldProfile.current_level,
      last_active_at: oldProfile.last_active_at,
    },
    user.$id,
  );

  await deleteRow(TABLES.users, oldProfile.id);
  return toUserProfile(row);
}

export async function ensureUserProfile(
  user: Pick<Models.User, "$id" | "email" | "name">,
): Promise<UserProfile> {
  const existing = await getUserProfile(user.$id);
  if (existing) return existing;

  try {
    const reconciled = await reconcileByEmail(user);
    if (reconciled) return reconciled;
  } catch (error) {
    console.error("Failed to reconcile profile by email:", error);
  }

  try {
    return await createUserProfile(user);
  } catch {
    // A concurrent request may have created the profile first.
    const profile = await getUserProfile(user.$id);
    if (profile) return profile;
    throw new Error(`Failed to create profile for user ${user.$id}`);
  }
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "role" | "last_active_at">>
): Promise<UserProfile> {
  const row = await updateRow(TABLES.users, userId, patch);
  return toUserProfile(row);
}

export async function touchLastActive(userId: string): Promise<void> {
  try {
    await updateRow(TABLES.users, userId, { last_active_at: new Date().toISOString() });
  } catch {
    // Activity tracking must never break the request.
  }
}

export async function addXp(
  userId: string,
  amount: number
): Promise<{ total_xp: number; current_level: number }> {
  if (amount === 0) {
    const profile = await getUserProfile(userId);
    return {
      total_xp: profile?.total_xp ?? 0,
      current_level: profile?.current_level ?? 1,
    };
  }

  let row: Awaited<ReturnType<typeof incrementColumn>> | null;
  try {
    row = await incrementColumn(TABLES.users, userId, "total_xp", amount);
  } catch {
    row = null;
  }

  if (!row) {
    const profile = await getUserProfile(userId);
    if (!profile) throw new Error(`Profile not found: ${userId}`);
    const totalXp = profile.total_xp + amount;
    const updated = await updateRow(TABLES.users, userId, {
      total_xp: totalXp,
      current_level: calculateLevel(totalXp),
    });
    return { total_xp: Number(updated.total_xp), current_level: Number(updated.current_level) };
  }

  const totalXp = Number(row.total_xp ?? 0);
  const level = calculateLevel(totalXp);

  if (level !== Number(row.current_level ?? 1)) {
    await updateRow(TABLES.users, userId, { current_level: level });
  }

  return { total_xp: totalXp, current_level: level };
}

export async function listLeaderboardUsers(): Promise<UserProfile[]> {
  const rows = await listRows(TABLES.users, [
    Query.equal("role", ["student", "admin"]),
    Query.orderDesc("total_xp"),
  ]);

  return rows.map(toUserProfile);
}

export async function countUsersWithMoreXp(totalXp: number): Promise<number> {
  const rows = await listRows(TABLES.users, [
    Query.equal("role", ["student", "admin"]),
    Query.greaterThan("total_xp", totalXp),
  ]);

  return rows.length;
}
