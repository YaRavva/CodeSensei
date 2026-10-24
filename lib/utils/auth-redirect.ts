import { redirect } from "next/navigation";
import type { UserProfile } from "@/types/db";
import { isValidRussianName } from "./name-validation";

/**
 * Redirects to /profile when the display name does not match the required format.
 */
export function checkNameAndRedirect(profile: UserProfile | null): boolean {
  if (!isValidRussianName(profile?.display_name)) {
    redirect("/profile");
  }

  return true;
}

/**
 * Chooses the landing route after authentication based on name validity.
 */
export function getPostAuthRedirect(profile: UserProfile | null): string {
  if (!isValidRussianName(profile?.display_name)) {
    return "/profile";
  }

  return "/modules";
}
