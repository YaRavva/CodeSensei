import { TABLES } from "@/lib/appwrite/config";
import { countRows, createRow, listRows, Query, updateRow } from "@/lib/appwrite/db";
import { toUserProgress } from "@/lib/appwrite/mappers";
import type { UserProgress } from "@/types/db";

export async function listUserProgress(userId: string): Promise<UserProgress[]> {
  const rows = await listRows(TABLES.userProgress, [Query.equal("user_id", userId)]);
  return rows.map(toUserProgress);
}

export async function getUserProgress(
  userId: string,
  moduleId: string
): Promise<UserProgress | null> {
  const rows = await listRows(TABLES.userProgress, [
    Query.equal("user_id", userId),
    Query.equal("module_id", moduleId),
  ]);

  return rows.length > 0 ? toUserProgress(rows[0]) : null;
}

export async function upsertUserProgress(
  userId: string,
  moduleId: string,
  patch: Partial<
    Pick<
      UserProgress,
      "status" | "xp_earned" | "attempts_count" | "first_completed_at" | "last_attempt_at"
    >
  >
): Promise<UserProgress> {
  const existing = await getUserProgress(userId, moduleId);

  if (existing) {
    const row = await updateRow(TABLES.userProgress, existing.id, patch);
    return toUserProgress(row);
  }

  try {
    const row = await createRow(TABLES.userProgress, {
      user_id: userId,
      module_id: moduleId,
      status: patch.status ?? "in_progress",
      xp_earned: patch.xp_earned ?? 0,
      attempts_count: patch.attempts_count ?? 0,
      first_completed_at: patch.first_completed_at ?? null,
      last_attempt_at: patch.last_attempt_at ?? null,
    });
    return toUserProgress(row);
  } catch {
    // Unique index race: another request created the row first.
    const concurrent = await getUserProgress(userId, moduleId);
    if (!concurrent) throw new Error("Failed to create user progress");
    return concurrent;
  }
}

/**
 * Recalculates module status: completed when every task in the module has a
 * successful attempt by the user.
 */
export async function recomputeModuleProgress(
  userId: string,
  moduleId: string
): Promise<UserProgress> {
  const taskRows = await listRows(TABLES.tasks, [
    Query.equal("module_id", moduleId),
    Query.select(["module_id"]),
  ]);
  const taskIds = taskRows.map((row) => row.$id);
  const now = new Date().toISOString();

  if (taskIds.length === 0) {
    return upsertUserProgress(userId, moduleId, {
      status: "completed",
      last_attempt_at: now,
      first_completed_at: now,
    });
  }

  const attemptRows = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("is_successful", true),
    Query.equal("task_id", taskIds),
    Query.select(["task_id"]),
  ]);

  const completed = new Set(attemptRows.map((row) => row.task_id as string));
  const isComplete = completed.size >= taskIds.length;
  const existing = await getUserProgress(userId, moduleId);

  return upsertUserProgress(userId, moduleId, {
    status: isComplete ? "completed" : "in_progress",
    last_attempt_at: now,
    ...(isComplete ? { first_completed_at: existing?.first_completed_at ?? now } : {}),
  });
}

export async function countCompletedModules(userId: string): Promise<number> {
  return countRows(TABLES.userProgress, [
    Query.equal("user_id", userId),
    Query.equal("status", "completed"),
  ]);
}

export async function getUserModuleStats(userId: string) {
  const progress = await listUserProgress(userId);
  const completedModules = progress.filter((item) => item.status === "completed").length;

  const attempts = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.select(["is_successful", "execution_time_ms", "solving_time_ms"]),
  ]);

  const successfulAttempts = attempts.filter((row) => row.is_successful === true).length;

  return {
    completedModules,
    successfulAttempts,
    totalAttempts: attempts.length,
  };
}
