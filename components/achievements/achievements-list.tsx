"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserAchievements } from "@/lib/utils/achievements";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/supabase";

type Achievement = Database["public"]["Tables"]["achievements"]["Row"];

export function AchievementsList({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<
    Array<Achievement & { earned_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadAchievements() {
      setLoading(true);
      const userAchievements = await getUserAchievements(supabase, userId);
      setAchievements(userAchievements);
      setLoading(false);
    }
    loadAchievements();
  }, [userId, supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Достижения</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Достижения</CardTitle>
          <CardDescription>Вы пока не получили достижений</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Достижения</CardTitle>
        <CardDescription>
          У вас {achievements.length} {achievements.length === 1 ? "достижение" : "достижений"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              showDescription
              size="md"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

