import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { ModuleDetails } from "@/components/modules/module-details";
import { createClient } from "@/lib/supabase/server";

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

  // Получаем задачи модуля
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,order_index,difficulty,xp_reward")
    .eq("module_id", moduleId)
    .order("order_index");
  if (tasksError) {
    console.error("Error loading tasks:", tasksError);
  }

  // Прогресс по задачам: количество задач с успешными попытками пользователя
  let completedTaskIds: string[] = [];
  if (tasks && tasks.length) {
    const { data: attempts } = await supabase
      .from("task_attempts")
      .select("task_id,is_successful")
      .eq("user_id", user.id)
      .in("task_id", tasks.map((t) => t.id));
    if (attempts) {
      const set = new Set<string>();
      for (const a of attempts) {
        if (a.is_successful) set.add(a.task_id as string);
      }
      completedTaskIds = Array.from(set);
    }
  }
  const totalTasks = tasks?.length || 0;
  const completedTasks = completedTaskIds.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <ModuleDetails module={module} tasks={tasks || []} completedTaskIds={completedTaskIds} moduleProgress={progress} />
  );
}

