import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { LeaderboardContent } from "@/components/leaderboard/leaderboard-content";
import type { Database } from "@/types/supabase";

type LeaderboardPeriod = "all_time" | "month" | "week";

type User = Database["public"]["Tables"]["users"]["Row"];

interface LeaderboardUser extends Pick<
  User,
  "id" | "display_name" | "email" | "avatar_url" | "total_xp" | "current_level" | "role"
> {
  rank: number;
}

interface LeaderboardAchievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: LeaderboardPeriod }>;
}) {
  const { user } = await requireAuth();
  const params = await searchParams;
  const period: LeaderboardPeriod = params.period || "all_time";
  const supabase = await createClient();

  // Для периодов "месяц" и "неделя" пока используем общий рейтинг
  // В будущем можно добавить таблицу с историей изменений XP для точной фильтрации
  
  // Загружаем пользователей с сортировкой по XP (студенты и админы)
  const query = supabase
    .from("users")
    .select("id, display_name, email, avatar_url, total_xp, current_level, role, last_active_at")
    .in("role", ["student", "admin"]) // Студенты и админы в таблице лидеров
    .order("total_xp", { ascending: false })
    .limit(100); // Лимит для начала

  const { data: users, error } = await query;

  if (error) {
    console.error("Error loading leaderboard:", error);
  }

  // Вычисляем ранги (учитывая одинаковый XP - пользователи с одинаковым XP имеют одинаковый ранг)
  const usersWithRank: Array<LeaderboardUser & { last_active_at?: string | null }> = [];
  let currentRank = 1;
  let previousXP: number | null = null;
  
  users?.forEach((u: any) => {
    const currentXP = u.total_xp || 0;
    
    // Если XP отличается от предыдущего, увеличиваем ранг
    if (previousXP !== null && currentXP !== previousXP) {
      currentRank = usersWithRank.length + 1;
    }
    
    usersWithRank.push({
      ...u,
      rank: currentRank,
    });
    
    previousXP = currentXP;
  });

  // Загружаем достижения для пользователей в таблице лидеров
  const achievementsByUser: Record<string, LeaderboardAchievement[]> = {};
  if (usersWithRank.length > 0) {
    const userIds = usersWithRank.map((u) => u.id);
    const { data: rawUserAchievements, error: achievementsError } = await supabase
      .from("user_achievements")
      .select(
        `
        user_id,
        earned_at,
        achievement:achievements(id, title, description, icon_name)
      `,
      )
      .in("user_id", userIds);

    if (achievementsError) {
      console.error("Error loading leaderboard achievements:", achievementsError);
    }

    const typed = (rawUserAchievements || []) as Array<{
      user_id: string;
      earned_at: string | null;
      achievement: {
        id: string;
        title: string;
        description: string;
        icon_name: string | null;
      } | null;
    }>;

    for (const row of typed) {
      if (!row.achievement) continue;
      const list = achievementsByUser[row.user_id] || (achievementsByUser[row.user_id] = []);
      list.push({
        id: row.achievement.id,
        title: row.achievement.title,
        description: row.achievement.description,
        icon_name: row.achievement.icon_name || "🏆",
      });
    }
  }

  // Находим ранг текущего пользователя в списке
  const userInList = usersWithRank.find((u) => u.id === user.id);
  const currentUserRank = userInList ? userInList.rank : null;

  // Если текущий пользователь не в топе, загружаем его данные
  let currentUserData = null;
  if (currentUserRank === 0 || !currentUserRank) {
    const { data: currentUser } = await supabase
      .from("users")
      .select("id, display_name, email, avatar_url, total_xp, current_level, role")
      .eq("id", user.id)
      .single();

    if (currentUser) {
      const typedCurrentUser = currentUser as User;
      // Подсчитываем ранг текущего пользователя (студенты и админы)
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("role", ["student", "admin"])
        .gt("total_xp", typedCurrentUser.total_xp || 0);

      // Подсчитываем точный ранг (учитывая пользователей с таким же XP)
      const { data: usersWithSameXp } = await supabase
        .from("users")
        .select("id")
        .in("role", ["student", "admin"])
        .eq("total_xp", typedCurrentUser.total_xp || 0);

      const usersWithMoreXp = count || 0;
      const rank = usersWithMoreXp + 1;

      currentUserData = {
        ...typedCurrentUser,
        rank,
      };
    }
  }

  return (
    <LeaderboardContent
      users={usersWithRank}
      currentUserId={user.id}
      currentUserRank={currentUserRank || currentUserData?.rank || null}
      currentUserData={currentUserData}
      period={period}
      userAchievementsByUserId={achievementsByUser}
    />
  );
}

