import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateXP, type XPCalculationParams } from "@/lib/utils/xp-calculation";
import { checkAndAwardAchievements } from "@/lib/utils/achievements";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskId,
      lessonId,
      attemptNumber,
      usedAiHint,
      executionTime,
      isFirstAttempt,
    } = body;

    if (!taskId || !lessonId || !attemptNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Получаем информацию о задании
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("xp_reward, difficulty")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Получаем среднее время выполнения для этой задачи (для бонуса скорости)
    const { data: avgExecutionData } = await supabase
      .from("task_attempts")
      .select("execution_time_ms")
      .eq("task_id", taskId)
      .eq("is_successful", true)
      .not("execution_time_ms", "is", null);

    const averageExecutionTime =
      avgExecutionData && avgExecutionData.length > 0
        ? avgExecutionData.reduce(
            (sum, a) => sum + (a.execution_time_ms || 0),
            0
          ) / avgExecutionData.length
        : undefined;

    // Параметры для расчета XP
    const xpParams: XPCalculationParams = {
      baseXP: task.xp_reward || 0,
      difficulty: task.difficulty as "easy" | "medium" | "hard",
      attemptNumber,
      usedAiHint: usedAiHint || false,
      isFirstAttempt: isFirstAttempt || false,
      executionTime,
      averageExecutionTime,
    };

    // Рассчитываем XP
    const xpCalculation = calculateXP(xpParams);

    // Обновляем total_xp пользователя
    const { data: currentUser } = await supabase
      .from("users")
      .select("total_xp, current_level")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newTotalXP = (currentUser.total_xp || 0) + xpCalculation.totalXP;

    // Рассчитываем новый уровень с помощью RPC функции
    const { data: calculatedLevel, error: levelError } = await supabase.rpc(
      "calculate_user_level",
      {
        total_xp: newTotalXP,
      }
    );

    if (levelError) {
      console.error("Failed to calculate level:", levelError);
    }

    const newLevelValue =
      typeof calculatedLevel === "number" ? calculatedLevel : null;

    // Обновляем total_xp и уровень
    const { data: updatedUser, error: xpError } = await supabase
      .from("users")
      .update({
        total_xp: newTotalXP,
        current_level: newLevelValue,
      })
      .select("total_xp, current_level")
      .eq("id", user.id)
      .single();

    if (xpError) {
      console.error("Failed to update user XP:", xpError);
      return NextResponse.json(
        { error: "Failed to update XP" },
        { status: 500 }
      );
    }

    const finalLevel = updatedUser.current_level || newLevelValue || currentUser.current_level || 1;

    // Обновляем или создаем прогресс урока
    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
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

      // Если это первое успешное выполнение, проверяем, завершен ли урок
      if (isFirstAttempt) {
        // Проверяем, все ли задания урока выполнены
        const { data: lessonTasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("lesson_id", lessonId);

        if (lessonTasks && lessonTasks.length > 0) {
          // Получаем все успешные попытки пользователя для этого урока
          const { data: userTaskAttempts } = await supabase
            .from("task_attempts")
            .select("task_id")
            .eq("user_id", user.id)
            .eq("is_successful", true)
            .in(
              "task_id",
              lessonTasks.map((t) => t.id)
            );

          // Уникальные выполненные задания
          const completedTaskIds = new Set(
            userTaskAttempts?.map((a) => a.task_id) || []
          );
          const allTaskIds = new Set(lessonTasks.map((t) => t.id));

          // Если все задания выполнены, отмечаем урок как завершенный
          if (completedTaskIds.size === allTaskIds.size) {
            updateData.status = "completed";
            if (!existingProgress.first_completed_at) {
              updateData.first_completed_at = now;
            }
          } else {
            updateData.status = "in_progress";
          }
        }
      }

      await supabase
        .from("user_progress")
        .update(updateData)
        .eq("id", existingProgress.id);
    } else {
      // Создаем новый прогресс
      await supabase.from("user_progress").insert({
        user_id: user.id,
        lesson_id: lessonId,
        status: "in_progress",
        xp_earned: xpCalculation.totalXP,
        attempts_count: 1,
        last_attempt_at: now,
      });
    }

    // Проверяем и начисляем достижения
    const newlyUnlockedAchievements = await checkAndAwardAchievements(
      supabase,
      user.id,
      {
        taskId,
        lessonId,
        completedAt: new Date(),
      }
    );

    return NextResponse.json({
      success: true,
      xpAwarded: xpCalculation.totalXP,
      newTotalXP,
      newLevel: finalLevel,
      calculation: xpCalculation,
      newlyUnlockedAchievements: newlyUnlockedAchievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon_name: a.icon_name,
        xp_reward: a.xp_reward,
      })),
    });
  } catch (error) {
    console.error("Error awarding XP:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

