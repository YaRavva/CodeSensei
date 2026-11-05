import { CURRICULUM, LEVELS } from "@/lib/curriculum";

/**
 * Course levels are blocks of 10 modules (PRD 3.2). Level 1 is always open;
 * every next level opens when all modules of the previous one are completed.
 */
export function moduleLevel(moduleId: string): number {
  return CURRICULUM.find((m) => m.id === moduleId)?.level ?? 1;
}

export function levelModuleIds(level: number): string[] {
  return CURRICULUM.filter((m) => m.level === level).map((m) => m.id);
}

/** Highest open level for a user: 1 + number of fully completed levels in a row. */
export function openLevel(progress: { module_id: string; status: string }[]): number {
  const completed = new Set(progress.filter((p) => p.status === "completed").map((p) => p.module_id));
  let open = 1;
  for (const { level } of LEVELS) {
    if (level >= LEVELS.length) break;
    if (levelModuleIds(level).every((id) => completed.has(id))) open = level + 1;
    else break;
  }
  return open;
}

export function isModuleOpen(moduleId: string, progress: { module_id: string; status: string }[]): boolean {
  return moduleLevel(moduleId) <= openLevel(progress);
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "teacher";
}
