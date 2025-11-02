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
    .select("lesson_id, status")
    .eq("user_id", user.id);

  // Получаем все уроки для модулей
  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("id, module_id, is_published")
    .eq("is_published", true);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Модули</h1>
        <p className="text-muted-foreground">
          Выберите модуль для изучения Python
        </p>
      </div>
      <ModulesList
        modules={modules || []}
        userProgress={progressData || []}
        lessons={lessonsData || []}
      />
    </div>
  );
}

