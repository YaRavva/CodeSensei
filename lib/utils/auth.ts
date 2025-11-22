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
  const { user, profile, supabase } = await requireAuth();

  // Проверяем роль пользователя
  if (!profile) {
    redirect("/login");
  }

  const role = profile.role;
  if (role !== "admin" && role !== "teacher") {
    // Редиректим на главную страницу, если нет прав доступа
    redirect("/modules");
  }

  return { user, profile, supabase };
}
