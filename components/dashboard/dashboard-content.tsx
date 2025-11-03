"use client";

import { calculateLevelProgress } from "@/lib/utils/levels";
import type { Database } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AchievementsList } from "@/components/achievements/achievements-list";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];
type UserAchievementView = Database["public"]["Tables"]["achievements"]["Row"] & {
  earned_at: string;
};

interface DashboardStats {
  totalXp: number;
  currentLevel: number;
  completedLessons: number;
  successfulAttempts: number;
  totalAttempts: number;
  avgExecutionTime: number;
}

interface DashboardContentProps {
  profile: UserProfile | null;
  stats: DashboardStats;
  achievements?: UserAchievementView[];
}

export function DashboardContent({ profile, stats, achievements }: DashboardContentProps) {
  const levelProgress = calculateLevelProgress(stats.totalXp);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Личный кабинет</h1>
        <p className="text-muted-foreground">
          Добро пожаловать, {profile?.display_name || profile?.email || "Пользователь"}!
        </p>
      </div>

      {/* Основная статистика */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Уровень</CardTitle>
            <Badge variant="secondary">Level {stats.currentLevel}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentLevel}</div>
            <p className="text-xs text-muted-foreground">
              {levelProgress.xpInCurrentLevel} / {levelProgress.xpNeededForNext} XP до следующего
              уровня
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего XP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalXp}</div>
            <p className="text-xs text-muted-foreground">Очки опыта</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Решенных задач</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successfulAttempts}</div>
            <p className="text-xs text-muted-foreground">
              из {stats.totalAttempts} попыток
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершенных уроков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedLessons}</div>
            <p className="text-xs text-muted-foreground">уроков завершено</p>
          </CardContent>
        </Card>
      </div>

      {/* Прогресс до следующего уровня */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Прогресс до уровня {stats.currentLevel + 1}</CardTitle>
          <CardDescription>
            Текущий уровень: {stats.currentLevel} • XP: {stats.totalXp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс</span>
              <span>{Math.round(levelProgress.progress)}%</span>
            </div>
            <Progress value={levelProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Осталось {levelProgress.xpNeededForNext - levelProgress.xpInCurrentLevel} XP до
              уровня {stats.currentLevel + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Дополнительная статистика и достижения */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Статистика решений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Всего попыток:</span>
              <span className="font-medium">{stats.totalAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Успешных решений:</span>
              <span className="font-medium">{stats.successfulAttempts}</span>
            </div>
            {stats.totalAttempts > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Процент успеха:</span>
                <span className="font-medium">
                  {Math.round((stats.successfulAttempts / stats.totalAttempts) * 100)}%
                </span>
              </div>
            )}
            {stats.avgExecutionTime > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Среднее время решения:</span>
                <span className="font-medium">{stats.avgExecutionTime} мс</span>
              </div>
            )}
          </CardContent>
        </Card>
        {profile && (
          <AchievementsList userId={profile.id} initialAchievements={achievements ?? []} />
        )}
      </div>
    </div>
  );
}

