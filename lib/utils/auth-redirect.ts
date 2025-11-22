import { redirect } from "next/navigation";
import { isValidRussianName } from "./name-validation";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

/**
 * Проверяет валидность имени пользователя и редиректит на /profile, если имя невалидно
 * @param profile Профиль пользователя
 * @returns true если имя валидно, false если нужно редиректить (редирект уже выполнен)
 */
export function checkNameAndRedirect(profile: UserProfile | null): boolean {
  if (!isValidRussianName(profile?.display_name)) {
    redirect("/profile");
  }
  return true;
}

/**
 * Определяет целевой маршрут после аутентификации на основе валидности имени
 * @param profile Профиль пользователя
 * @returns Маршрут для редиректа
 */
export function getPostAuthRedirect(profile: UserProfile | null): string {
  if (!isValidRussianName(profile?.display_name)) {
    return "/profile";
  }
  return "/modules";
}

