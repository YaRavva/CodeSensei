/**
 * Syncs course content (content/modules/*.yaml) into Appwrite.
 *
 *  - Modules get IDs from lib/curriculum.ts (m01_print …), tasks — `${moduleId}_${slug}`.
 *  - Existing rows with these IDs are updated, missing ones are created.
 *  - Modules that are not in the content (old course) are unpublished, not deleted:
 *    attempts, XP and achievements history stays intact.
 *  - Tasks of synced modules that are no longer in the content are removed only
 *    if nobody has attempted them, otherwise kept and reported.
 *
 * Dry run by default. Validate first (validate.ts) and take a backup (backup.ts).
 * Run: node --env-file=.env.local --import tsx scripts/content/sync.ts [--apply]
 */
import { getCurriculumModule, XP_BY_DIFFICULTY } from "@/lib/curriculum";
import { taskId } from "@/lib/content/schema";
import { adminTables, listAll } from "../maintenance/backup";
import { loadContent, toTestCases } from "./load";

const APPLY = process.argv.includes("--apply");
const databaseId = String(process.env.APPWRITE_DATABASE_ID || "codesensei");

type Row = Record<string, unknown>;

function changedKeys(current: Row | undefined, next: Row): string[] {
  if (!current) return Object.keys(next);
  return Object.keys(next).filter((key) => (current[key] ?? null) !== (next[key] ?? null));
}

async function main() {
  const db = adminTables();
  const content = loadContent();
  const [modules, tasks, attempts] = await Promise.all(
    ["modules", "tasks", "task_attempts"].map((table) => listAll(db, table))
  );
  const moduleById = new Map(modules.map((row) => [row.$id as string, row]));
  const taskById = new Map(tasks.map((row) => [row.$id as string, row]));
  const attemptedTasks = new Set(attempts.map((row) => row.task_id as string));
  const contentIds = new Set(content.map((module) => module.id));

  const plan: { table: string; id: string; action: "create" | "update"; data: Row; keys: string[] }[] = [];
  const deletions: string[] = [];
  const kept: string[] = [];

  for (const module of content) {
    const meta = getCurriculumModule(module.id);
    if (!meta) throw new Error(`unknown module ${module.id}`);
    const data: Row = {
      title: meta.title,
      description: module.theory.trim(),
      topic: module.topic,
      level: meta.level,
      order_index: meta.order,
      is_published: true,
      created_by: "system",
    };
    const keys = changedKeys(moduleById.get(module.id), data);
    if (keys.length) plan.push({ table: "modules", id: module.id, action: moduleById.has(module.id) ? "update" : "create", data, keys });

    const contentTaskIds = new Set<string>();
    module.tasks.forEach((task, index) => {
      const id = taskId(module.id, task.slug);
      contentTaskIds.add(id);
      const taskData: Row = {
        module_id: module.id,
        title: task.title,
        description: task.description.trim(),
        starter_code: task.starter,
        solution_code: task.solution,
        test_cases: JSON.stringify(toTestCases(module, task.slug)),
        xp_reward: XP_BY_DIFFICULTY[task.difficulty],
        difficulty: task.difficulty,
        hints: JSON.stringify(task.hints.map((text, level) => ({ id: `hint_${level + 1}`, level: level + 1, text }))),
        order_index: index + 1,
        variant_number: null,
        task_type: meta.taskType,
      };
      const taskKeys = changedKeys(taskById.get(id), taskData);
      if (taskKeys.length) plan.push({ table: "tasks", id, action: taskById.has(id) ? "update" : "create", data: taskData, keys: taskKeys });
    });

    for (const row of tasks.filter((item) => item.module_id === module.id && !contentTaskIds.has(item.$id))) {
      (attemptedTasks.has(row.$id) ? kept : deletions).push(row.$id);
    }
  }

  for (const row of modules.filter((item) => !contentIds.has(item.$id) && item.is_published)) {
    plan.push({ table: "modules", id: row.$id, action: "update", data: { is_published: false }, keys: ["is_published"] });
  }

  const count = (table: string, action: string) => plan.filter((p) => p.table === table && p.action === action).length;
  console.log(`Модули: создать ${count("modules", "create")}, обновить ${count("modules", "update")}`);
  console.log(`Задания: создать ${count("tasks", "create")}, обновить ${count("tasks", "update")}, удалить ${deletions.length}, оставить (есть попытки) ${kept.length}`);
  for (const p of plan.filter((item) => item.action === "update")) console.log(`  ~ ${p.table}/${p.id}: ${p.keys.join(", ")}`);
  if (!APPLY) {
    console.log("\nПробный запуск. Для применения добавьте --apply");
    return;
  }

  // Modules first so tasks never point to a missing module.
  for (const p of [...plan].sort((a, b) => (a.table === "modules" ? -1 : 0) - (b.table === "modules" ? -1 : 0))) {
    if (p.action === "create") await db.createRow({ databaseId, tableId: p.table, rowId: p.id, data: p.data });
    else await db.updateRow({ databaseId, tableId: p.table, rowId: p.id, data: p.data });
  }
  for (const id of deletions) await db.deleteRow({ databaseId, tableId: "tasks", rowId: id });
  console.log("\nПрименено.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
