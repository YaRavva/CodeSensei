import { TABLES } from "@/lib/appwrite/config";
import { countRows, createRow, getRowOrNull, listRows, Query, updateRow } from "@/lib/appwrite/db";
import { serializeJson, toTaskAttempt } from "@/lib/appwrite/mappers";
import type { Json, TaskAttempt } from "@/types/db";

export async function createTaskAttempt(input: {
  user_id: string;
  task_id: string;
  code_solution: string;
  test_results: Json;
  is_successful: boolean;
  used_ai_hint?: boolean;
  execution_time_ms?: number | null;
  solving_time_ms?: number | null;
  error_message?: string | null;
}): Promise<TaskAttempt> {
  const row = await createRow(TABLES.taskAttempts, {
    user_id: input.user_id,
    task_id: input.task_id,
    code_solution: input.code_solution,
    test_results: serializeJson(input.test_results),
    is_successful: input.is_successful,
    used_ai_hint: input.used_ai_hint ?? false,
    execution_time_ms: input.execution_time_ms ?? null,
    solving_time_ms: input.solving_time_ms ?? null,
    error_message: input.error_message ?? null,
    created_at: new Date().toISOString(),
  });

  return toTaskAttempt(row);
}

export async function listAttemptsForTasks(
  userId: string,
  taskIds: string[]
): Promise<TaskAttempt[]> {
  if (taskIds.length === 0) return [];

  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("task_id", taskIds),
    Query.orderDesc("created_at"),
  ]);

  return rows.map(toTaskAttempt);
}

export async function listAttemptsByUser(userId: string): Promise<TaskAttempt[]> {
  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.orderAsc("created_at"),
  ]);

  return rows.map(toTaskAttempt);
}

export async function listSuccessfulAttempts(userId: string): Promise<TaskAttempt[]> {
  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("is_successful", true),
  ]);

  return rows.map(toTaskAttempt);
}

export async function getLastAttempt(userId: string, taskId: string): Promise<TaskAttempt | null> {
  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("task_id", taskId),
    Query.orderDesc("created_at"),
  ]);

  return rows.length > 0 ? toTaskAttempt(rows[0]) : null;
}

export async function countTaskAttempts(userId: string, taskId: string): Promise<number> {
  return countRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("task_id", taskId),
  ]);
}

export async function countSuccessfulAttempts(userId: string): Promise<number> {
  return countRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("is_successful", true),
  ]);
}

export async function hasSuccessfulAttempt(userId: string, taskId: string): Promise<boolean> {
  const count = await countRows(TABLES.taskAttempts, [
    Query.equal("user_id", userId),
    Query.equal("task_id", taskId),
    Query.equal("is_successful", true),
  ]);

  return count > 0;
}

export async function updateTaskAttempt(
  attemptId: string,
  patch: Partial<Pick<TaskAttempt, "is_successful" | "used_ai_hint">>
): Promise<void> {
  try {
    await updateRow(TABLES.taskAttempts, attemptId, patch);
  } catch {
    // Attempts are an audit trail; a failed update must not fail the request.
  }
}

export async function getAttempt(attemptId: string): Promise<TaskAttempt | null> {
  const row = await getRowOrNull(TABLES.taskAttempts, attemptId);
  return row ? toTaskAttempt(row) : null;
}

/** Successful attempts for a task across all users (used for speed bonuses). */
export async function listSuccessfulAttemptsForTask(taskId: string): Promise<TaskAttempt[]> {
  const rows = await listRows(TABLES.taskAttempts, [
    Query.equal("task_id", taskId),
    Query.equal("is_successful", true),
  ]);

  return rows.map(toTaskAttempt);
}
