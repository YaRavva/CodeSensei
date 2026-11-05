import { redirect } from "next/navigation";
import { ModuleUnifiedPage } from "@/components/modules/module-unified-page";
import { listAttemptsForTasks } from "@/lib/appwrite/attempts";
import { getPublishedModule, listPublishedModules } from "@/lib/appwrite/modules";
import { listTasksByModule, toPublicTask } from "@/lib/appwrite/tasks";
import { isModuleOpen, isStaffRole } from "@/lib/course-access";
import { listUserProgress } from "@/lib/appwrite/progress";
import { requireAuth } from "@/lib/utils/auth";
import type { Json } from "@/types/db";

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { user, profile } = await requireAuth();
  const { moduleId } = await params;

  const module = await getPublishedModule(moduleId);
  if (!module) {
    redirect("/modules");
  }
  // Levels open one after another (PRD 3.2).
  if (!isStaffRole(profile.role) && !isModuleOpen(moduleId, await listUserProgress(user.$id))) {
    redirect("/modules");
  }

  const [tasks, published] = await Promise.all([listTasksByModule(moduleId), listPublishedModules()]);
  const index = published.findIndex((item) => item.id === moduleId);
  const next = index >= 0 ? published[index + 1] : undefined;
  const nextModule = next ? { id: next.id, title: next.title } : null;
  const taskIds = tasks.map((task) => task.id);
  const attempts = await listAttemptsForTasks(user.$id, taskIds);

  const completedTaskIds = Array.from(
    new Set(attempts.filter((attempt) => attempt.is_successful).map((attempt) => attempt.task_id))
  );

  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTaskIds.length / totalTasks) * 100) : 0;

  const successfulAttempts = attempts.filter((attempt) => attempt.is_successful);
  let xpEarned = 0;
  let totalScore = 0;
  let scoreCount = 0;
  let totalTime = 0;

  for (const attempt of successfulAttempts) {
    const task = tasks.find((item) => item.id === attempt.task_id);
    if (task?.xp_reward) xpEarned += task.xp_reward;

    const testResults = attempt.test_results as Record<string, Json> | null;
    if (testResults && typeof testResults === "object" && "ai_score" in testResults) {
      const score = Number(testResults.ai_score);
      if (!Number.isNaN(score)) {
        totalScore += score * 100;
        scoreCount++;
      }
    }

    if (attempt.execution_time_ms) totalTime += attempt.execution_time_ms;
  }

  const userProgress =
    tasks.length > 0
      ? {
          xpEarned,
          avgScore: scoreCount > 0 ? totalScore / scoreCount : undefined,
          timeSpent: totalTime > 0 ? totalTime / 1000 : undefined,
        }
      : undefined;

  return (
    <ModuleUnifiedPage
      module={module}
      tasks={tasks.map(toPublicTask)}
      completedTaskIds={completedTaskIds}
      moduleProgress={progress}
      userProgress={userProgress}
      nextModule={nextModule}
    />
  );
}
