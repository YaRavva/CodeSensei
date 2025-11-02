import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { LessonDetails } from "@/components/modules/lesson-details";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { user, supabase } = await requireAuth();
  const { moduleId, lessonId } = await params;

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

  // Получаем урок
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .single();

  if (lessonError || !lesson) {
    redirect(`/modules/${moduleId}`);
  }

  // Получаем все уроки модуля для навигации
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, title, order_index")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order_index");

  // Находим текущий индекс урока
  const currentIndex = allLessons?.findIndex((l) => l.id === lessonId) ?? -1;
  const prevLesson =
    currentIndex > 0 ? allLessons?.[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && allLessons && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  // Получаем задания урока - для каждого order_index выбираем случайный вариант
  // Сначала получаем все задания
  const { data: allTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index");
  
  // Группируем по order_index и выбираем случайный вариант для каждой позиции
  const tasks: typeof allTasks = [];
  if (allTasks) {
    const grouped = new Map<number, typeof allTasks>();
    for (const task of allTasks) {
      const key = task.order_index;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    }
    
    // Для каждой группы выбираем случайный вариант
    for (const [orderIndex, variants] of grouped) {
      if (variants.length > 0) {
        const randomIndex = Math.floor(Math.random() * variants.length);
        tasks.push(variants[randomIndex]);
      }
    }
    
    // Сортируем по order_index
    tasks.sort((a, b) => a.order_index - b.order_index);
  }

  if (tasksError) {
    console.error("Error loading tasks:", tasksError);
  }

  // Получаем прогресс пользователя для урока
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Если урок еще не начат, создаем запись о прогрессе
  if (!progress) {
    await supabase.from("user_progress").insert({
      user_id: user.id,
      lesson_id: lessonId,
      status: "in_progress",
    });
  }

  return (
    <LessonDetails
      module={module}
      lesson={lesson}
      tasks={tasks || []}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
    />
  );
}

