"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserAchievements } from "@/lib/utils/achievements";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
type Achievement = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  xp_reward: number;
  condition_type: string;
  condition_value: any;
  is_active: boolean;
  created_at: string;
};

export function AchievementsList({
  userId,
  initialAchievements = [],
}: {
  userId: string;
  initialAchievements?: Array<Achievement & { earned_at: string }>;
}) {
  const [achievements, setAchievements] = useState<
    Array<Achievement & { earned_at: string }>
  >(initialAchievements);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const userAchievements = await getUserAchievements(supabase, userId);
        setAchievements(userAchievements);
      } catch (error) {
        console.error("Error loading achievements:", error);
        setAchievements([]);
      }
    }
    if (initialAchievements.length === 0) {
      loadAchievements();
    }
  }, [userId, supabase, initialAchievements.length]);

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
          Всего достижений: {achievements.length}
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

