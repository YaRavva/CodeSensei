/**
 * Получает правильный базовый URL для приложения
 * Приоритет:
 * 1. NEXT_PUBLIC_SITE_URL (переменная окружения) - ВСЕГДА используйте это в продакшене!
 * 2. Production домен из window.location (если это production домен, а не deployment URL)
 * 3. window.location.origin (fallback)
 */
export function getBaseUrl(): string {
  // В серверных компонентах используем переменную окружения
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || "";
  }

  // В клиентских компонентах
  // 1. Проверяем переменную окружения (ВСЕГДА приоритет!)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 2. Проверяем, является ли текущий домен production доменом
  const hostname = window.location.hostname;
  
  // Определяем, является ли это deployment URL Vercel
  // Deployment URL имеет паттерн: project-hash-account.vercel.app
  // Production domain обычно короче и не содержит случайных хешей
  // Примеры:
  // - code-sensei-frlfh8pkh-yaravvas-projects.vercel.app (deployment)
  // - code-sensei-three.vercel.app (production)
  const isDeploymentUrl = /^[a-z0-9-]+-[a-f0-9]{8,}-[a-z0-9-]+\.vercel\.app$/i.test(hostname);
  
  if (!isDeploymentUrl) {
    // Это production домен или кастомный домен
    return window.location.origin;
  }

  // 3. Если это deployment URL, пытаемся определить production домен
  // Для Vercel production домен обычно имеет формат: project-name.vercel.app
  // Пытаемся извлечь имя проекта из deployment URL
  // Например: code-sensei-frlfh8pkh-yaravvas-projects.vercel.app -> code-sensei-three.vercel.app
  // Но это ненадежно, поэтому лучше установить NEXT_PUBLIC_SITE_URL
  
  // Пытаемся определить production домен из deployment URL
  // Удаляем хеш и account из hostname
  // code-sensei-frlfh8pkh-yaravvas-projects -> code-sensei-three
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts[0].includes("-")) {
    const projectParts = parts[0].split("-");
    // Пытаемся найти имя проекта (первые части до хеша)
    // Обычно это первые 2-3 части
    let projectName = "";
    for (let i = 0; i < projectParts.length; i++) {
      const part = projectParts[i];
      // Если часть выглядит как хеш (длинная строка из hex символов), останавливаемся
      if (/^[a-f0-9]{8,}$/i.test(part)) {
        break;
      }
      projectName += (projectName ? "-" : "") + part;
    }
    
    // Если удалось извлечь имя проекта, формируем production URL
    if (projectName) {
      // Для Vercel production домен обычно: project-name.vercel.app
      // Но нужно знать точное имя. Попробуем несколько вариантов
      const possibleDomains = [
        `${projectName}.vercel.app`,
        `code-sensei-three.vercel.app`, // Явно указываем известный production домен
      ];
      
      // Предупреждение
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "⚠️ NEXT_PUBLIC_SITE_URL не установлен!\n" +
          "Установите переменную окружения в настройках Vercel:\n" +
          "NEXT_PUBLIC_SITE_URL=https://code-sensei-three.vercel.app\n\n" +
          "Используется fallback на production домен."
        );
      }
      
      // Используем известный production домен
      return `https://code-sensei-three.vercel.app`;
    }
  }
  
  // Предупреждение в консоли
  if (process.env.NODE_ENV === "production") {
    console.error(
      "⚠️ NEXT_PUBLIC_SITE_URL не установлен и не удалось определить production домен!\n" +
      "Установите переменную окружения в настройках Vercel:\n" +
      "NEXT_PUBLIC_SITE_URL=https://code-sensei-three.vercel.app\n\n" +
      "Используется текущий URL как fallback, но OAuth может работать неправильно."
    );
  }

  // Fallback: используем window.location.origin (может быть неправильным!)
  return window.location.origin;
}

