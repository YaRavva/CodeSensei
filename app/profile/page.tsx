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

  const levelProgress = calculateLevelProgress(profile.total_xp ?? 0);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("users")
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
                <AvatarFallback>
                  {profile.display_name?.[0]?.toUpperCase() ??
                    profile.email?.[0]?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.display_name || profile.email}</h2>
                <Badge variant="secondary">Уровень {levelProgress.currentLevel}</Badge>
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
      </div>
    </div>
  );
}
