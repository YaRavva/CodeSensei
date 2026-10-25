import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { listAttemptsByUser } from "@/lib/appwrite/attempts";
import { listUserProgress } from "@/lib/appwrite/progress";
import { getUserAchievements } from "@/lib/utils/achievements";
import { requireAuth } from "@/lib/utils/auth";

export default async function DashboardPage() {
  const { user, profile } = await requireAuth();

  const [progress, attempts, achievements] = await Promise.all([
    listUserProgress(user.$id),
    listAttemptsByUser(user.$id),
    getUserAchievements(user.$id),
  ]);

  const completedLessons = progress.filter((item) => item.status === "completed").length;
  const successfulAttempts = attempts.filter((attempt) => attempt.is_successful).length;
  const totalAttempts = attempts.length;

  const avgExecutionTime =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, attempt) => sum + (attempt.execution_time_ms ?? 0), 0) /
            attempts.length
        )
      : 0;

  const attemptsWithSolvingTime = attempts.filter((attempt) => attempt.solving_time_ms != null);
  const avgSolvingTime =
    attemptsWithSolvingTime.length > 0
      ? Math.round(
          attemptsWithSolvingTime.reduce(
            (sum, attempt) => sum + (attempt.solving_time_ms ?? 0),
            0
          ) / attemptsWithSolvingTime.length
        )
      : 0;

  return (
    <DashboardContent
      profile={profile}
      stats={{
        totalXp: profile.total_xp,
        currentLevel: profile.current_level,
        completedLessons,
        successfulAttempts,
        totalAttempts,
        avgExecutionTime,
        avgSolvingTime,
      }}
      achievements={achievements}
    />
  );
}
