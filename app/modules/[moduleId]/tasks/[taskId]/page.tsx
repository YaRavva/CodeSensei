import { notFound } from "next/navigation";
import { TaskPageContent } from "@/components/modules/task-page-content";
import { getLastAttempt } from "@/lib/appwrite/attempts";
import { getModule } from "@/lib/appwrite/modules";
import { getTaskInModule, listTaskSummariesByModule } from "@/lib/appwrite/tasks";
import { requireAuth } from "@/lib/utils/auth";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; taskId: string }>;
}) {
  const { moduleId, taskId } = await params;
  const { user } = await requireAuth();

  const module = await getModule(moduleId);
  if (!module) notFound();

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
      task={task}
      prevTask={prevTask}
      nextTask={nextTask}
      lastAttempt={lastAttempt}
    />
  );
}
