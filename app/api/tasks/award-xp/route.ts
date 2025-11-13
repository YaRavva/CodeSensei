import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateXP, type XPCalculationParams } from "@/lib/utils/xp-calculation";
import { checkAndAwardAchievements } from "@/lib/utils/achievements";

async function updateUserProgress(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, moduleId: string) {
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
      const { error: insertError } = await (supabase.from("user_progress") as any).insert({
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

    const typedModuleTasks = (moduleTasks || []) as Array<{ id: string }>;

    if (typedModuleTasks.length === 0) {
      // Если в модуле нет задач, считаем его завершенным
      await (supabase
        .from("user_progress") as any)
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
      .in("task_id", typedModuleTasks.map(t => t.id));

    if (completedTasksError) {
      throw new Error(`Error fetching completed tasks: ${completedTasksError.message}`);
    }

    const typedCompletedTasks = (completedTasks || []) as Array<{ task_id: string }>;
    const completedTaskIds = new Set(typedCompletedTasks.map(t => t.task_id));

    if (completedTaskIds.size === typedModuleTasks.length) {
      const { error: updateError } = await (supabase
        .from("user_progress") as any)
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

    const typedTask = task as { xp_reward: number | null; difficulty: "easy" | "medium" | "hard"; module_id: string };

    // СЕРВЕРНАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Проверяем, была ли уже успешная попытка для этого задания
    // Если задание уже было успешно выполнено, не начисляем XP повторно
    const { data: existingSuccessfulAttempts, error: checkError } = await supabase
      .from("task_attempts")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .eq("is_successful", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (checkError) {
      console.error("Error checking existing attempts:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing attempts" },
        { status: 500 }
      );
    }

    // Если уже есть успешная попытка и это не первая попытка (isFirstAttempt = false),
    // то не начисляем XP повторно
    const hasExistingSuccessfulAttempt = existingSuccessfulAttempts && existingSuccessfulAttempts.length > 0;
    if (hasExistingSuccessfulAttempt && !isFirstAttempt) {
      // Возвращаем успешный ответ, но с xpAwarded = 0
      return NextResponse.json({
        success: true,
        xpAwarded: 0,
        alreadyCompleted: true,
        message: "Задание уже было успешно выполнено ранее. XP не начисляется повторно.",
        newTotalXP: null,
        newLevel: null,
        calculation: null,
        newlyUnlockedAchievements: [],
      });
    }

    // Получаем среднее время выполнения для этой задачи (для бонуса скорости)
    const { data: avgExecutionData } = await supabase
      .from("task_attempts")
      .select("execution_time_ms")
      .eq("task_id", taskId)
      .eq("is_successful", true)
      .not("execution_time_ms", "is", null);

    const typedAvgExecutionData = (avgExecutionData || []) as Array<{ execution_time_ms: number | null }>;
    const averageExecutionTime =
      typedAvgExecutionData.length > 0
        ? typedAvgExecutionData.reduce(
            (sum, a) => sum + (a.execution_time_ms || 0),
            0
          ) / typedAvgExecutionData.length
        : undefined;

    // Параметры для расчета XP
    const xpParams: XPCalculationParams = {
      baseXP: typedTask.xp_reward || 0,
      difficulty: typedTask.difficulty,
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

    const typedCurrentUser = currentUser as { total_xp: number | null; current_level: number | null };
    const newTotalXP = (typedCurrentUser.total_xp || 0) + xpCalculation.totalXP;

    // Рассчитываем новый уровень с помощью RPC функции
    const { data: calculatedLevel, error: levelError } = await (supabase.rpc as any)(
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
    const { data: updatedUser, error: xpError } = await (supabase
      .from("users") as any)
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

    const typedUpdatedUser = updatedUser as { total_xp: number | null; current_level: number | null } | null;
    const finalLevel = typedUpdatedUser?.current_level || newLevelValue || typedCurrentUser.current_level || 1;

    // Обновляем прогресс пользователя по модулю
    if (typedTask.module_id) {
      await updateUserProgress(supabase, user.id, typedTask.module_id);
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

