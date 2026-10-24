import { type NextRequest, NextResponse } from "next/server";
import { hasSuccessfulAttempt, listSuccessfulAttemptsForTask } from "@/lib/appwrite/attempts";
import { recomputeModuleProgress } from "@/lib/appwrite/progress";
import { getTask } from "@/lib/appwrite/tasks";
import { addXp } from "@/lib/appwrite/users";
import { checkAndAwardAchievements } from "@/lib/utils/achievements";
import { getAuthContext } from "@/lib/utils/auth";
import { calculateXP, type XPCalculationParams } from "@/lib/utils/xp-calculation";

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = context.user.$id;
    const body = await request.json();
    const { taskId, attemptNumber, usedAiHint, executionTime, isFirstAttempt } = body;

    if (!taskId || !attemptNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await getTask(String(taskId));
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Server-side protection: do not award XP twice for the same task.
    const alreadySuccessful = await hasSuccessfulAttempt(userId, task.id);

    if (alreadySuccessful && !isFirstAttempt) {
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

    // Average execution time of successful attempts (for the speed bonus).
    const successfulAttempts = await listSuccessfulAttemptsForTask(task.id);
    const times = successfulAttempts
      .map((attempt) => attempt.execution_time_ms)
      .filter((value): value is number => typeof value === "number");

    const averageExecutionTime =
      times.length > 0 ? times.reduce((sum, value) => sum + value, 0) / times.length : undefined;

    const xpParams: XPCalculationParams = {
      baseXP: task.xp_reward || 0,
      difficulty: task.difficulty,
      attemptNumber,
      usedAiHint: usedAiHint || false,
      isFirstAttempt: isFirstAttempt || false,
      executionTime,
      averageExecutionTime,
    };

    const xpCalculation = calculateXP(xpParams);
    const updated = await addXp(userId, xpCalculation.totalXP);

    if (task.module_id) {
      await recomputeModuleProgress(userId, task.module_id);
    }

    const newlyUnlockedAchievements = await checkAndAwardAchievements(userId, {
      taskId: task.id,
      moduleId: task.module_id,
      completedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      xpAwarded: xpCalculation.totalXP,
      newTotalXP: updated.total_xp,
      newLevel: updated.current_level,
      calculation: xpCalculation,
      newlyUnlockedAchievements: newlyUnlockedAchievements.map((achievement) => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon_name: achievement.icon_name,
        xp_reward: achievement.xp_reward,
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
