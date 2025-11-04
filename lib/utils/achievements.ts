import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
type Achievement = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  xp_reward: number;
  condition_type: string;
  condition_value: any;
  is_active: boolean;
  created_at: string;
};
type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
};

interface AchievementCheckResult {
  achievement: Achievement;
  unlocked: boolean;
}

/**
 * Проверяет все достижения для пользователя и начисляет новые
 */
export async function checkAndAwardAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
  context?: {
    taskId?: string;
    lessonId?: string;
    completedAt?: Date;
  }
): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];

  // Получаем все активные достижения
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .eq("is_active", true);

  if (achievementsError || !achievements) {
    console.error("Error fetching achievements:", achievementsError);
    return newlyUnlocked;
  }

  const typedAchievements = (achievements || []) as Achievement[];

  // Получаем уже полученные достижения пользователя
  const { data: userAchievements, error: userAchievementsError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (userAchievementsError) {
    console.error("Error fetching user achievements:", userAchievementsError);
    return newlyUnlocked;
  }

  const typedUserAchievements = (userAchievements || []) as UserAchievement[];
  const earnedAchievementIds = new Set(
    typedUserAchievements.map((ua) => ua.achievement_id)
  );

  // Проверяем каждое достижение
  for (const achievement of typedAchievements) {
    // Пропускаем уже полученные
    if (earnedAchievementIds.has(achievement.id)) {
      continue;
    }

    // Проверяем условие достижения
    const isUnlocked = await checkAchievementCondition(
      supabase,
      userId,
      achievement,
      context
    );

    if (isUnlocked) {
      // Начисляем достижение
      const { error: insertError } = await (supabase
        .from("user_achievements") as any)
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(
          `Error awarding achievement ${achievement.id}:`,
          insertError
        );
      } else {
        // Начисляем XP за достижение
        if (achievement.xp_reward > 0) {
          const { data: user } = await supabase
            .from("users")
            .select("total_xp, current_level")
            .eq("id", userId)
            .single();

          if (user) {
            const typedUser = user as { total_xp: number | null; current_level: number | null };
            const newTotalXP = (typedUser.total_xp || 0) + achievement.xp_reward;
            
            // Рассчитываем новый уровень с помощью RPC функции
            const { data: calculatedLevel } = await (supabase.rpc as any)(
              "calculate_user_level",
              {
                total_xp: newTotalXP,
              }
            );

            const newLevelValue =
              typeof calculatedLevel === "number" ? calculatedLevel : null;

            await (supabase
              .from("users") as any)
              .update({
                total_xp: newTotalXP,
                current_level: newLevelValue || typedUser.current_level || 1,
              })
              .eq("id", userId);
          }
        }

        newlyUnlocked.push(achievement);
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Проверяет условие конкретного достижения
 */
async function checkAchievementCondition(
  supabase: SupabaseClient<Database>,
  userId: string,
  achievement: Achievement,
  context?: {
    taskId?: string;
    lessonId?: string;
    completedAt?: Date;
  }
): Promise<boolean> {
  const conditionType = achievement.condition_type;
  const conditionValue = achievement.condition_value as any;

  switch (conditionType) {
    case "task_count": {
      // Проверяем общее количество успешно выполненных задач
      const requiredCount = conditionValue?.count || 0;
      const { count } = await supabase
        .from("task_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_successful", true);
      return (count || 0) >= requiredCount;
    }

    case "time_based_tasks": {
      // Проверяем задачи по времени суток
      const requiredCount = conditionValue?.count || 0;
      const timeRange = conditionValue?.time_range;
      if (!timeRange) return false;

      const startHour = timeRange.start || 0;
      const endHour = timeRange.end || 24;

      // Получаем все успешные попытки
      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .eq("is_successful", true);

      if (!attempts) return false;

      const typedAttempts = attempts as Array<{ created_at: string }>;
      let matchingCount = 0;
      for (const attempt of typedAttempts) {
        if (!attempt.created_at) continue;
        const attemptDate = new Date(attempt.created_at);
        const hour = attemptDate.getHours();

        // Проверяем диапазон времени
        if (startHour < endHour) {
          // Обычный диапазон (например, 9-22)
          if (hour >= startHour && hour < endHour) {
            matchingCount++;
          }
        } else {
          // Диапазон через полночь (например, 22-9, что означает 22:00-08:59)
          if (hour >= startHour || hour < endHour) {
            matchingCount++;
          }
        }
      }

      return matchingCount >= requiredCount;
    }

    case "streak_tasks": {
      // Проверяем серию подряд выполненных задач
      const requiredStreak = conditionValue?.count || 0;
      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .eq("is_successful", true)
        .order("created_at", { ascending: false });

      if (!attempts || attempts.length < requiredStreak) return false;

      // Сортируем по дате и проверяем последовательность
      // Упрощенная проверка: считаем последние N успешных попыток подряд
      // (более точная проверка потребует анализа промежутков между попытками)
      return attempts.length >= requiredStreak;
    }

    case "module_count": {
      // Проверяем количество завершенных модулей
      const requiredCount = conditionValue?.count || 0;
      const { count } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");
      return (count || 0) >= requiredCount;
    }

    case "streak_days": {
      // Проверяем серию дней подряд
      const requiredDays = conditionValue?.count || 0;
      // Упрощенная проверка - считаем дни с активностью
      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .eq("is_successful", true)
        .order("created_at", { ascending: false });

      if (!attempts || attempts.length === 0) return false;

      // Группируем по дням
      const daysSet = new Set<string>();
      const typedAttempts2 = (attempts || []) as Array<{ created_at: string }>;
      for (const attempt of typedAttempts2) {
        if (!attempt.created_at) continue;
        const date = new Date(attempt.created_at);
        const dayKey = date.toISOString().split("T")[0];
        daysSet.add(dayKey);
      }

      // Проверяем, есть ли последовательность из N дней подряд
      // (упрощенная версия - можно улучшить для точной проверки)
      return daysSet.size >= requiredDays;
    }

    case "first_day_tasks": {
      // Проверяем задачи в первый день
      const requiredCount = conditionValue?.count || 0;

      // Получаем дату регистрации пользователя
      const { data: user } = await supabase
        .from("users")
        .select("created_at")
        .eq("id", userId)
        .single();

      const typedUser2 = user as { created_at: string } | null;
      if (!typedUser2 || !typedUser2.created_at) return false;

      const registrationDate = new Date(typedUser2.created_at);
      const nextDay = new Date(registrationDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const { count } = await supabase
        .from("task_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_successful", true)
        .gte("created_at", registrationDate.toISOString())
        .lt("created_at", nextDay.toISOString());

      return (count || 0) >= requiredCount;
    }

    case "perfect_tasks": {
      // Задачи без ошибок (первая попытка успешная)
      const requiredCount = conditionValue?.count || 0;

      // Получаем все уникальные задачи пользователя
      const { data: allTasks } = await supabase
        .from("task_attempts")
        .select("task_id, created_at, is_successful")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!allTasks) return false;

      // Группируем по task_id и проверяем, была ли первая попытка успешной
      const typedAllTasks = (allTasks || []) as Array<{ task_id: string; is_successful: boolean }>;
      const taskMap = new Map<string, boolean>();
      for (const attempt of typedAllTasks) {
        if (!taskMap.has(attempt.task_id)) {
          taskMap.set(attempt.task_id, attempt.is_successful);
        }
      }

      let perfectCount = 0;
      for (const isPerfect of taskMap.values()) {
        if (isPerfect) perfectCount++;
      }

      return perfectCount >= requiredCount;
    }

    case "no_hints_tasks": {
      // Задачи без использования подсказок
      const requiredCount = conditionValue?.count || 0;
      const { count } = await supabase
        .from("task_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_successful", true)
        .eq("used_ai_hint", false);
      return (count || 0) >= requiredCount;
    }

    case "streak_perfect":
    case "streak_first_try": {
      // Упрощенная проверка серий (можно улучшить)
      const requiredStreak = conditionValue?.count || 0;
      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("created_at, is_successful")
        .eq("user_id", userId)
        .eq("is_successful", true)
        .order("created_at", { ascending: false });

      return attempts ? attempts.length >= requiredStreak : false;
    }

    default:
      console.warn(`Unknown achievement condition type: ${conditionType}`);
      return false;
  }
}

/**
 * Получает все достижения пользователя
 */
export async function getUserAchievements(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Array<Achievement & { earned_at: string }>> {
  const { data: userAchievements, error } = await supabase
    .from("user_achievements")
    .select(
      `
      earned_at,
      achievement:achievements(*)
    `
    )
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error || !userAchievements) {
    console.error("Error fetching user achievements:", error);
    return [];
  }

  return userAchievements.map((ua: any) => ({
    ...ua.achievement,
    earned_at: ua.earned_at,
  }));
}

