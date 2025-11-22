import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPostAuthRedirect } from "@/lib/utils/auth-redirect";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Получаем пользователя и профиль для определения правильного редиректа
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectPath = "/modules";

  if (user) {
    // Ждем создания профиля триггером БД (для OAuth это может занять время)
    let profile: UserProfile | null = null;
    let retries = 0;
    const maxRetries = 5; // Увеличиваем количество попыток для OAuth
    const retryDelay = 300; // Задержка между попытками в мс

    while (retries < maxRetries && !profile) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        profile = data as UserProfile;
        break;
      }

      // Если это не ошибка "not found", логируем
      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile in callback:", error);
      }

      if (retries < maxRetries - 1) {
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retries++;
      } else {
        break;
      }
    }

    // Используем переданный next или определяем на основе валидности имени
    redirectPath = next || getPostAuthRedirect(profile);
  } else if (next) {
    // Если пользователь не авторизован, но есть next параметр, используем его
    redirectPath = next;
  }

  // Определяем базовый URL для редиректа
  // Приоритет: переменная окружения > заголовки > requestUrl
  let baseUrl: string;
  
  // Проверяем переменные окружения (для продакшена)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    // Используем заголовки запроса
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || 
                     (requestUrl.protocol === "https:" ? "https" : "http");
    
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      // Если это не localhost, используем заголовки
      baseUrl = `${protocol}://${host}`;
    } else {
      // Для localhost используем requestUrl напрямую
      baseUrl = requestUrl.origin;
    }
  }

  return NextResponse.redirect(new URL(redirectPath, baseUrl));
}
