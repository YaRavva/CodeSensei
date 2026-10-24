"use client";

import { useEffect, useState } from "react";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Achievement, UserAchievement } from "@/types/db";

export function AchievementsList({
  initialAchievements = [],
}: {
  initialAchievements?: Array<Achievement & { earned_at: string }>;
}) {
  const [achievements, setAchievements] =
    useState<Array<Achievement & { earned_at: string }>>(initialAchievements);

  useEffect(() => {
    if (initialAchievements.length > 0) return;

    let mounted = true;

    async function loadAchievements() {
      try {
        const response = await fetch("/api/achievements", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as {
          achievements: Achievement[];
          earned: UserAchievement[];
        };

        const earnedAt = new Map(data.earned.map((item) => [item.achievement_id, item.earned_at]));
        const merged = data.achievements
          .filter((achievement) => earnedAt.has(achievement.id))
          .map((achievement) => ({
            ...achievement,
            earned_at: earnedAt.get(achievement.id) as string,
          }));

        if (mounted) setAchievements(merged);
      } catch (error) {
        console.error("Error loading achievements:", error);
        if (mounted) setAchievements([]);
      }
    }

    loadAchievements();

    return () => {
      mounted = false;
    };
  }, []);
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
        <CardDescription>Всего достижений: {achievements.length}</CardDescription>
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
