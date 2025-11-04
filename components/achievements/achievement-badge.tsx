"use client";

import { Badge } from "@/components/ui/badge";

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

interface AchievementBadgeProps {
  achievement: Achievement & { earned_at?: string | null };
  showDescription?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({
  achievement,
  showDescription = false,
  size = "md",
}: AchievementBadgeProps) {
  const sizeMap = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  const iconSizeClass = sizeMap[size];

  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant={achievement.earned_at ? "default" : "outline"}
        className={`flex items-center justify-center gap-1.5 ${size === "lg" ? "px-3 py-1.5" : size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"}`}
      >
        <span className={iconSizeClass}>{achievement.icon_name || "🏆"}</span>
        <span className={`text-center ${size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"}`}>
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

