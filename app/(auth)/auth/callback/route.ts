import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidRussianName } from "@/lib/utils/name-validation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/modules";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.session?.user) {
      const userId = data.session.user.id;
      
      // Проверяем, существует ли профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, display_name")
        .eq("id", userId)
        .maybeSingle();
      
      // Если профиль не существует, создаем его
      if (!profile && !profileError) {
        const email = data.session.user.email ?? null;
        const displayName =
          (data.session.user.user_metadata as any)?.full_name ||
          (data.session.user.user_metadata as any)?.name ||
          null;
        const role = (
          (data.session.user.app_metadata as any)?.user_role ||
          (data.session.user.app_metadata as any)?.role ||
          (data.session.user.user_metadata as any)?.role ||
          "student"
        ) as string;
        
        const { error: insertError } = await (supabase
          .from("users") as any)
          .insert({
            id: userId,
            email,
            display_name: displayName,
            role,
          });
        
        if (insertError) {
          console.error("Error creating user profile in callback:", insertError);
        }
      }
      
      // Проверяем имя пользователя - если невалидно, редиректим на профиль
      type ProfileData = { display_name: string | null } | null;
      const profileData = profile as ProfileData;
      const fallbackProfile = (await supabase
        .from("users")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle()).data as ProfileData;
      const currentProfile = profileData || fallbackProfile;
      
      if (currentProfile && !isValidRussianName(currentProfile.display_name)) {
        // Редиректим на профиль для заполнения имени
        // Определяем базовый URL для редиректа
        let redirectBaseUrl: string;
        if (process.env.NEXT_PUBLIC_SITE_URL) {
          redirectBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        } else if (process.env.VERCEL_URL) {
          redirectBaseUrl = `https://${process.env.VERCEL_URL}`;
        } else {
          const host = request.headers.get("host");
          const protocol = request.headers.get("x-forwarded-proto") || 
                           (requestUrl.protocol === "https:" ? "https" : "http");
          redirectBaseUrl = host ? `${protocol}://${host}` : requestUrl.origin;
        }
        return NextResponse.redirect(new URL("/profile", redirectBaseUrl));
      }
    }
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
