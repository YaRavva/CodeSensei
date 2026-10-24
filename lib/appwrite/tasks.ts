import { TABLES } from "@/lib/appwrite/config";
import { createRow, deleteRow, getRowOrNull, listRows, Query, updateRow } from "@/lib/appwrite/db";
import { serializeJson, toTask } from "@/lib/appwrite/mappers";
import type { Task } from "@/types/db";

export async function listTasksByModule(moduleId: string): Promise<Task[]> {
  const rows = await listRows(TABLES.tasks, [
    Query.equal("module_id", moduleId),
    Query.orderAsc("order_index"),
  ]);

  return rows.map(toTask);
}

export async function listTaskSummariesByModule(
  moduleId: string
): Promise<Array<Pick<Task, "id" | "title" | "order_index" | "variant_number">>> {
  const rows = await listRows(TABLES.tasks, [
    Query.equal("module_id", moduleId),
    Query.orderAsc("order_index"),
    Query.select(["title", "order_index", "variant_number"]),
  ]);

  return rows.map((row) => ({
    id: row.$id,
    title: row.title as string,
    order_index: Number(row.order_index ?? 0),
    variant_number: row.variant_number == null ? null : Number(row.variant_number),
  }));
}

export async function getTask(taskId: string): Promise<Task | null> {
  const row = await getRowOrNull(TABLES.tasks, taskId);
  return row ? toTask(row) : null;
}

export async function getTaskInModule(taskId: string, moduleId: string): Promise<Task | null> {
  const task = await getTask(taskId);
  return task && task.module_id === moduleId ? task : null;
}

export async function createTask(input: {
  module_id: string;
  title: string;
  description: string;
  starter_code?: string;
  solution_code?: string | null;
  test_cases: unknown;
  xp_reward?: number;
  difficulty?: Task["difficulty"];
  hints?: unknown;
  order_index?: number;
  variant_number?: number | null;
}): Promise<Task> {
  const row = await createRow(TABLES.tasks, {
    module_id: input.module_id,
    title: input.title,
    description: input.description,
    starter_code: input.starter_code ?? "",
    solution_code: input.solution_code ?? null,
    test_cases: serializeJson(input.test_cases ?? []),
    xp_reward: input.xp_reward ?? 10,
    difficulty: input.difficulty ?? "easy",
    hints: input.hints == null ? null : serializeJson(input.hints),
    order_index: input.order_index ?? 0,
    variant_number: input.variant_number ?? null,
  });

  return toTask(row);
}

export async function updateTask(
  taskId: string,
  patch: Partial<
    Pick<
      Task,
      | "module_id"
      | "title"
      | "description"
      | "starter_code"
      | "solution_code"
      | "xp_reward"
      | "difficulty"
      | "order_index"
      | "variant_number"
    >
  > & { test_cases?: unknown; hints?: unknown }
): Promise<Task> {
  const data: Record<string, unknown> = { ...patch };

  if ("test_cases" in patch) data.test_cases = serializeJson(patch.test_cases ?? []);
  if ("hints" in patch) {
    data.hints = patch.hints == null ? null : serializeJson(patch.hints);
  }

  const row = await updateRow(TABLES.tasks, taskId, data);
  return toTask(row);
}

export async function deleteTaskCascade(taskId: string): Promise<void> {
  const attempts = await listRows(TABLES.taskAttempts, [Query.equal("task_id", taskId)]);
  for (const attempt of attempts) {
    await deleteRow(TABLES.taskAttempts, attempt.$id);
  }

  await deleteRow(TABLES.tasks, taskId);
}

export async function countTasks(moduleId: string): Promise<number> {
  const rows = await listRows(TABLES.tasks, [
    Query.equal("module_id", moduleId),
    Query.select(["module_id"]),
  ]);
  return rows.length;
}
