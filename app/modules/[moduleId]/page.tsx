import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { ModuleDetails } from "@/components/modules/module-details";

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

  // Получаем уроки модуля
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order_index");

  if (lessonsError) {
    console.error("Error loading lessons:", lessonsError);
  }

  // Получаем прогресс пользователя для уроков
  const { data: progressData } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .in(
      "lesson_id",
      lessons?.map((l) => l.id) || []
    );

  // Рассчитываем прогресс модуля
  const totalLessons = lessons?.length || 0;
  const completedLessons =
    progressData?.filter((p) => p.status === "completed").length || 0;
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <ModuleDetails
      module={module}
      lessons={lessons || []}
      userProgress={progressData || []}
      moduleProgress={progress}
    />
  );
}

