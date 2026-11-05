import {
  awardUserAchievement,
  getUserAchievementsDetailed,
  listActiveAchievements,
  listUserAchievements,
} from "@/lib/appwrite/achievements";
import { listAttemptsByUser } from "@/lib/appwrite/attempts";
import { countCompletedModules } from "@/lib/appwrite/progress";
import { addXp, getUserProfile } from "@/lib/appwrite/users";
import { recordXpEvent } from "@/lib/appwrite/xp-events";
import type { Achievement, Json, TaskAttempt } from "@/types/db";

interface AchievementContext {
  taskId?: string;
  moduleId?: string;
  completedAt?: Date;
}

const TIME_ZONE = "Europe/Moscow";

function conditionValue(achievement: Achievement): Record<string, unknown> {
  const value = achievement.condition_value as Json;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Calendar day (YYYY-MM-DD) and hour in the school's time zone. */
function localParts(iso: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Per-task summary built from every attempt of the user. */
interface SolvedTask {
  taskId: string;
  firstAttemptAt: string;
  solvedAt: string | null;
  failuresBeforeSuccess: number;
  usedHint: boolean;
}

export function summarizeTasks(attempts: TaskAttempt[]): SolvedTask[] {
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const byTask = new Map<string, SolvedTask>();

  for (const attempt of sorted) {
    let task = byTask.get(attempt.task_id);
    if (!task) {
      task = {
        taskId: attempt.task_id,
        firstAttemptAt: attempt.created_at,
        solvedAt: null,
        failuresBeforeSuccess: 0,
        usedHint: false,
      };
      byTask.set(attempt.task_id, task);
    }
    if (task.solvedAt) continue;
    if (attempt.used_ai_hint) task.usedHint = true;
    if (attempt.is_successful) task.solvedAt = attempt.created_at;
    else task.failuresBeforeSuccess += 1;
  }

  return [...byTask.values()].sort(
    (a, b) => new Date(a.firstAttemptAt).getTime() - new Date(b.firstAttemptAt).getTime()
  );
}

function longestRun<T>(items: T[], matches: (item: T) => boolean): number {
  let best = 0;
  let current = 0;
  for (const item of items) {
    current = matches(item) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function longestDayStreak(days: string[]): number {
  const unique = [...new Set(days)].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;
  for (const day of unique) {
    const time = Date.parse(`${day}T00:00:00Z`);
    current = previous !== null && time - previous === 86_400_000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = time;
  }
  return best;
}

/**
 * Checks every active achievement for the user and awards the newly unlocked ones.
 * Each achievement is awarded once (unique index) and its XP is recorded in the
 * XP journal, so repeated or parallel calls never grant it twice.
 */
export async function checkAndAwardAchievements(
  userId: string,
  _context?: AchievementContext
): Promise<Achievement[]> {
  const [achievements, earned, attempts, profile, completedModules] = await Promise.all([
    listActiveAchievements(),
    listUserAchievements(userId),
    listAttemptsByUser(userId),
    getUserProfile(userId),
    countCompletedModules(userId),
  ]);

  const earnedIds = new Set(earned.map((item) => item.achievement_id));
  const tasks = summarizeTasks(attempts);
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of achievements) {
    if (earnedIds.has(achievement.id)) continue;

    const unlocked = checkAchievementCondition(achievement, {
      tasks,
      completedModules,
      profileCreatedAt: profile?.created_at ?? null,
    });
    if (!unlocked) continue;

    const awarded = await awardUserAchievement(userId, achievement.id);
    if (!awarded) continue;

    if (achievement.xp_reward > 0) {
      const recorded = await recordXpEvent({
        userId,
        sourceType: "achievement",
        sourceId: achievement.id,
        amount: achievement.xp_reward,
      });
      if (recorded) await addXp(userId, achievement.xp_reward);
    }

    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}

export function checkAchievementCondition(
  achievement: Achievement,
  data: {
    tasks: SolvedTask[];
    completedModules: number;
    profileCreatedAt: string | null;
  }
): boolean {
  const value = conditionValue(achievement);
  const requiredCount = Number(value.count ?? 0);
  const solved = data.tasks.filter((task) => task.solvedAt !== null);
  const isPerfect = (task: SolvedTask) =>
    task.solvedAt !== null && task.failuresBeforeSuccess === 0;

  switch (achievement.condition_type) {
    // Unique solved tasks, not successful attempts.
    case "task_count":
      return solved.length >= requiredCount;

    case "time_based_tasks": {
      const range = (value.time_range as { start?: number; end?: number } | undefined) ?? {};
      const start = range.start ?? 0;
      const end = range.end ?? 24;
      const matching = solved.filter((task) => {
        const { hour } = localParts(task.solvedAt as string);
        return start < end ? hour >= start && hour < end : hour >= start || hour < end;
      }).length;
      return matching >= requiredCount;
    }

    // Tasks solved in a row (in the order they were started) without leaving one unsolved.
    case "streak_tasks":
      return longestRun(data.tasks, (task) => task.solvedAt !== null) >= requiredCount;

    // Tasks in a row solved on the first attempt.
    case "streak_perfect":
      return longestRun(data.tasks, isPerfect) >= requiredCount;

    // Tasks in a row solved on the first attempt and without hints.
    case "streak_first_try":
      return longestRun(data.tasks, (task) => isPerfect(task) && !task.usedHint) >= requiredCount;

    case "module_count":
      return data.completedModules >= requiredCount;

    // Consecutive calendar days (Moscow time) with at least one solved task.
    case "streak_days":
      return (
        longestDayStreak(solved.map((task) => localParts(task.solvedAt as string).day)) >=
        requiredCount
      );

    case "first_day_tasks": {
      // Profiles migrated from the old database got the migration date as
      // $createdAt, so the first day starts at the earliest known activity.
      const starts = [data.profileCreatedAt, ...data.tasks.map((task) => task.firstAttemptAt)]
        .filter((value): value is string => Boolean(value))
        .map((value) => new Date(value).getTime());
      if (starts.length === 0) return false;
      const registered = Math.min(...starts);
      const matching = solved.filter((task) => {
        const time = new Date(task.solvedAt as string).getTime();
        return time >= registered && time < registered + 86_400_000;
      }).length;
      return matching >= requiredCount;
    }

    case "perfect_tasks":
      return solved.filter(isPerfect).length >= requiredCount;

    case "no_hints_tasks":
      return solved.filter((task) => !task.usedHint).length >= requiredCount;

    default:
      console.warn(`Unknown achievement condition type: ${achievement.condition_type}`);
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
