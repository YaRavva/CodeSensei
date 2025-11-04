import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { ModuleUnifiedPage } from "@/components/modules/module-unified-page";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { user, supabase } = await requireAuth();
  const { moduleId } = await params;

  // Получаем модуль
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .eq("is_published", true)
    .single();

  if (moduleError || !module) {
    redirect("/modules");
  }

  // Получаем все задачи модуля (полные данные для редактора)
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index");
  if (tasksError) {
    console.error("Error loading tasks:", tasksError);
  }

  const typedTasks = (tasks || []) as Task[];

  // Прогресс по задачам: количество задач с успешными попытками пользователя
  let completedTaskIds: string[] = [];
  if (typedTasks.length) {
    const { data: attempts } = await supabase
      .from("task_attempts")
      .select("task_id,is_successful")
      .eq("user_id", user.id)
      .in("task_id", typedTasks.map((t) => t.id));
    if (attempts) {
      const typedAttempts = attempts as Array<{ task_id: string; is_successful: boolean }>;
      const set = new Set<string>();
      for (const a of typedAttempts) {
        if (a.is_successful) set.add(a.task_id);
      }
      completedTaskIds = Array.from(set);
    }
  }
  const totalTasks = typedTasks.length;
  const completedTasks = completedTaskIds.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Получаем статистику модуля
  let userProgress: {
    xpEarned: number;
    avgScore?: number;
    timeSpent?: number;
  } | undefined = undefined;

  if (typedTasks.length > 0) {
    const taskIds = typedTasks.map((t) => t.id);
    
    // Получаем все попытки пользователя для заданий модуля
    const { data: allAttempts } = await supabase
      .from("task_attempts")
      .select("is_successful, execution_time_ms, test_results")
      .eq("user_id", user.id)
      .in("task_id", taskIds);

    if (allAttempts) {
      // Подсчитываем XP из всех успешных попыток (базовые значения)
      let xpEarned = 0;
      let totalScore = 0;
      let scoreCount = 0;
      let totalTime = 0;

      const typedAllAttempts = (allAttempts || []) as Array<{ 
        is_successful: boolean; 
        task_id: string; 
        execution_time_ms: number | null; 
        test_results: any 
      }>;
      
      for (const attempt of typedAllAttempts) {
        if (attempt.is_successful) {
          // Находим задание для получения xp_reward
          const task = typedTasks.find((t) => t.id === attempt.task_id);
          if (task && task.xp_reward) {
            xpEarned += task.xp_reward;
          }

          // Извлекаем AI оценку из test_results если есть
          if (attempt.test_results) {
            try {
              const testResults = typeof attempt.test_results === 'string' 
                ? JSON.parse(attempt.test_results) 
                : attempt.test_results;
              
              // Если есть AI оценка в test_results
              if (testResults.ai_score !== undefined) {
                totalScore += testResults.ai_score * 100;
                scoreCount++;
              }
            } catch {
              // Игнорируем ошибки парсинга
            }
          }

          if (attempt.execution_time_ms) {
            totalTime += attempt.execution_time_ms;
          }
        }
      }

      userProgress = {
        xpEarned,
        avgScore: scoreCount > 0 ? totalScore / scoreCount : undefined,
        timeSpent: totalTime > 0 ? totalTime / 1000 : undefined, // в секундах
      };
    }
  }

  return (
    <ModuleUnifiedPage 
      module={module} 
      tasks={typedTasks} 
      completedTaskIds={completedTaskIds} 
      moduleProgress={progress}
      userProgress={userProgress}
    />
  );
}

