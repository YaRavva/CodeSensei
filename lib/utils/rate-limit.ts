import { countGenerationsToday, logGeneration } from "@/lib/appwrite/ai-logs";

const MAX_GENERATIONS_PER_DAY = 50;

/**
 * Checks the daily AI generation quota for a user.
 */
export async function checkRateLimit(
  userId: string,
  generationType: "module" | "task"
): Promise<{ canGenerate: boolean; remaining: number; error?: string }> {
  try {
    const used = await countGenerationsToday(userId, generationType);
    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - used);

    return {
      canGenerate: remaining > 0,
      remaining,
      error:
        remaining === 0
          ? `Достигнут дневной лимит генераций (${MAX_GENERATIONS_PER_DAY}/день)`
          : undefined,
    };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return {
      canGenerate: false,
      remaining: 0,
      error: "Ошибка при проверке лимита",
    };
  }
}

/** Records one AI generation in the daily log. */
export async function recordGeneration(
  userId: string,
  generationType: "module" | "task"
): Promise<void> {
  await logGeneration(userId, generationType);
}

export { logGeneration };
