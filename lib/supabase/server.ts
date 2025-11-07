import type { Database } from "@/types/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Устанавливаем куки с правильными опциями для безопасности
              cookieStore.set(name, value, {
                ...options,
                // Убеждаемся, что куки устанавливаются с правильными параметрами
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? process.env.NODE_ENV === "production",
                sameSite: options?.sameSite ?? "lax",
                path: options?.path ?? "/",
              });
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions, but мы логируем для отладки
            console.warn("Failed to set cookies in Server Component (this is expected):", error);
          }
        },
      },
    }
  );
}
