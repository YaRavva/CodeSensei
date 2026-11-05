import { CURRICULUM } from "@/lib/curriculum";

/** Modules of the "Дополнительно" section (PRD 3.2). */
export const EXTRA_MODULE_IDS = CURRICULUM.filter((m) => m.extra).map((m) => m.id);
/** Modules of the core part; "Дополнительно" opens after all of them are completed. */
export const CORE_MODULE_IDS = CURRICULUM.filter((m) => !m.extra).map((m) => m.id);

export function isExtraModule(moduleId: string): boolean {
  return EXTRA_MODULE_IDS.includes(moduleId);
}

/** How many core modules are not completed yet. */
export function coreModulesLeft(progress: { module_id: string; status: string }[]): number {
  const completed = new Set(progress.filter((p) => p.status === "completed").map((p) => p.module_id));
  return CORE_MODULE_IDS.filter((id) => !completed.has(id)).length;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "teacher";
}
