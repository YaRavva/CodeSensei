import { requireAuth } from "@/lib/utils/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getUserAchievements } from "@/lib/utils/achievements";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export default async function DashboardPage() {
  const { user, profile, supabase } = await requireAuth();
  const typedProfile = profile as UserProfile | null;

  // Получаем статистику пользователя
  const { data: progressData } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id);

  const { data: attemptsData } = await supabase
    .from("task_attempts")
    .select("is_successful, execution_time_ms, created_at")
    .eq("user_id", user.id);

  // Подсчитываем статистику
  const completedLessons = progressData?.filter((p: any) => p.status === "completed").length ?? 0;
  const successfulAttempts = attemptsData?.filter((a: any) => a.is_successful).length ?? 0;
  const totalAttempts = attemptsData?.length ?? 0;
  const avgExecutionTime =
    attemptsData && attemptsData.length > 0
      ? Math.round(
          attemptsData.reduce((sum, a: any) => sum + (a.execution_time_ms ?? 0), 0) /
            attemptsData.length
        )
      : 0;

  const achievements = await getUserAchievements(supabase, user.id);

  return (
    <DashboardContent
      profile={typedProfile}
      stats={{
        totalXp: typedProfile?.total_xp ?? 0,
        currentLevel: typedProfile?.current_level ?? 1,
        completedLessons,
        successfulAttempts,
        totalAttempts,
        avgExecutionTime,
      }}
      achievements={achievements}
    />
  );
}

