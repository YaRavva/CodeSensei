import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Выходим из Supabase - это должно очистить куки через setAll
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase signOut error:", error);
    }

    // Получаем все куки
    const cookieStore = await cookies();
    const response = NextResponse.json({ ok: true });
    
    // Получаем префикс проекта из URL
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    
    // Удаляем все куки, которые могут быть связаны с Supabase
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      const name = cookie.name;
      // Удаляем все куки Supabase
      if (
        name.startsWith('sb-') || 
        name.includes('supabase') ||
        name.includes('auth-token') ||
        (projectRef && name.includes(projectRef))
      ) {
        // Удаляем с разными опциями для гарантии
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        response.cookies.delete(name);
      }
    });

    // Также удаляем стандартные имена кук Supabase
    const standardCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-provider-token',
      'sb-provider-refresh-token',
    ];
    
    if (projectRef) {
      standardCookies.push(
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token-code-verifier`,
        `sb-${projectRef}-auth-token.0`,
        `sb-${projectRef}-auth-token.1`
      );
    }
    
    standardCookies.forEach(cookieName => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      response.cookies.delete(cookieName);
    });

    return response;
  } catch (e: any) {
    console.error("Signout error:", e);
    // Даже при ошибке возвращаем успешный ответ и очищаем куки
    const response = NextResponse.json({ ok: true });
    const cookieStore = await cookies();
    cookieStore.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name);
      }
    });
    return response;
  }
}


