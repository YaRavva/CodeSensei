import { LeaderboardContent } from "@/components/leaderboard/leaderboard-content";
import { getAchievementsForUsers } from "@/lib/appwrite/achievements";
import { listLeaderboardUsers } from "@/lib/appwrite/users";
import { requireAuth } from "@/lib/utils/auth";

type LeaderboardPeriod = "all_time" | "month" | "week";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: LeaderboardPeriod }>;
}) {
  const { user } = await requireAuth();
  const params = await searchParams;
  const period: LeaderboardPeriod = params.period || "all_time";

  // "month"/"week" currently show the overall rating: XP history is not stored.
  const users = await listLeaderboardUsers();

  const usersWithRank: Array<(typeof users)[number] & { rank: number }> = [];
  let currentRank = 1;
  let previousXP: number | null = null;

  for (const leaderboardUser of users) {
    const currentXP = leaderboardUser.total_xp || 0;

    if (previousXP !== null && currentXP !== previousXP) {
      currentRank = usersWithRank.length + 1;
    }

    usersWithRank.push({ ...leaderboardUser, rank: currentRank });
    previousXP = currentXP;
  }

  const achievementsByUser = await getAchievementsForUsers(
    usersWithRank.map((leaderboardUser) => leaderboardUser.id)
  );

  const userInList = usersWithRank.find((leaderboardUser) => leaderboardUser.id === user.$id);
  const currentUserRank = userInList ? userInList.rank : null;
  const currentUserData = userInList ?? null;

  return (
    <LeaderboardContent
      users={usersWithRank}
      currentUserId={user.$id}
      currentUserRank={currentUserRank || currentUserData?.rank || null}
      currentUserData={currentUserData}
      period={period}
      userAchievementsByUserId={achievementsByUser}
    />
  );
}
