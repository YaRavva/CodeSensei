import { createClient } from "@/lib/supabase/server";
import { calculateXP, type XPCalculationParams } from "./xp-calculation";

/**
 * Начисляет XP и обновляет прогресс пользователя при успешном выполнении задания
 * @deprecated Используйте логику из /api/tasks/award-xp/route.ts, которая работает с модулями
 */
export async function awardXPAndUpdateProgress(
  userId: string,
  taskId: string,
  moduleId: string,
  params: XPCalculationParams
) {
  const supabase = await createClient();

  // Рассчитываем XP
  const xpCalculation = calculateXP(params);

  // Получаем информацию о задании и модуле
  const { data: task } = await supabase
    .from("tasks")
    .select("xp_reward, difficulty, module_id")
    .eq("id", taskId)
    .single();

  // Получаем текущие попытки пользователя для этого задания
  const { data: attempts, count: attemptsCount } = await supabase
    .from("task_attempts")
    .select("id, is_successful, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  const typedAttempts = (attempts || []) as Array<{ is_successful: boolean }>;
  const successfulAttempts = typedAttempts.filter((a) => a.is_successful);
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

  const typedUser = user as { total_xp: number | null; current_level: number | null };
  const newTotalXP = (typedUser.total_xp || 0) + xpCalculation.totalXP;

  // Обновляем total_xp (триггер в БД обновит уровень автоматически)
  const { error: xpError } = await (supabase
    .from("users") as any)
    .update({ total_xp: newTotalXP })
    .eq("id", userId);

  if (xpError) {
    throw new Error(`Failed to update user XP: ${xpError.message}`);
  }

  // Обновляем или создаем прогресс модуля
  const { data: existingProgress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();

  const now = new Date().toISOString();

  const typedExistingProgress = existingProgress as {
    xp_earned: number;
    attempts_count: number;
    status: string;
    [key: string]: any;
  } | null;

  if (typedExistingProgress) {
    // Обновляем существующий прогресс
    const newXP = (typedExistingProgress.xp_earned || 0) + xpCalculation.totalXP;
    const newAttemptsCount = (typedExistingProgress.attempts_count || 0) + 1;

    const updateData: any = {
      xp_earned: newXP,
      attempts_count: newAttemptsCount,
      last_attempt_at: now,
      updated_at: now,
    };

    // Если это первое успешное выполнение задания в модуле, обновляем статус
    if (isFirstSuccessfulAttempt) {
      // Проверяем, все ли задания модуля выполнены
      const { data: moduleTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("module_id", moduleId);

      const typedModuleTasks = (moduleTasks || []) as Array<{ id: string }>;

      // Получаем все успешные попытки пользователя для этого модуля
      const { data: userTaskAttempts } = await supabase
        .from("task_attempts")
        .select("task_id")
        .eq("user_id", userId)
        .eq("is_successful", true)
        .in(
          "task_id",
          typedModuleTasks.map((t) => t.id)
        );

      const typedUserTaskAttempts = (userTaskAttempts || []) as Array<{ task_id: string }>;
      // Уникальные выполненные задания
      const completedTaskIds = new Set(typedUserTaskAttempts.map((a) => a.task_id));
      const allTaskIds = new Set(typedModuleTasks.map((t) => t.id));

      // Если все задания выполнены, отмечаем модуль как завершенный
      if (allTaskIds.size > 0 && completedTaskIds.size === allTaskIds.size) {
        updateData.status = "completed";
        if (!typedExistingProgress.first_completed_at) {
          updateData.first_completed_at = now;
        }
      } else {
        updateData.status = "in_progress";
      }
    }

    const { error: progressError } = await (supabase
      .from("user_progress") as any)
      .update(updateData)
      .eq("id", typedExistingProgress.id);

    if (progressError) {
      console.error("Failed to update progress:", progressError);
      // Не бросаем ошибку, так как XP уже начислено
    }
  } else {
    // Создаем новый прогресс
    const { error: progressError } = await (supabase.from("user_progress") as any).insert({
      user_id: userId,
      module_id: moduleId,
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

