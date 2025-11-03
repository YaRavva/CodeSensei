import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default async function LegacyTaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string; taskId: string }>;
}) {
  const { moduleId, lessonId, taskId } = await params;
  const { user } = await requireAuth();
  const supabase = await createClient();
  // Редирект на новый маршрут (уроки удалены)
  // Проверим принадлежность задания модулю для корректного URL
  const { data: t } = await supabase.from("tasks").select("module_id").eq("id", taskId).maybeSingle();
  const modId = t?.module_id || moduleId;
  redirect(`/modules/${modId}/tasks/${taskId}`);
}

