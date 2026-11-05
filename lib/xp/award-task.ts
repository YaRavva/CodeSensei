import { listAttemptsForTasks, listSuccessfulAttemptsForTask } from "@/lib/appwrite/attempts";
import { hasUsedHint } from "@/lib/appwrite/hint-events";
import { addXp, getUserProfile } from "@/lib/appwrite/users";
import { recordXpEvent } from "@/lib/appwrite/xp-events";
import { calculateXP, type XPCalculationResult } from "@/lib/utils/xp-calculation";
import type { Task } from "@/types/db";

/**
 * Attempts made before the XP journal existed were already rewarded by the old
 * client-driven flow, so they never earn XP again.
 */
export const XP_JOURNAL_START = "2026-11-02T00:00:00.000Z";

export type AwardTaskXpResult =
  | { status: "not_solved" }
  | { status: "already_awarded"; totalXp: number; level: number }
  | {
      status: "awarded";
      xpAwarded: number;
      totalXp: number;
      level: number;
      calculation: XPCalculationResult;
    };

/**
 * Awards XP for a task using only server-side data: the attempt number, hint
 * usage and execution time come from stored attempts and hint events, never
 * from the request. XP is granted once per task (first successful attempt).
 */
export async function awardTaskXp(
  userId: string,
  task: Pick<Task, "id" | "difficulty" | "xp_reward">
): Promise<AwardTaskXpResult> {
  const attempts = (await listAttemptsForTasks(userId, [task.id])).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const firstSuccessIndex = attempts.findIndex((attempt) => attempt.is_successful);
  if (firstSuccessIndex < 0) return { status: "not_solved" };

  const firstSuccess = attempts[firstSuccessIndex];

  const alreadyAwarded = async (): Promise<AwardTaskXpResult> => {
    const profile = await getUserProfile(userId);
    return {
      status: "already_awarded",
      totalXp: profile?.total_xp ?? 0,
      level: profile?.current_level ?? 1,
    };
  };

  if (firstSuccess.created_at < XP_JOURNAL_START) return alreadyAwarded();

  const usedAiHint =
    attempts.slice(0, firstSuccessIndex + 1).some((attempt) => attempt.used_ai_hint) ||
    (await hasUsedHint(userId, task.id, firstSuccess.created_at));

  const times = (await listSuccessfulAttemptsForTask(task.id))
    .map((attempt) => attempt.execution_time_ms)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const averageExecutionTime =
    times.length > 0 ? times.reduce((sum, value) => sum + value, 0) / times.length : undefined;

  const calculation = calculateXP({
    baseXP: task.xp_reward || 0,
    difficulty: task.difficulty,
    attemptNumber: firstSuccessIndex + 1,
    usedAiHint,
    isFirstAttempt: firstSuccessIndex === 0,
    executionTime: firstSuccess.execution_time_ms ?? undefined,
    averageExecutionTime,
  });

  const recorded = await recordXpEvent({
    userId,
    sourceType: "task",
    sourceId: task.id,
    amount: calculation.totalXP,
    details: { attemptId: firstSuccess.id, attemptNumber: firstSuccessIndex + 1, usedAiHint },
  });
  if (!recorded) return alreadyAwarded();

  const updated = await addXp(userId, calculation.totalXP);
  return {
    status: "awarded",
    xpAwarded: calculation.totalXP,
    totalXp: updated.total_xp,
    level: updated.current_level,
    calculation,
  };
}
