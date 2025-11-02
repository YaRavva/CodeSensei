import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { notFound, redirect } from "next/navigation";
import { TaskPageContent } from "@/components/modules/task-page-content";
import type { Database } from "@/types/supabase";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function TaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string; taskId: string }>;
}) {
  const { moduleId, lessonId, taskId } = await params;
  const { user } = await requireAuth();
  const supabase = await createClient();

  // Загружаем модуль
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();

  if (moduleError || !module) {
    notFound();
  }

  // Загружаем урок
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (lessonError || !lesson) {
    notFound();
  }

  // Загружаем задание - проверяем, что оно принадлежит уроку
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (taskError || !task) {
    notFound();
  }

  // Загружаем все задания урока для навигации (только уникальные order_index)
  // Используем DISTINCT ON для получения одного задания на каждый order_index
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("id, title, order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  
  // Группируем по order_index и выбираем одно задание для каждой позиции
  const uniqueTasks = new Map<number, { id: string; title: string; order_index: number }>();
  if (allTasks) {
    for (const task of allTasks) {
      if (!uniqueTasks.has(task.order_index)) {
        uniqueTasks.set(task.order_index, task);
      }
    }
  }
  const tasksForNav = Array.from(uniqueTasks.values()).sort((a, b) => a.order_index - b.order_index);

  // Находим предыдущее и следующее задание по order_index
  const currentOrderIndex = task?.order_index;
  const prevTask =
    currentOrderIndex !== undefined && currentOrderIndex > 0
      ? tasksForNav.find((t) => t.order_index === currentOrderIndex - 1) ?? null
      : null;
  const nextTask =
    currentOrderIndex !== undefined
      ? tasksForNav.find((t) => t.order_index === currentOrderIndex + 1) ?? null
      : null;

  // Загружаем предыдущие попытки пользователя для этого задания
  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastAttempt = attempts?.[0] ?? null;

  return (
    <TaskPageContent
      module={module}
      lesson={lesson}
      task={task}
      prevTask={prevTask}
      nextTask={nextTask}
      lastAttempt={lastAttempt}
    />
  );
}

