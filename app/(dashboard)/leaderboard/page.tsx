import { LeaderboardContent } from "@/components/leaderboard/leaderboard-content";
import { getAchievementsForUsers } from "@/lib/appwrite/achievements";
import { getLeaderboard, type LeaderboardPeriod, PERIOD_RATING_SINCE } from "@/lib/stats/user-stats";
import { requireAuth } from "@/lib/utils/auth";

const PERIODS: LeaderboardPeriod[] = ["all_time", "month", "week"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { user, profile } = await requireAuth();
  const params = await searchParams;
  const period: LeaderboardPeriod = PERIODS.includes(params.period as LeaderboardPeriod)
    ? (params.period as LeaderboardPeriod)
    : "all_time";

  const users = await getLeaderboard(period);
  const achievementsByUser = await getAchievementsForUsers(users.map((entry) => entry.id));
  const currentUserData = users.find((entry) => entry.id === user.$id) ?? null;

  return (
    <LeaderboardContent
      users={users}
      currentUserId={user.$id}
      currentUserRank={currentUserData?.rank ?? null}
      currentUserData={currentUserData}
      period={period}
      periodSince={PERIOD_RATING_SINCE}
      isRanked={profile.role === "student"}
      userAchievementsByUserId={achievementsByUser}
    />
  );
}
