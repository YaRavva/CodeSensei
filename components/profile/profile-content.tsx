"use client";

import { useEffect, useState } from "react";
import { AchievementsList } from "@/components/achievements/achievements-list";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { calculateLevelProgress } from "@/lib/utils/levels";
import { getNameValidationError, isValidRussianName } from "@/lib/utils/name-validation";
import type { UserProfile } from "@/types/db";

interface ProfileContentProps {
  initialProfile: UserProfile;
}

export function ProfileContent({ initialProfile }: ProfileContentProps) {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(initialProfile.display_name || "");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const { toast } = useToast();

  const currentProfile = profile || initialProfile;

  useEffect(() => {
    if (currentProfile.display_name) {
      setDisplayName(currentProfile.display_name);
    }
  }, [currentProfile.display_name]);

  const currentLevel =
    currentProfile.current_level ??
    calculateLevelProgress(currentProfile.total_xp ?? 0).currentLevel;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (trimmedName && !isValidRussianName(trimmedName)) {
      const errorMessage = getNameValidationError(trimmedName);
      setNameError(errorMessage);
      toast({
        title: "Ошибка валидации",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setNameError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ display_name: trimmedName }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Не удалось обновить профиль");
      }

      toast({
        title: "Профиль обновлен",
        description: "Изменения сохранены",
      });
      await refreshProfile();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить профиль",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 items-start lg:grid-cols-[1fr,2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Управление вашим аккаунтом</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 rounded-2xl border bg-muted/30 p-4">
              <Avatar className="h-16 w-16 rounded-full shrink-0 ring-2 ring-primary/20">
                <AvatarImage src={currentProfile.avatar_url ?? undefined} className="rounded-full object-cover" />
                <AvatarFallback className="rounded-full text-2xl font-semibold bg-primary/10 text-primary">
                  {(() => {
                    if (currentProfile.display_name) {
                      const trimmed = String(currentProfile.display_name).trim();
                      if (trimmed) {
                        const parts = trimmed.split(/\s+/).filter(Boolean);
                        if (parts.length >= 2) {
                          return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
                        }
                        if (parts.length === 1 && parts[0].length >= 2) {
                          return parts[0].substring(0, 2).toUpperCase();
                        }
                        if (parts.length === 1 && parts[0].length === 1) {
                          return parts[0].toUpperCase();
                        }
                      }
                    }
                    return "U";
                  })()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold truncate">
                  {currentProfile.display_name || currentProfile.email}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="whitespace-nowrap">Уровень {currentLevel}</Badge>
                  <span className="text-xs font-semibold text-primary">{currentProfile.total_xp ?? 0} XP</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={currentProfile.email ?? ""} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Роль</Label>
                  <Input value={currentProfile.role} disabled className="bg-muted/50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Полное имя</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onBlur={() => {
                    const trimmed = displayName.trim();
                    if (trimmed && !isValidRussianName(trimmed)) {
                      setNameError(getNameValidationError(trimmed));
                    } else {
                      setNameError(null);
                    }
                  }}
                  disabled={loading}
                  placeholder="Иван Петров или John Doe"
                  className={nameError ? "border-destructive" : ""}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <p id="name-error" className="text-xs text-destructive">
                    {nameError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Укажите минимум 2 слова (например: Иван Петров)
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <AchievementsList />
      </div>
    </div>
  );
}
