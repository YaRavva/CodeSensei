import { createClient } from "@/lib/supabase/server";

const MAX_GENERATIONS_PER_DAY = 50;

/**
 * Проверяет, не превышен ли лимит генераций для пользователя
 * @param userId ID пользователя
 * @param generationType Тип генерации ('module' | 'task')
 * @returns {canGenerate: boolean, remaining: number, error?: string}
 */
export async function checkRateLimit(
  userId: string,
  generationType: "module" | "task"
): Promise<{ canGenerate: boolean; remaining: number; error?: string }> {
  const supabase = await createClient();

  // Подсчитываем количество генераций за сегодня
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const { count, error } = await supabase
    .from("ai_generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("generation_type", generationType)
    .eq("created_date", todayStr);

  if (error) {
    console.error("Error checking rate limit:", error);
    return {
      canGenerate: false,
      remaining: 0,
      error: "Ошибка при проверке лимита",
    };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - used);

  return {
    canGenerate: remaining > 0,
    remaining,
    error: remaining === 0 ? `Достигнут дневной лимит генераций (${MAX_GENERATIONS_PER_DAY}/день)` : undefined,
  };
}

/**
 * Записывает факт генерации в лог
 * @param userId ID пользователя
 * @param generationType Тип генерации ('module' | 'task')
 */
export async function logGeneration(
  userId: string,
  generationType: "module" | "task"
): Promise<void> {
  const supabase = await createClient();

  const { error } = await (supabase
    .from("ai_generation_logs") as any)
    .insert(
      {
        user_id: userId,
        generation_type: generationType,
      },
      {
        onConflict: "user_id,generation_type,created_date",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error("Error logging generation:", error);
    // Не бросаем ошибку, так как это не критично
  }
}

