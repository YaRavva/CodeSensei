import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { ModulesList } from "@/components/modules/modules-list";

export default async function ModulesPage() {
  const { user, supabase } = await requireAuth();

  // Получаем только опубликованные модули
  const { data: modules, error } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order_index");

  if (error) {
    console.error("Error loading modules:", error);
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
        // lessons={lessonsData || []} // Удаляем lessons из пропсов
      />
    </div>
  );
}

