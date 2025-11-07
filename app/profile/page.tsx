"use client";

import { useAuth } from "@/components/auth/auth-provider";
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

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const supabase = createClient();

  // Обновляем displayName когда профиль загружается
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  // Повторная попытка загрузки профиля, если он не загрузился
  useEffect(() => {
    if (user && !profile && !authLoading && retryCount < 3) {
      const timer = setTimeout(async () => {
        console.log(`Retrying profile load, attempt ${retryCount + 1}`);
        await refreshProfile();
        setRetryCount((prev) => prev + 1);
      }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой
      
      return () => clearTimeout(timer);
    }
  }, [user, profile, authLoading, retryCount, refreshProfile]);

  // Показываем загрузку, если пользователь или профиль не загружены
  if (authLoading || !user || !profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <p>Загрузка...</p>
          {user && !profile && retryCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Загрузка профиля... (попытка {retryCount + 1}/3)
            </p>
          )}
        </div>
      </div>
    );
  }

  // Используем current_level из БД или рассчитываем, если его нет
  const currentLevel = profile.current_level ?? calculateLevelProgress(profile.total_xp ?? 0).currentLevel;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Валидация имени
    const trimmedName = displayName.trim();
    if (!isValidRussianName(trimmedName)) {
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
      .update({
        display_name: trimmedName || null,
      })
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
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-3xl font-semibold">
                  {(() => {
                    // Инициалы берутся ТОЛЬКО из display_name (фамилия и имя)
                    if (profile.display_name) {
                      const trimmed = String(profile.display_name).trim();
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
                <h2 className="text-2xl font-bold">{profile.display_name || profile.email}</h2>
                <Badge variant="secondary">Уровень {currentLevel}</Badge>
                <p className="text-sm text-muted-foreground mt-1">{profile.total_xp ?? 0} XP</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Имя *</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    // Очищаем ошибку при вводе
                    if (nameError) {
                      setNameError(null);
                    }
                  }}
                  onBlur={() => {
                    // Проверяем валидность при потере фокуса
                    const trimmed = displayName.trim();
                    if (trimmed && !isValidRussianName(trimmed)) {
                      setNameError(getNameValidationError(trimmed));
                    } else {
                      setNameError(null);
                    }
                  }}
                  disabled={loading}
                  placeholder="Иванов Иван"
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
                  Имя должно быть в формате "Фамилия Имя" на русском языке (например: Иванов Иван)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Input value={profile.role} disabled />
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
