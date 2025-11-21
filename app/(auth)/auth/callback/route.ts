import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidRussianName } from "@/lib/utils/name-validation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/modules";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
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

  return NextResponse.redirect(new URL(next, baseUrl));
}
