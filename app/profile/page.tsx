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
import { useState } from "react";
import { AchievementsList } from "@/components/achievements/achievements-list";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <p>Загрузка...</p>
      </div>
    );
  }

  // Используем current_level из БД или рассчитываем, если его нет
  const currentLevel = profile.current_level ?? calculateLevelProgress(profile.total_xp ?? 0).currentLevel;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await (supabase
      .from("users") as any)
      .update({
        display_name: displayName || null,
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
                <Label htmlFor="displayName">Имя</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
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
