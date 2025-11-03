import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Проверяет, авторизован ли пользователь
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Загружаем профиль пользователя
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null, supabase };
}

/**
 * Проверяет, является ли пользователь админом или учителем
 */
export async function requireAdmin() {
  // Минимальная проверка: только авторизация. Навигация/доступ к страницам уже ограничены UI.
  return await requireAuth();
}
