"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { calculateLevelProgress } from "@/lib/utils/levels";
import { isValidRussianName, getNameValidationError } from "@/lib/utils/name-validation";
import { useState, useEffect } from "react";
import { AchievementsList } from "@/components/achievements/achievements-list";
import { useAuth } from "@/components/auth/auth-provider";
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

interface ProfileContentProps {
  user: User;
  initialProfile: UserProfile;
}

export function ProfileContent({ user, initialProfile }: ProfileContentProps) {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(initialProfile.display_name || "");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Используем актуальный профиль из AuthProvider, если он доступен
  const currentProfile = profile || initialProfile;

  // Обновляем displayName когда профиль меняется
  useEffect(() => {
    if (currentProfile.display_name) {
      setDisplayName(currentProfile.display_name);
    }
  }, [currentProfile.display_name]);

  // Используем current_level из БД или рассчитываем, если его нет
  const currentLevel = currentProfile.current_level ?? calculateLevelProgress(currentProfile.total_xp ?? 0).currentLevel;

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

    const { error } = await (supabase
      .from("users") as any)
      .update({ display_name: trimmedName || null })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Профиль обновлен",
        description: "Изменения сохранены",
      });
      await refreshProfile();
    }

    setLoading(false);
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Управление вашим профилем</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentProfile.avatar_url ?? undefined} />
                <AvatarFallback className="text-3xl font-semibold">
                  {(() => {
                    // Инициалы берутся ТОЛЬКО из display_name (фамилия и имя)
                    if (currentProfile.display_name) {
                      const trimmed = String(currentProfile.display_name).trim();
                      if (trimmed) {
                        const parts = trimmed.split(/\s+/).filter(Boolean);
                        if (parts.length >= 2) {
                          // Есть фамилия и имя - берем первые буквы
                          const firstInitial = parts[0][0] ?? "";
                          const secondInitial = parts[1][0] ?? "";
                          return `${firstInitial}${secondInitial}`.toUpperCase();
                        }
                        // Если только одно слово - берем первые две буквы
                        if (parts.length === 1 && parts[0].length >= 2) {
                          return parts[0].substring(0, 2).toUpperCase();
                        }
                        // Если только одна буква
                        if (parts.length === 1 && parts[0].length === 1) {
                          return parts[0].toUpperCase();
                        }
                      }
                    }
                    // Если нет display_name - возвращаем заглушку
                    return "U";
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{currentProfile.display_name || currentProfile.email}</h2>
                <Badge variant="secondary">Уровень {currentLevel}</Badge>
                <p className="text-sm text-muted-foreground mt-1">{currentProfile.total_xp ?? 0} XP</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={currentProfile.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Полное имя</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (nameError) {
                      setNameError(null);
                    }
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
                  <p id="name-error" className="text-sm text-destructive">
                    {nameError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Укажите минимум 2 слова (например: Иван Петров)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Input value={currentProfile.role} disabled />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <AchievementsList userId={user.id} />
      </div>
    </div>
  );
}

