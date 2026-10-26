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
import { useState } from "react";

/**
 * Реестр lucide-иконок, сопоставимый с icon_name в БД.
 * Новые достижения хранят имена компонентов lucide (см. scripts/appwrite/seed.mjs),
 * legacy-данные (мигрированные с Supabase) - строки с эмодзи.
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

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/**
 * Превращает эмодзи в имя SVG-файла Twemoji.
 * Возвращает null, если строка не содержит эмодзи (например, "Award").
 */
function emojiToCodepoints(value: string): string | null {
  if (!PICTOGRAPHIC.test(value)) return null;

  const codes: string[] = [];
  for (const char of value) {
    const code = char.codePointAt(0);
    // Variation selector-16 не входит в имена файлов Twemoji.
    if (code !== undefined && code !== 0xfe0f) {
      codes.push(code.toString(16));
    }
  }

  return codes.length > 0 ? codes.join("-") : null;
}

interface AchievementIconProps {
  icon: string;
  /** Классы для эмодзи/текста (размер шрифта). */
  textClass?: string;
  /** Классы для lucide-иконки или Twemoji-картинки (размер box'а). */
  iconClass?: string;
  /** Фолбэк при пустом или нераспознанном значении. */
  fallback?: string;
}

export function AchievementIcon({
  icon,
  textClass = "text-3xl",
  iconClass = "h-7 w-7",
  fallback = "🏆",
}: AchievementIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = icon?.trim();

  if (!name) {
    return <span className={textClass}>{fallback}</span>;
  }

  const LucideIcon = ICON_MAP[name];
  if (LucideIcon) {
    return <LucideIcon className={iconClass} />;
  }

  const codepoints = emojiToCodepoints(name);
  if (!codepoints) {
    return <span className={textClass}>{fallback}</span>;
  }

  // Если CDN недоступен, показываем нативный эмодзи вместо пустого места.
  if (imageFailed) {
    return <span className={textClass}>{name}</span>;
  }

  const twemojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;

  return (
    // biome-ignore lint/performance/noImgElement: Twemoji SVG с CDN; next/image потребовал бы remotePatterns
    <img
      src={twemojiUrl}
      alt={name}
      className={`select-none object-contain ${iconClass}`}
      onError={() => setImageFailed(true)}
    />
  );
}
