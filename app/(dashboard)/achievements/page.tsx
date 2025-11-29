import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import type { Database } from "@/types/supabase";

type Achievement = Database["public"]["Tables"]["achievements"]["Row"];

type UserAchievementRow = {
  achievement: Achievement | null;
  earned_at: string | null;
};

export default async function AchievementsPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  // Получаем все достижения
  const { data: allAchievements, error: allError } = await supabase
    .from("achievements")
    .select("*")
    .order("created_at", { ascending: true });

  if (allError) {
    console.error("Error loading achievements:", allError);
  }

  const typedAll: Achievement[] = (allAchievements || []) as Achievement[];

  // Получаем достижения пользователя, чтобы отметить полученные
  const { data: userAchievements, error: userError } = await supabase
    .from("user_achievements")
    .select(
      `
      earned_at,
      achievement:achievements(*)
    `
    )
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  if (userError) {
    console.error("Error loading user achievements:", userError);
  }

  const typedUser: UserAchievementRow[] = (userAchievements || []) as UserAchievementRow[];
  const earnedMap = new Map<string, string>();
  for (const row of typedUser) {
    if (row.achievement?.id && row.earned_at) {
      // Сохраняем только первую (самую раннюю/позднюю) дату получения для наглядности
      if (!earnedMap.has(row.achievement.id)) {
        earnedMap.set(row.achievement.id, row.earned_at);
      }
    }
  }

  const merged = typedAll.map((a) => ({
    ...a,
    earned_at: earnedMap.get(a.id) ?? null,
  }));

  const totalCount = merged.length;
  const earnedCount = merged.filter((a) => a.earned_at).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-6 py-5 shadow-sm backdrop-blur">
          <h1 className="text-3xl font-bold">Достижения</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Здесь собраны все возможные достижения в CodeSensei. Получайте их, решая задания,
            проходя модули и занимаясь регулярно.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Коллекция достижений</CardTitle>
            <CardDescription>
              Получено: {earnedCount} из {totalCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-2">
              <Progress
                value={totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {earnedCount === 0
                    ? "Начните с первого достижения — попробуйте решить одно задание."
                    : earnedCount < totalCount
                      ? "Отличное начало! Продолжайте открывать новые достижения."
                      : "Вы собрали все достижения — впечатляющий результат!"}
                </span>
                <span>
                  {totalCount > 0 ? `${Math.round((earnedCount / totalCount) * 100)}%` : "0%"}
                </span>
              </div>
            </div>
            {merged.length === 0 ? (
              <p className="text-muted-foreground">
                Достижения пока не настроены. Добавьте записи в таблицу "achievements" в Supabase.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {merged.map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    showDescription
                    size="md"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
