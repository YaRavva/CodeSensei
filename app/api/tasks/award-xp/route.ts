import { type NextRequest, NextResponse } from "next/server";
import { recomputeModuleProgress } from "@/lib/appwrite/progress";
import { getTask } from "@/lib/appwrite/tasks";
import { checkAndAwardAchievements } from "@/lib/utils/achievements";
import { getAuthContext } from "@/lib/utils/auth";
import { awardTaskXp } from "@/lib/xp/award-task";

/**
 * Awards XP for a solved task. Only `taskId` is read from the request: attempt
 * number, hint usage and timing are taken from server-side data, and XP is
 * granted once per task (see lib/xp/award-task.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = context.user.$id;
    const body = (await request.json().catch(() => ({}))) as { taskId?: unknown };
    const taskId = body.taskId ? String(body.taskId) : "";

    if (!taskId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const result = await awardTaskXp(userId, task);

    if (result.status === "not_solved") {
      return NextResponse.json(
        { error: "Задание ещё не решено: нет успешной попытки" },
        { status: 409 }
      );
    }

    if (task.module_id) {
      await recomputeModuleProgress(userId, task.module_id);
    }

    if (result.status === "already_awarded") {
      return NextResponse.json({
        success: true,
        xpAwarded: 0,
        alreadyCompleted: true,
        message: "Задание уже было успешно выполнено ранее. XP не начисляется повторно.",
        newTotalXP: result.totalXp,
        newLevel: result.level,
        calculation: null,
        newlyUnlockedAchievements: [],
      });
    }

    const newlyUnlockedAchievements = await checkAndAwardAchievements(userId);

    return NextResponse.json({
      success: true,
      xpAwarded: result.xpAwarded,
      newTotalXP: result.totalXp,
      newLevel: result.level,
      calculation: result.calculation,
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
    return NextResponse.json({ error: "Не удалось начислить XP" }, { status: 500 });
  }
}
