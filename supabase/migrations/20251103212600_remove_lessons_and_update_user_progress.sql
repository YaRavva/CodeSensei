-- Удаляем зависимую политику
DROP POLICY IF EXISTS "Students can view published tasks" ON public.tasks;

-- Обновляем таблицу user_progress
ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_lesson_id_fkey;
ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_lesson_id_key;
ALTER TABLE public.user_progress DROP COLUMN IF EXISTS lesson_id;
ALTER TABLE public.user_progress ADD COLUMN module_id UUID REFERENCES public.modules(id);
ALTER TABLE public.user_progress ADD UNIQUE (user_id, module_id);

-- Удаляем таблицу lessons
DROP TABLE IF EXISTS public.lessons;

-- Создаем новую политику, которая проверяет опубликован ли модуль
CREATE POLICY "Students can view published tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  (SELECT is_published FROM public.modules WHERE id = tasks.module_id) = true
);
