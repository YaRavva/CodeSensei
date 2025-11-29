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
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  } as const;

  const iconSizeClass = sizeMap[size];
  const isEarned = Boolean(achievement.earned_at);
  const xp = achievement.xp_reward ?? 0;

  const iconWrapperSize =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-12 w-12" : "h-14 w-14";
  const titleSize =
    size === "lg" ? "text-base" : size === "sm" ? "text-sm" : "text-sm";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
        isEarned
          ? "border-primary/60 bg-gradient-to-b from-primary/10 via-background/90 to-background shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)]"
          : "border-border/70 bg-card/70 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.9)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.35),_transparent_60%)]" />
      </div>

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center rounded-2xl ${iconWrapperSize} bg-gradient-to-br ${
                isEarned
                  ? "from-primary/80 via-primary/70 to-primary/90 text-primary-foreground shadow-lg"
                  : "from-muted/50 via-muted/20 to-background text-muted-foreground"
              }`}
            >
              <span className={`${iconSizeClass} drop-shadow-sm`}>
                {achievement.icon_name || "🏆"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold leading-tight ${titleSize}`}>
                  {achievement.title}
                </h3>
                {isEarned && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
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
              className="border-primary/50 bg-primary/10 text-[11px] font-medium text-primary"
            >
              +{xp} XP
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-primary/60" />
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

