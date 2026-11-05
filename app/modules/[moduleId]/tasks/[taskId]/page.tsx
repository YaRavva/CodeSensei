import { notFound } from "next/navigation";
import { TaskPageContent } from "@/components/modules/task-page-content";
import { getLastAttempt } from "@/lib/appwrite/attempts";
import { getModule, getPublishedModule } from "@/lib/appwrite/modules";
import { getTaskInModule, listTaskSummariesByModule, toPublicTask } from "@/lib/appwrite/tasks";
import { listUserProgress } from "@/lib/appwrite/progress";
import { coreModulesLeft, isExtraModule, isStaffRole } from "@/lib/course-access";
import { requireAuth } from "@/lib/utils/auth";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; taskId: string }>;
}) {
  const { moduleId, taskId } = await params;
  const { user, profile } = await requireAuth();
  const isStaff = isStaffRole(profile.role);

  // Students only see published modules; staff can preview drafts.
  const module = isStaff ? await getModule(moduleId) : await getPublishedModule(moduleId);
  if (!module) notFound();
  if (isExtraModule(moduleId) && !isStaff && coreModulesLeft(await listUserProgress(user.$id)) > 0) {
    notFound();
  }

  const task = await getTaskInModule(taskId, moduleId);
  if (!task) notFound();

  const tasks = await listTaskSummariesByModule(moduleId);
  const currentIndex = tasks.findIndex((item) => item.id === taskId);
  const prevTask = currentIndex > 0 ? tasks[currentIndex - 1] : null;
  const nextTask =
    currentIndex >= 0 && currentIndex < tasks.length - 1 ? tasks[currentIndex + 1] : null;

  const lastAttempt = await getLastAttempt(user.$id, taskId);

  return (
    <TaskPageContent
      module={module}
      task={toPublicTask(task)}
      prevTask={prevTask}
      nextTask={nextTask}
      lastAttempt={lastAttempt}
    />
  );
}
