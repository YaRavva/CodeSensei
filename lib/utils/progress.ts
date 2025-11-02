import { createClient } from "@/lib/supabase/server";
import { calculateXP, type XPCalculationParams } from "./xp-calculation";

/**
 * Начисляет XP и обновляет прогресс пользователя при успешном выполнении задания
 */
export async function awardXPAndUpdateProgress(
  userId: string,
  taskId: string,
  lessonId: string,
  params: XPCalculationParams
) {
  const supabase = await createClient();

  // Рассчитываем XP
  const xpCalculation = calculateXP(params);

  // Получаем информацию о задании и уроке
  const { data: task } = await supabase
    .from("tasks")
    .select("xp_reward, difficulty")
    .eq("id", taskId)
    .single();

  // Получаем текущие попытки пользователя для этого задания
  const { data: attempts, count: attemptsCount } = await supabase
    .from("task_attempts")
    .select("id, is_successful, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  const successfulAttempts = attempts?.filter((a) => a.is_successful) || [];
  const isFirstSuccessfulAttempt = successfulAttempts.length === 1;

  // Обновляем total_xp пользователя
  const { data: user } = await supabase
    .from("users")
    .select("total_xp, current_level")
    .eq("id", userId)
    .single();

  if (!user) {
    throw new Error("User not found");
  }

  const newTotalXP = (user.total_xp || 0) + xpCalculation.totalXP;

  // Обновляем total_xp (триггер в БД обновит уровень автоматически)
  const { error: xpError } = await supabase
    .from("users")
    .update({ total_xp: newTotalXP })
    .eq("id", userId);

  if (xpError) {
    throw new Error(`Failed to update user XP: ${xpError.message}`);
  }

  // Обновляем или создаем прогресс урока
  const { data: existingProgress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingProgress) {
    // Обновляем существующий прогресс
    const newXP = (existingProgress.xp_earned || 0) + xpCalculation.totalXP;
    const newAttemptsCount = (existingProgress.attempts_count || 0) + 1;

    const updateData: any = {
      xp_earned: newXP,
      attempts_count: newAttemptsCount,
      last_attempt_at: now,
      updated_at: now,
    };

    // Если это первое успешное выполнение задания в уроке, обновляем статус
    if (isFirstSuccessfulAttempt) {
      // Проверяем, все ли задания урока выполнены
      const { data: lessonTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("lesson_id", lessonId);

      // Получаем все успешные попытки пользователя для этого урока
      const { data: userTaskAttempts } = await supabase
        .from("task_attempts")
        .select("task_id")
        .eq("user_id", userId)
        .eq("is_successful", true)
        .in(
          "task_id",
          lessonTasks?.map((t) => t.id) || []
        );

      // Уникальные выполненные задания
      const completedTaskIds = new Set(userTaskAttempts?.map((a) => a.task_id) || []);
      const allTaskIds = new Set(lessonTasks?.map((t) => t.id) || []);

      // Если все задания выполнены, отмечаем урок как завершенный
      if (allTaskIds.size > 0 && completedTaskIds.size === allTaskIds.size) {
        updateData.status = "completed";
        if (!existingProgress.first_completed_at) {
          updateData.first_completed_at = now;
        }
      } else {
        updateData.status = "in_progress";
      }
    }

    const { error: progressError } = await supabase
      .from("user_progress")
      .update(updateData)
      .eq("id", existingProgress.id);

    if (progressError) {
      console.error("Failed to update progress:", progressError);
      // Не бросаем ошибку, так как XP уже начислено
    }
  } else {
    // Создаем новый прогресс
    const { error: progressError } = await supabase.from("user_progress").insert({
      user_id: userId,
      lesson_id: lessonId,
      status: "in_progress",
      xp_earned: xpCalculation.totalXP,
      attempts_count: 1,
      last_attempt_at: now,
    });

    if (progressError) {
      console.error("Failed to create progress:", progressError);
      // Не бросаем ошибку, так как XP уже начислено
    }
  }

  return {
    xpAwarded: xpCalculation.totalXP,
    newTotalXP,
    calculation: xpCalculation,
  };
}

