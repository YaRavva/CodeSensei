import { TABLES } from "@/lib/appwrite/config";
import { createRow, listRows, Query } from "@/lib/appwrite/db";
import { toAchievement, toUserAchievement } from "@/lib/appwrite/mappers";
import type { Achievement, UserAchievement } from "@/types/db";

export async function listAchievements(): Promise<Achievement[]> {
  const rows = await listRows(TABLES.achievements, [Query.orderAsc("xp_reward")]);
  return rows.map(toAchievement);
}

export async function listActiveAchievements(): Promise<Achievement[]> {
  const rows = await listRows(TABLES.achievements, [Query.equal("is_active", true)]);
  return rows.map(toAchievement);
}

export async function listUserAchievements(userId: string): Promise<UserAchievement[]> {
  const rows = await listRows(TABLES.userAchievements, [
    Query.equal("user_id", userId),
    Query.orderDesc("earned_at"),
  ]);

  return rows.map(toUserAchievement);
}

export async function awardUserAchievement(
  userId: string,
  achievementId: string
): Promise<UserAchievement | null> {
  try {
    const row = await createRow(TABLES.userAchievements, {
      user_id: userId,
      achievement_id: achievementId,
      earned_at: new Date().toISOString(),
    });

    return toUserAchievement(row);
  } catch {
    // Unique index (user_id, achievement_id) — already awarded.
    return null;
  }
}

export async function getUserAchievementsDetailed(
  userId: string
): Promise<Array<Achievement & { earned_at: string }>> {
  const [earned, achievements] = await Promise.all([
    listUserAchievements(userId),
    listAchievements(),
  ]);

  const byId = new Map(achievements.map((achievement) => [achievement.id, achievement]));

  return earned
    .map((userAchievement) => {
      const achievement = byId.get(userAchievement.achievement_id);
      if (!achievement) return null;
      return { ...achievement, earned_at: userAchievement.earned_at };
    })
    .filter((item): item is Achievement & { earned_at: string } => item !== null);
}

export async function getAchievementsForUsers(
  userIds: string[]
): Promise<Record<string, Achievement[]>> {
  if (userIds.length === 0) return {};

  const [rows, achievements] = await Promise.all([
    listRows(TABLES.userAchievements, [Query.equal("user_id", userIds)]),
    listAchievements(),
  ]);

  const byId = new Map(achievements.map((achievement) => [achievement.id, achievement]));
  const result: Record<string, Achievement[]> = {};

  for (const row of rows.map(toUserAchievement)) {
    const achievement = byId.get(row.achievement_id);
    if (!achievement) continue;
    if (!result[row.user_id]) result[row.user_id] = [];
    result[row.user_id].push(achievement);
  }

  return result;
}
