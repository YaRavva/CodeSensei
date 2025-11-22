import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { ModulesList } from "@/components/modules/modules-list";
import { checkNameAndRedirect } from "@/lib/utils/auth-redirect";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export default async function ModulesPage() {
  const { user, profile, supabase } = await requireAuth();

  // Проверяем имя пользователя - если не соответствует формату, редиректим на профиль
  const typedProfile = profile as UserProfile | null;
  checkNameAndRedirect(typedProfile);

  // Получаем только опубликованные модули
  const { data: modules, error } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order_index");

  if (error) {
    console.error("Error loading modules:", error);
  }

  // Получаем количество заданий для каждого модуля
  const typedModules = (modules || []) as Array<{ id: string }>;
  const moduleIds = typedModules.map((m) => m.id);
  const tasksCountMap: Record<string, number> = {};
  
  if (moduleIds.length > 0) {
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("module_id")
      .in("module_id", moduleIds);
    
    const typedTasksData = (tasksData || []) as Array<{ module_id: string }>;
    typedTasksData.forEach((task) => {
      tasksCountMap[task.module_id] = (tasksCountMap[task.module_id] || 0) + 1;
    });
  }

  // Получаем прогресс пользователя для определения статуса модулей
  const { data: progressData } = await supabase
    .from("user_progress")
    .select("module_id, status") // Изменено: теперь user_progress привязан к module_id
    .eq("user_id", user.id);

  // Удаляем получение уроков, так как они больше не используются
  // const { data: lessonsData } = await supabase
  //   .from("lessons")
  //   .select("id, module_id, is_published")
  //   .eq("is_published", true);

  return (
    <div className="container mx-auto px-4 py-8">
      <ModulesList
        modules={modules || []}
        userProgress={progressData || []}
        tasksCountMap={tasksCountMap}
        // lessons={lessonsData || []} // Удаляем lessons из пропсов
      />
    </div>
  );
}

