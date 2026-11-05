import { getPublishedModule } from "@/lib/appwrite/modules";
import { listUserProgress } from "@/lib/appwrite/progress";
import { isModuleOpen, isStaffRole } from "@/lib/course-access";

/**
 * Same rules as the task page: staff see everything; students only tasks of
 * published modules whose level is already open for them.
 */
export async function canAccessTask(
  userId: string,
  role: string | null | undefined,
  task: { module_id?: string | null }
): Promise<boolean> {
  if (isStaffRole(role)) return true;
  const moduleId = task.module_id;
  if (!moduleId) return false;
  const module = await getPublishedModule(moduleId);
  if (!module) return false;
  return isModuleOpen(moduleId, await listUserProgress(userId));
}
