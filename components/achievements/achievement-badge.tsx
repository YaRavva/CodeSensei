"use client";

import * as Icons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/supabase";

type Achievement = Database["public"]["Tables"]["achievements"]["Row"];

interface AchievementBadgeProps {
  achievement: Achievement & { earned_at?: string | null };
  showDescription?: boolean;
  size?: "sm" | "md" | "lg";
}

// Динамически получаем иконку по имени
function getIcon(iconName: string, size: number = 20) {
  const IconComponent = (Icons as any)[iconName as keyof typeof Icons];
  if (!IconComponent) {
    // Fallback иконка
    const Trophy = Icons.Trophy;
    return <Trophy className={`h-${size} w-${size}`} />;
  }
  return <IconComponent className={`h-${size} w-${size}`} />;
}

export function AchievementBadge({
  achievement,
  showDescription = false,
  size = "md",
}: AchievementBadgeProps) {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const iconSize = sizeMap[size];

  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant={achievement.earned_at ? "default" : "outline"}
        className={`flex items-center gap-1.5 ${size === "lg" ? "px-3 py-1.5" : size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"}`}
      >
        {getIcon(achievement.icon_name, iconSize)}
        <span className={size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"}>
          {achievement.title}
        </span>
        {achievement.earned_at && (
          <span className="text-xs opacity-70">✓</span>
        )}
      </Badge>
      {showDescription && (
        <div className="text-xs text-muted-foreground">
          <p>{achievement.description}</p>
          {achievement.xp_reward > 0 && (
            <p className="mt-0.5">Награда: {achievement.xp_reward} XP</p>
          )}
          {achievement.earned_at && (
            <p className="mt-0.5">
              Получено: {new Date(achievement.earned_at).toLocaleDateString("ru-RU")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

