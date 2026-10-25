import { TABLES } from "@/lib/appwrite/config";
import { createRow, deleteRow, getRowOrNull, listRows, Query, updateRow } from "@/lib/appwrite/db";
import { toModule } from "@/lib/appwrite/mappers";
import type { Module } from "@/types/db";

export async function listPublishedModules(): Promise<Module[]> {
  const rows = await listRows(TABLES.modules, [
    Query.equal("is_published", true),
    Query.orderAsc("order_index"),
  ]);

  return rows.map(toModule);
}

export async function listAllModules(): Promise<Module[]> {
  const rows = await listRows(TABLES.modules, [Query.orderAsc("order_index")]);
  return rows.map(toModule);
}

export async function getModule(moduleId: string): Promise<Module | null> {
  const row = await getRowOrNull(TABLES.modules, moduleId);
  return row ? toModule(row) : null;
}

export async function getPublishedModule(moduleId: string): Promise<Module | null> {
  const module = await getModule(moduleId);
  return module?.is_published ? module : null;
}

export async function createModule(input: {
  title: string;
  description?: string | null;
  topic: string;
  level: number;
  order_index?: number;
  is_published?: boolean;
  created_by: string;
}): Promise<Module> {
  const row = await createRow(TABLES.modules, {
    title: input.title,
    description: input.description ?? null,
    topic: input.topic,
    level: input.level,
    order_index: input.order_index ?? 0,
    is_published: input.is_published ?? false,
    created_by: input.created_by,
  });

  return toModule(row);
}

export async function updateModule(
  moduleId: string,
  patch: Partial<
    Pick<Module, "title" | "description" | "topic" | "level" | "order_index" | "is_published">
  >
): Promise<Module> {
  const row = await updateRow(TABLES.modules, moduleId, patch);
  return toModule(row);
}

export async function deleteModuleCascade(moduleId: string): Promise<void> {
  const tasks = await listRows(TABLES.tasks, [Query.equal("module_id", moduleId)]);
  for (const task of tasks) {
    await deleteRow(TABLES.tasks, task.$id);
  }

  const progressRows = await listRows(TABLES.userProgress, [Query.equal("module_id", moduleId)]);
  for (const progress of progressRows) {
    await deleteRow(TABLES.userProgress, progress.$id);
  }

  await deleteRow(TABLES.modules, moduleId);
}

export async function countTasksByModule(moduleIds: string[]): Promise<Record<string, number>> {
  if (moduleIds.length === 0) return {};

  const rows = await listRows(TABLES.tasks, [
    Query.equal("module_id", moduleIds),
    Query.select(["module_id"]),
  ]);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const moduleId = row.module_id as string;
    counts[moduleId] = (counts[moduleId] ?? 0) + 1;
  }

  return counts;
}
