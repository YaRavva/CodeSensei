import {
  awardUserAchievement,
  getUserAchievementsDetailed,
  listActiveAchievements,
  listUserAchievements,
} from "@/lib/appwrite/achievements";
import { listSuccessfulAttempts } from "@/lib/appwrite/attempts";
import { countCompletedModules } from "@/lib/appwrite/progress";
import { addXp, getUserProfile } from "@/lib/appwrite/users";
import type { Achievement, Json, TaskAttempt } from "@/types/db";

interface AchievementContext {
  taskId?: string;
  moduleId?: string;
  completedAt?: Date;
}

function conditionValue(achievement: Achievement): Record<string, unknown> {
  const value = achievement.condition_value as Json;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Checks every active achievement for the user and awards the newly unlocked ones.
 */
export async function checkAndAwardAchievements(
  userId: string,
  context?: AchievementContext
): Promise<Achievement[]> {
  const [achievements, earned, attempts, profile, completedModules] = await Promise.all([
    listActiveAchievements(),
    listUserAchievements(userId),
    listSuccessfulAttempts(userId),
    getUserProfile(userId),
    countCompletedModules(userId),
  ]);

  const earnedIds = new Set(earned.map((item) => item.achievement_id));
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const newlyUnlocked: Achievement[] = [];

  for (const achievement of achievements) {
    if (earnedIds.has(achievement.id)) continue;

    const unlocked = checkAchievementCondition(achievement, {
      userId,
      attempts: sortedAttempts,
      completedModules,
      profileCreatedAt: profile?.created_at ?? null,
      context,
    });

    if (!unlocked) continue;

    const awarded = await awardUserAchievement(userId, achievement.id);
    if (!awarded) continue;

    if (achievement.xp_reward > 0) {
      await addXp(userId, achievement.xp_reward);
    }

    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}

function checkAchievementCondition(
  achievement: Achievement,
  data: {
    userId: string;
    attempts: TaskAttempt[];
    completedModules: number;
    profileCreatedAt: string | null;
    context?: AchievementContext;
  }
): boolean {
  const conditionType = achievement.condition_type;
  const value = conditionValue(achievement);
  const requiredCount = Number(value.count ?? 0);

  switch (conditionType) {
    case "task_count":
      return data.attempts.length >= requiredCount;

    case "time_based_tasks": {
      const timeRange = (value.time_range as { start?: number; end?: number } | undefined) ?? {};
      const startHour = timeRange.start ?? 0;
      const endHour = timeRange.end ?? 24;

      const matching = data.attempts.filter((attempt) => {
        const hour = new Date(attempt.created_at).getHours();
        return startHour < endHour
          ? hour >= startHour && hour < endHour
          : hour >= startHour || hour < endHour;
      }).length;

      return matching >= requiredCount;
    }

    case "streak_tasks":
      // Simplified: total successful attempts, not a real consecutive streak.
      return data.attempts.length >= requiredCount;

    case "module_count":
      return data.completedModules >= requiredCount;

    case "streak_days": {
      const days = new Set(
        data.attempts.map((attempt) => new Date(attempt.created_at).toISOString().slice(0, 10))
      );
      return days.size >= requiredCount;
    }

    case "first_day_tasks": {
      if (!data.profileCreatedAt) return false;

      const registered = new Date(data.profileCreatedAt);
      const nextDay = new Date(registered);
      nextDay.setDate(nextDay.getDate() + 1);

      const matching = data.attempts.filter((attempt) => {
        const created = new Date(attempt.created_at);
        return created >= registered && created < nextDay;
      }).length;

      return matching >= requiredCount;
    }

    case "perfect_tasks": {
      const firstAttemptByTask = new Map<string, boolean>();

      for (const attempt of data.attempts) {
        if (!firstAttemptByTask.has(attempt.task_id)) {
          firstAttemptByTask.set(attempt.task_id, attempt.is_successful);
        }
      }

      const perfect = [...firstAttemptByTask.values()].filter(Boolean).length;
      return perfect >= requiredCount;
    }

    case "no_hints_tasks":
      return data.attempts.filter((attempt) => !attempt.used_ai_hint).length >= requiredCount;

    case "streak_perfect":
    case "streak_first_try":
      return data.attempts.length >= requiredCount;

    default:
      console.warn(`Unknown achievement condition type: ${conditionType}`);
      return false;
  }
}

/**
 * Returns every achievement earned by the user with its award date.
 */
export async function getUserAchievements(
  userId: string
): Promise<Array<Achievement & { earned_at: string }>> {
  return getUserAchievementsDetailed(userId);
}
