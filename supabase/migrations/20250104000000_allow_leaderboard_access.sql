-- Политика для таблицы лидеров: все авторизованные пользователи могут читать данные других пользователей
-- Это необходимо для отображения таблицы лидеров всем зарегистрированным пользователям

-- Включаем RLS для таблицы users, если еще не включен
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Authenticated users can view users for leaderboard" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Политика 1: Пользователи могут видеть свой собственный профиль
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Политика 2: Все авторизованные пользователи могут читать данные других пользователей для таблицы лидеров
-- Ограничиваем только пользователями с ролями student и admin (для таблицы лидеров)
CREATE POLICY "Authenticated users can view users for leaderboard"
ON public.users FOR SELECT
TO authenticated
USING (
  -- Разрешаем читать данные пользователей с ролями student и admin
  role IN ('student', 'admin')
);

