import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateXP, type XPCalculationParams } from "@/lib/utils/xp-calculation";
import { checkAndAwardAchievements } from "@/lib/utils/achievements";

async function updateUserProgress(supabase: ReturnType<typeof createClient>, userId: string, moduleId: string) {
  try {
    // 1. Получаем текущий прогресс
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("module_id", moduleId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      throw new Error(`Error fetching user progress: ${progressError.message}`);
    }

    // 2. Если прогресса нет, создаем запись
    if (!progress) {
      const { error: insertError } = await supabase.from("user_progress").insert({
        user_id: userId,
        module_id: moduleId,
        status: "in_progress",
      });
      if (insertError) {
        throw new Error(`Error creating user progress: ${insertError.message}`);
      }
    }

    // 3. Проверяем, все ли задачи в модуле выполнены
    const { data: moduleTasks, error: moduleTasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("module_id", moduleId);

    if (moduleTasksError) {
      throw new Error(`Error fetching module tasks: ${moduleTasksError.message}`);
    }

    if (!moduleTasks || moduleTasks.length === 0) {
      // Если в модуле нет задач, считаем его завершенным
      await supabase
        .from("user_progress")
        .update({ status: "completed" })
        .eq("user_id", userId)
        .eq("module_id", moduleId);
      return;
    }

    const { data: completedTasks, error: completedTasksError } = await supabase
      .from("task_attempts")
      .select("task_id")
      .eq("user_id", userId)
      .eq("is_successful", true)
      .in("task_id", moduleTasks.map(t => t.id));

    if (completedTasksError) {
      throw new Error(`Error fetching completed tasks: ${completedTasksError.message}`);
    }

    const completedTaskIds = new Set(completedTasks.map(t => t.task_id));

    if (completedTaskIds.size === moduleTasks.length) {
      const { error: updateError } = await supabase
        .from("user_progress")
        .update({ status: "completed" })
        .eq("user_id", userId)
        .eq("module_id", moduleId);
      if (updateError) {
        throw new Error(`Error updating user progress: ${updateError.message}`);
      }
    }
  } catch (error) {
    console.error("Error in updateUserProgress:", error);
    // Не бросаем ошибку дальше, чтобы не прерывать основной поток,
    // но логируем ее для отладки.
  }
}

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
    const { taskId, attemptNumber, usedAiHint, executionTime, isFirstAttempt } = body;

    if (!taskId || !attemptNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Получаем информацию о задании, включая module_id
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("xp_reward, difficulty, module_id") // Добавляем module_id
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

    // Обновляем прогресс пользователя по модулю
    if (task.module_id) {
      await updateUserProgress(supabase, user.id, task.module_id);
    }

    // Проверяем и начисляем достижения
    const newlyUnlockedAchievements = await checkAndAwardAchievements(supabase, user.id, {
      taskId,
      completedAt: new Date(),
    } as any);

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

