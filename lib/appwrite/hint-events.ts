import { TABLES } from "@/lib/appwrite/config";
import { countRows, createRow, Query } from "@/lib/appwrite/db";

/** Daily limits for AI hints (PRD 8.1). */
export const HINT_LIMIT_PER_TASK_PER_DAY = 10;
export const HINT_LIMIT_PER_USER_PER_DAY = 50;

function startOfDay(date = new Date()): string {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

export async function logHintEvent(userId: string, taskId: string): Promise<void> {
  await createRow(TABLES.hintEvents, {
    user_id: userId,
    task_id: taskId,
    created_at: new Date().toISOString(),
  });
}

/** True when the user requested an AI hint for the task (optionally before a moment). */
export async function hasUsedHint(userId: string, taskId: string, before?: string): Promise<boolean> {
  const queries = [Query.equal("user_id", userId), Query.equal("task_id", taskId)];
  if (before) queries.push(Query.lessThanEqual("created_at", before));
  return (await countRows(TABLES.hintEvents, queries)) > 0;
}

export async function checkHintLimit(
  userId: string,
  taskId: string
): Promise<{ allowed: boolean; error?: string }> {
  const since = startOfDay();
  const [forTask, total] = await Promise.all([
    countRows(TABLES.hintEvents, [
      Query.equal("user_id", userId),
      Query.equal("task_id", taskId),
      Query.greaterThanEqual("created_at", since),
    ]),
    countRows(TABLES.hintEvents, [
      Query.equal("user_id", userId),
      Query.greaterThanEqual("created_at", since),
    ]),
  ]);

  if (forTask >= HINT_LIMIT_PER_TASK_PER_DAY) {
    return { allowed: false, error: "На сегодня подсказки к этому заданию закончились" };
  }
  if (total >= HINT_LIMIT_PER_USER_PER_DAY) {
    return { allowed: false, error: "На сегодня подсказки закончились. Попробуйте завтра" };
  }
  return { allowed: true };
}
