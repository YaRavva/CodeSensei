/**
 * Получает правильный базовый URL для приложения
 * Приоритет:
 * 1. NEXT_PUBLIC_SITE_URL (переменная окружения) — всегда используйте это в продакшене!
 * 2. window.location.origin (если это обычный/кастомный домен)
 * 3. Известный production-домен для Vercel deployment URL
 */
export function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || "";
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  const hostname = window.location.hostname;
  const isDeploymentUrl = /^[a-z0-9-]+-[a-f0-9]{8,}-[a-z0-9-]+\.vercel\.app$/i.test(hostname);

  if (!isDeploymentUrl) {
    return window.location.origin;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️ NEXT_PUBLIC_SITE_URL не установлен!\n" +
        "Установите переменную окружения:\n" +
        "NEXT_PUBLIC_SITE_URL=https://code-sensei-three.vercel.app\n\n" +
        "Используется fallback на production-домен."
    );
  }

  return "https://code-sensei-three.vercel.app";
}
