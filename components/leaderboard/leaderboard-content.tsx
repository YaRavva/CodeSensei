"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type LeaderboardPeriod = "all_time" | "month" | "week";

interface LeaderboardUser {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_xp: number | null;
  current_level: number | null;
  role: string;
  rank: number;
}

interface LeaderboardContentProps {
  users: LeaderboardUser[];
  currentUserId: string;
  currentUserRank: number | null;
  currentUserData: LeaderboardUser | null;
  period: LeaderboardPeriod;
}

export function LeaderboardContent({
  users,
  currentUserId,
  currentUserRank,
  currentUserData,
  period,
}: LeaderboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePeriodChange(newPeriod: LeaderboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", newPeriod);
    router.push(`/leaderboard?${params.toString()}`);
  }

  function getRankIcon(rank: number, role?: string) {
    // Корона для админов
    if (role === "admin") {
      return <Crown className="h-5 w-5 text-yellow-500" />;
    }
    // Золотая медаль за первое место
    if (rank === 1) {
      return <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />;
    }
    // Серебряная медаль за второе место
    if (rank === 2) {
      return <Medal className="h-5 w-5 text-gray-400 fill-gray-400" />;
    }
    // Бронзовая медаль за третье место
    if (rank === 3) {
      return <Award className="h-5 w-5 text-amber-600 fill-amber-600" />;
    }
    return null;
  }

  function getUserDisplayName(user: LeaderboardUser) {
    return user.display_name || user.email?.split("@")[0] || "Без имени";
  }

  function getUserInitials(user: LeaderboardUser) {
    const name = getUserDisplayName(user);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Таблица лидеров</h1>
            <p className="text-muted-foreground">
              Топ игроков по количеству опыта
            </p>
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">Все время</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="week">За неделю</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Информация о текущем пользователе */}
        {(currentUserRank || currentUserData) && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Ваша позиция</CardTitle>
            </CardHeader>
            <CardContent>
              {currentUserRank && currentUserRank <= users.length ? (
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">#{currentUserRank}</div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {getUserDisplayName(users[currentUserRank - 1])}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {users[currentUserRank - 1].total_xp || 0} XP • Уровень{" "}
                      {users[currentUserRank - 1].current_level || 1}
                    </p>
                  </div>
                </div>
              ) : currentUserData ? (
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">#{currentUserData.rank}</div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {getUserDisplayName(currentUserData)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentUserData.total_xp || 0} XP • Уровень{" "}
                      {currentUserData.current_level || 1}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Таблица лидеров */}
      <Card>
        <CardHeader>
          <CardTitle>Рейтинг</CardTitle>
          <CardDescription>
            {period === "all_time"
              ? "За все время"
              : period === "month"
                ? "За последний месяц"
                : "За последнюю неделю"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных для отображения
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      isCurrentUser
                        ? "bg-primary/10 border-primary/30 shadow-md"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Ранг */}
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(user.rank, user.role) || (
                        <span
                          className={`text-lg font-bold ${
                            user.rank <= 10
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {user.rank}
                        </span>
                      )}
                    </div>

                    {/* Аватар */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>

                    {/* Имя и информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium truncate ${
                            isCurrentUser ? "font-semibold" : ""
                          }`}
                        >
                          {getUserDisplayName(user)}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="default" className="text-xs">
                            Вы
                          </Badge>
                        )}
                        {user.role === "admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Админ
                          </Badge>
                        )}
                        {user.rank <= 3 && user.role !== "admin" && (
                          <Badge variant="outline" className="text-xs">
                            Топ {user.rank}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          Уровень {user.current_level || 1}
                        </Badge>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {user.total_xp?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

