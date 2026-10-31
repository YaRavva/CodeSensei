"use client";

import { Badge } from "@/components/ui/badge";

type Difficulty = "easy" | "medium" | "hard";

interface DifficultyBadgeProps {
  difficulty: Difficulty | string;
  showLabel?: boolean;
  showXP?: boolean;
  className?: string;
}

const difficultyConfig: Record<
  Difficulty,
  { label: string; xp: number; tone: string }
> = {
  easy: {
    label: "Легкое",
    xp: 10,
    tone:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15",
  },
  medium: {
    label: "Среднее",
    xp: 20,
    tone:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15",
  },
  hard: {
    label: "Сложное",
    xp: 30,
    tone:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15",
  },
};

export function DifficultyBadge({
  difficulty,
  showLabel = true,
  showXP = false,
  className,
}: DifficultyBadgeProps) {
  const config =
    difficultyConfig[difficulty as Difficulty] || difficultyConfig.easy;

  return (
    <Badge
      variant="outline"
      className={`${config.tone} ${className || ""}`}
    >
      {showLabel && config.label}
      {showLabel && showXP && " · "}
      {showXP && `+${config.xp} XP`}
    </Badge>
  );
}

export function getDifficultyLabel(difficulty: string): string {
  return difficultyConfig[difficulty as Difficulty]?.label || difficulty;
}

export function getDifficultyXP(difficulty: string): number {
  return difficultyConfig[difficulty as Difficulty]?.xp || 10;
}
