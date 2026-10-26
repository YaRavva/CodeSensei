"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookCheck,
  BookOpen,
  Brain,
  Crown,
  Flame,
  GraduationCap,
  Lightbulb,
  Medal,
  Moon,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

/**
 * Реестр lucide-иконок, сопоставимый с icon_name в БД.
 * Найм генерации достижений хранит имена компонентов (см. scripts/appwrite/seed.mjs),
 * а legacy-данные (мигрированные с Supabase) - строки с эмодзи.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookCheck,
  BookOpen,
  Brain,
  Crown,
  Flame,
  GraduationCap,
  Lightbulb,
  Medal,
  Moon,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Trophy,
  Zap,
};

const ASCII_ONLY = /^[\p{ASCII}]+$/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

function looksLikeEmoji(value: string): boolean {
  // Эмодзи (в том числе с variation selectors) - берём как есть,
  // мультисимвольные строки вроде "Award" в lucide-мапе не попали и латиницей написаны - фолбэк.
  return !ASCII_ONLY.test(value) || PICTOGRAPHIC.test(value);
}

interface AchievementIconProps {
  icon: string;
  /** Классы для отображения эмодзи/текста (размер шрифта). */
  textClass?: string;
  /** Классы для отображения lucide-иконки (размер box'а). */
  iconClass?: string;
  /** Фолбэк при пустом распознавании. */
  fallback?: string;
}

export function AchievementIcon({
  icon,
  textClass = "text-3xl",
  iconClass = "h-7 w-7",
  fallback = "🏆",
}: AchievementIconProps) {
  const name = icon?.trim();

  if (!name) {
    return <span className={textClass}>{fallback}</span>;
  }

  const LucideIcon = ICON_MAP[name];
  if (LucideIcon) {
    return <LucideIcon className={iconClass} />;
  }

  if (looksLikeEmoji(name)) {
    return <span className={textClass}>{name}</span>;
  }

  return <span className={textClass}>{fallback}</span>;
}
