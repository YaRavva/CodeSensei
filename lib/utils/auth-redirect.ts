import { redirect } from "next/navigation";
import { requiresNameFix } from "@/lib/ai/name-checker";
import type { UserProfile } from "@/types/db";

/**
 * Перенаправляет на страницу профиля, если имя ученика не соответствует
 * требованиям и его нужно скорректировать.
 */
export function checkNameAndRedirect(profile: UserProfile | null): boolean {
  if (profile && requiresNameFix(profile)) {
    redirect("/profile");
  }

  return true;
}

/**
 * Выбирает страницу после входа: профиль, если имя нужно исправить,
 * иначе список модулей.
 */
export function getPostAuthRedirect(profile: UserProfile | null): string {
  if (profile && requiresNameFix(profile)) {
    return "/profile";
  }

  return "/modules";
}
