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

  return { user, supabase };
}

/**
 * Проверяет, является ли пользователь админом или учителем
 */
export async function requireAdmin() {
  const { user, supabase } = await requireAuth();

  // Используем RPC функцию для получения роли (обходит RLS)
  const { data: roleResult, error: roleError } = await supabase.rpc("get_user_role", {
    user_id: user.id,
  });

  let userRole: string | null = null;

  // RPC функция возвращает строку напрямую
  if (!roleError && roleResult !== null && roleResult !== undefined) {
    userRole = typeof roleResult === "string" ? roleResult : String(roleResult);
    console.log("Role from RPC:", userRole);
  } else {
    console.error("RPC role error:", roleError);
  }

  // Если RPC не сработала, пытаемся получить только роль через прямой запрос
  if (!userRole) {
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error("Failed to get user role from direct query:", profileError);
      redirect("/");
    }

    userRole = profileData.role;
    console.log("Role from direct query:", userRole);
  }

  // Проверяем роль
  if (!userRole || (userRole !== "admin" && userRole !== "teacher")) {
    console.error("Access denied. User role:", userRole);
    redirect("/");
  }

  // Получаем полный профиль для возврата (используем maybeSingle, чтобы не было ошибки, если не найдено)
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Если не удалось получить полный профиль, создаем минимальный объект профиля
  if (!profile) {
    return {
      user,
      profile: {
        id: user.id,
        email: user.email ?? null,
        role: userRole,
        display_name: null,
        avatar_url: null,
        total_xp: 0,
        current_level: 1,
        created_at: new Date().toISOString(),
        last_active_at: null,
      },
      supabase,
    };
  }

  return { user, profile, supabase };
}
