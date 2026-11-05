/**
 * Reconciles accumulated gamification data with PRD rules (sections 9.1–9.3).
 *
 *  1. Duplicate achievement definitions are merged into the canonical `ach_*` set;
 *     their awards move to the canonical achievement, then the duplicates are deleted.
 *  2. Achievements are re-checked with the fixed conditions (unique tasks, day
 *     streaks, Moscow time). Awards that are not earned are revoked, earned but
 *     missing ones are granted. One award per achievement.
 *  3. The XP journal (`xp_events`) is rebuilt: one event per solved task (first
 *     successful attempt, server XP rules) and one per earned achievement.
 *  4. `users.total_xp` = sum of the journal, `current_level` = level from XP.
 *
 * Dry run by default. Writes a report JSON. Take a backup first (backup.ts).
 * Run: node --env-file=.env.local --import tsx scripts/maintenance/reconcile-data.ts [--apply]
 */
import { writeFileSync } from "node:fs";
import { ID } from "node-appwrite";
import { checkAchievementCondition, summarizeTasks } from "@/lib/utils/achievements";
import { calculateLevel } from "@/lib/utils/levels";
import { calculateXP } from "@/lib/utils/xp-calculation";
import type { Achievement, TaskAttempt } from "@/types/db";
import { adminTables, listAll } from "./backup";

type Row = Record<string, any>;

/** Duplicate definition id prefix → canonical achievement id. */
const MERGE_INTO: Record<string, string> = {
  "40849b93": "ach_first_task", // Первая победа (inactive legacy copy)
  "7f5cada0": "ach_ten_tasks", // Десятка (inactive legacy copy)
  ab9dc980: "ach_first_module", // Знаток = Модуль пройден (1 module)
  "46b53348": "ach_early_bird", // Проснись и пой ≈ Ранняя птица
  ab97946a: "ach_night_owl", // Под покровом ночи ≈ Ночная сова
};

const APPLY = process.argv.includes("--apply");
const databaseId = String(process.env.APPWRITE_DATABASE_ID || "codesensei");

function canonicalId(id: string): string {
  const key = Object.keys(MERGE_INTO).find((prefix) => id.startsWith(prefix));
  return key ? MERGE_INTO[key] : id;
}

function toAchievement(row: Row): Achievement {
  let value: unknown = row.condition_value;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = {}; }
  }
  return { ...row, id: row.$id, condition_value: value } as unknown as Achievement;
}

