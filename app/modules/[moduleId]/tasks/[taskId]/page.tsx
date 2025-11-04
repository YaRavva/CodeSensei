import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { notFound } from "next/navigation";
import { TaskPageContent } from "@/components/modules/task-page-content";
import type { Database } from "@/types/supabase";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function TaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; taskId: string }>;
}) {
  const { moduleId, taskId } = await params;
  const { user } = await requireAuth();
  const supabase = await createClient();

  const { data: module } = await supabase.from("modules").select("*").eq("id", moduleId).maybeSingle();
  if (!module) notFound();
  const typedModule = module as Module;

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).eq("module_id", moduleId).maybeSingle();
  if (!task) notFound();
  const typedTask = task as Task;

  // Навигация по заданиям модуля
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  const typedTasks = (tasks || []) as Array<{ id: string; title: string; order_index: number }>;
  const currentIdx = typedTask.order_index;
  const prevTask = typedTasks.find((t) => t.order_index === currentIdx - 1) ?? null;
  const nextTask = typedTasks.find((t) => t.order_index === currentIdx + 1) ?? null;

  // Последняя попытка
  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastAttempt = attempts?.[0] ?? null;

  return (
    <TaskPageContent module={typedModule} task={typedTask} prevTask={prevTask} nextTask={nextTask} lastAttempt={lastAttempt} />
  );
}


