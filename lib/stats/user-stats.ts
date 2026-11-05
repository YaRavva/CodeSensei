import { TABLES } from "@/lib/appwrite/config";
import { listRows, Query } from "@/lib/appwrite/db";
import { listLeaderboardUsers } from "@/lib/appwrite/users";
import { listXpEventsSince } from "@/lib/appwrite/xp-events";
import { calculateLevel } from "@/lib/utils/levels";
import { XP_JOURNAL_START } from "@/lib/xp/award-task";
import type { TaskAttempt } from "@/types/db";

/**
 * Shared statistics for the dashboard and the leaderboard: both pages use the
 * same definitions, so their numbers always match.
 */

/** Number of unique tasks with at least one successful attempt. */
export function countSolvedTasks(attempts: Pick<TaskAttempt, "task_id" | "is_successful">[]): number {
  return new Set(attempts.filter((attempt) => attempt.is_successful).map((a) => a.task_id)).size;
}

export type LeaderboardPeriod = "all_time" | "month" | "week";

/** Public leaderboard row: no email or other private data. */
export interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  solved_tasks: number;
  rank: number;
}

async function solvedTasksByUser(): Promise<Map<string, number>> {
  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("is_successful", true),
    Query.select(["user_id", "task_id"]),
  ]);
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    const userId = String(row.user_id);
    if (!sets.has(userId)) sets.set(userId, new Set());
    sets.get(userId)?.add(String(row.task_id));
  }
  return new Map([...sets].map(([userId, tasks]) => [userId, tasks.size]));
}

function periodStart(period: LeaderboardPeriod): Date | null {
  if (period === "all_time") return null;
  const days = period === "week" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000);
}

/** Date from which weekly/monthly ratings are available (start of the XP journal). */
export const PERIOD_RATING_SINCE = XP_JOURNAL_START;

/**
 * Students ranked by XP. For "week"/"month" the XP earned in the period is
 * summed from the XP journal; the level always reflects total XP.
 */
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const [profiles, solved] = await Promise.all([listLeaderboardUsers(), solvedTasksByUser()]);

  const since = periodStart(period);
  let periodXp: Map<string, number> | null = null;
  if (since) {
    periodXp = new Map();
    for (const event of await listXpEventsSince(since)) {
      periodXp.set(event.user_id, (periodXp.get(event.user_id) ?? 0) + event.amount);
    }
  }

  const entries = profiles
    .map((profile) => ({
      id: profile.id,
      display_name: profile.display_name?.trim() || "Ученик",
      avatar_url: profile.avatar_url,
      total_xp: periodXp ? (periodXp.get(profile.id) ?? 0) : profile.total_xp,
      current_level: calculateLevel(profile.total_xp),
      solved_tasks: solved.get(profile.id) ?? 0,
    }))
    .filter((entry) => !periodXp || entry.total_xp > 0)
    .sort((a, b) => b.total_xp - a.total_xp || b.solved_tasks - a.solved_tasks);

  let rank = 0;
  let previousXp: number | null = null;
  return entries.map((entry, index) => {
    if (entry.total_xp !== previousXp) rank = index + 1;
    previousXp = entry.total_xp;
    return { ...entry, rank };
  });
}