async function main() {
  const db = adminTables();
  const [users, tasks, attemptsRaw, progress, achievementsRaw, awards, events] = await Promise.all(
    ["users", "tasks", "task_attempts", "user_progress", "achievements", "user_achievements", "xp_events"]
      .map((table) => listAll(db, table))
  );

  const achievements = achievementsRaw.map(toAchievement);
  const duplicateIds = achievements.filter((a) => canonicalId(a.id) !== a.id).map((a) => a.id);
  const canonical = achievements.filter((a) => canonicalId(a.id) === a.id && a.is_active);
  const taskById = new Map(tasks.map((task) => [task.$id as string, task]));

  // Average execution time of successful attempts per task (for the "faster" bonus).
  const timesByTask = new Map<string, number[]>();
  for (const attempt of attemptsRaw) {
    if (!attempt.is_successful || !(attempt.execution_time_ms > 0)) continue;
    const list = timesByTask.get(attempt.task_id) ?? [];
    list.push(attempt.execution_time_ms);
    timesByTask.set(attempt.task_id, list);
  }
  const avg = (list?: number[]) =>
    list?.length ? list.reduce((sum, value) => sum + value, 0) / list.length : undefined;

  const existingEvents = new Set(events.map((e) => `${e.user_id}|${e.source_type}|${e.source_id}`));
  const report: Row[] = [];
  const plan = {
    deleteAwards: [] as Row[],
    createAwards: [] as Row[],
    createEvents: [] as Row[],
    updateUsers: [] as Row[],
  };

  for (const user of users) {
    const userId = user.$id as string;
    const attempts = attemptsRaw
      .filter((a) => a.user_id === userId && taskById.has(a.task_id))
      .map((a) => ({ ...a, id: a.$id }) as unknown as TaskAttempt)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const summary = summarizeTasks(attempts);
    const completedModules = progress.filter(
      (p) => p.user_id === userId && p.status === "completed"
    ).length;

    // Task XP: first successful attempt of each task.
    const taskEvents: Row[] = [];
    for (const solved of summary.filter((s) => s.solvedAt)) {
      const task = taskById.get(solved.taskId) as Row;
      const taskAttempts = attempts.filter((a) => a.task_id === solved.taskId);
      const index = taskAttempts.findIndex((a) => a.is_successful);
      const first = taskAttempts[index];
      const calc = calculateXP({
        baseXP: task.xp_reward || 0,
        difficulty: task.difficulty,
        attemptNumber: index + 1,
        usedAiHint: taskAttempts.slice(0, index + 1).some((a) => a.used_ai_hint),
        isFirstAttempt: index === 0,
        executionTime: first.execution_time_ms ?? undefined,
        averageExecutionTime: avg(timesByTask.get(solved.taskId)),
      });
      taskEvents.push({
        user_id: userId, source_type: "task", source_id: solved.taskId, amount: calc.totalXP,
        details: JSON.stringify({ attemptId: first.id, attemptNumber: index + 1, reconciled: true }),
        created_at: first.created_at,
      });
    }

    // Achievements: earned under fixed rules.
    const userAwards = awards.filter((a) => a.user_id === userId);
    const earliest = new Map<string, string>();
    for (const award of userAwards) {
      const id = canonicalId(award.achievement_id);
      const prev = earliest.get(id);
      if (!prev || award.earned_at < prev) earliest.set(id, award.earned_at);
    }
    const eligible = canonical.filter((a) =>
      checkAchievementCondition(a, { tasks: summary, completedModules, profileCreatedAt: user.$createdAt })
    );
    const eligibleIds = new Set(eligible.map((a) => a.id));
    const lastSolve = summary.map((s) => s.solvedAt).filter(Boolean).sort().pop() ?? new Date().toISOString();

    for (const award of userAwards) {
      if (award.achievement_id !== canonicalId(award.achievement_id) || !eligibleIds.has(award.achievement_id)) {
        plan.deleteAwards.push(award);
      }
    }
    const keptIds = new Set(
      userAwards.filter((a) => eligibleIds.has(a.achievement_id)).map((a) => a.achievement_id)
    );
    const achievementEvents: Row[] = [];
    for (const achievement of eligible) {
      const earnedAt = earliest.get(achievement.id) ?? lastSolve;
      if (!keptIds.has(achievement.id)) {
        plan.createAwards.push({ user_id: userId, achievement_id: achievement.id, earned_at: earnedAt });
      }
      if (achievement.xp_reward > 0) {
        achievementEvents.push({
          user_id: userId, source_type: "achievement", source_id: achievement.id,
          amount: achievement.xp_reward, details: JSON.stringify({ reconciled: true }), created_at: earnedAt,
        });
      }
    }

    const allEvents = [...taskEvents, ...achievementEvents];
    const newEvents = allEvents.filter((e) => !existingEvents.has(`${e.user_id}|${e.source_type}|${e.source_id}`));
    plan.createEvents.push(...newEvents);
    const keptExisting = events.filter((e) => e.user_id === userId);
    const totalXp =
      newEvents.reduce((sum, e) => sum + e.amount, 0) + keptExisting.reduce((sum, e) => sum + e.amount, 0);
    const level = calculateLevel(totalXp);
    if (totalXp !== user.total_xp || level !== user.current_level) {
      plan.updateUsers.push({ id: userId, total_xp: totalXp, current_level: level });
    }

    report.push({
      user: user.display_name || userId,
      role: user.role,
      oldXp: user.total_xp, newXp: totalXp, oldLevel: user.current_level, newLevel: level,
      solvedTasks: taskEvents.length,
      taskXp: taskEvents.reduce((s, e) => s + e.amount, 0),
      achievementsBefore: userAwards.length,
      achievementsAfter: eligible.length,
      revoked: userAwards
        .filter((a) => !eligibleIds.has(canonicalId(a.achievement_id)))
        .map((a) => achievements.find((x) => x.id === a.achievement_id)?.title),
      granted: eligible.filter((a) => !earliest.has(a.id)).map((a) => a.title),
    });
  }

  const delta = report.map((r) => r.newXp - r.oldXp);
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    users: report.length,
    duplicateDefinitions: duplicateIds.length,
    deleteAwards: plan.deleteAwards.length,
    createAwards: plan.createAwards.length,
    createEvents: plan.createEvents.length,
    updateUsers: plan.updateUsers.length,
    xpUp: delta.filter((d) => d > 0).length,
    xpDown: delta.filter((d) => d < 0).length,
    xpSame: delta.filter((d) => d === 0).length,
    totalOld: report.reduce((s, r) => s + (r.oldXp || 0), 0),
    totalNew: report.reduce((s, r) => s + r.newXp, 0),
  }, null, 1));
  writeFileSync(`reconcile-report${APPLY ? "-applied" : ""}.json`, JSON.stringify({ report, plan }, null, 1));
  if (!APPLY) return;

  const run = async <T>(items: T[], fn: (item: T) => Promise<unknown>) => {
    for (let i = 0; i < items.length; i += 10) await Promise.all(items.slice(i, i + 10).map(fn));
  };
  await run(plan.deleteAwards, (a) => db.deleteRow({ databaseId, tableId: "user_achievements", rowId: a.$id }));
  await run(plan.createAwards, (a) => db.createRow({ databaseId, tableId: "user_achievements", rowId: ID.unique(), data: a }));
  await run(plan.createEvents, (e) =>
    db.createRow({ databaseId, tableId: "xp_events", rowId: ID.unique(), data: e }).catch((error: any) => {
      if (error?.code !== 409) throw error;
    })
  );
  await run(plan.updateUsers, (u) =>
    db.updateRow({ databaseId, tableId: "users", rowId: u.id, data: { total_xp: u.total_xp, current_level: u.current_level } as never })
  );
  await run(duplicateIds, (id) => db.deleteRow({ databaseId, tableId: "achievements", rowId: id }));
  console.log("applied");
}

main().catch((error) => { console.error(error); process.exit(1); });
