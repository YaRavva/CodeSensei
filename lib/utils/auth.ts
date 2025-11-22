import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

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

  return { user, profile: (profile as UserProfile | null) ?? null, supabase };
}

/**
 * Проверяет, является ли пользователь админом или учителем
 */
export async function requireAdmin() {
  const { user, profile: profileData, supabase } = await requireAuth();

  // Проверяем роль пользователя
  if (!profileData) {
    redirect("/login");
  }

  // Явно приводим тип профиля для TypeScript
  const profile = profileData as UserProfile;
  const role: string = profile.role;
  
  if (role !== "admin" && role !== "teacher") {
    // Редиректим на главную страницу, если нет прав доступа
    redirect("/modules");
  }

  return { user, profile, supabase };
}
