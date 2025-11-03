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

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).eq("module_id", moduleId).maybeSingle();
  if (!task) notFound();

  // Навигация по заданиям модуля
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  const currentIdx = task.order_index;
  const prevTask = tasks?.find((t) => t.order_index === currentIdx - 1) ?? null;
  const nextTask = tasks?.find((t) => t.order_index === currentIdx + 1) ?? null;

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
    <TaskPageContent module={module as Module} task={task as Task} prevTask={prevTask} nextTask={nextTask} lastAttempt={lastAttempt} />
  );
}


