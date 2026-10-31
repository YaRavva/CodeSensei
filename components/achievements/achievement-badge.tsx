"use client";

import { AchievementIcon } from "@/components/achievements/achievement-icon";
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
  const isEarned = Boolean(achievement.earned_at);
  const xp = achievement.xp_reward ?? 0;

  const iconWrapperSize = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-12 w-12" : "h-14 w-14";
  const iconTextSize =
    size === "lg"
      ? "text-4xl drop-shadow-sm"
      : size === "sm"
        ? "text-2xl drop-shadow-sm"
        : "text-3xl drop-shadow-sm";
  const lucideSize = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const titleSize = size === "lg" ? "text-base" : size === "sm" ? "text-sm" : "text-sm";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
        isEarned
          ? "border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)]"
          : "border-border/70 bg-card/70 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.9)]"
      }`}
    >
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center rounded-2xl ${iconWrapperSize} ${
                isEarned ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <AchievementIcon
                icon={achievement.icon_name}
                textClass={iconTextSize}
                iconClass={lucideSize}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold leading-tight ${titleSize}`}>{achievement.title}</h3>
                {isEarned && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Открыто
                  </span>
                )}
              </div>
              {showDescription && (
                <p className="text-xs text-muted-foreground/90 line-clamp-3">
                  {achievement.description}
                </p>
              )}
            </div>
          </div>

          {xp > 0 && (
            <Badge
              variant="outline"
              className="border-primary/50 bg-primary/10 text-xs font-medium text-primary"
            >
              +{xp} XP
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isEarned ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            />
            {isEarned ? "Достижение получено" : "Ещё не получено"}
          </span>
          {achievement.earned_at && (
            <span className="opacity-80">
              {new Date(achievement.earned_at).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
