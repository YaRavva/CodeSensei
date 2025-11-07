import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Восстанавливает сессию из серверных cookies
 * Используется после хард релоада, когда клиентская сессия потеряна
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Получаем текущую сессию из серверных cookies
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session from server:", error);
      return NextResponse.json({ session: null, error: error.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    // Возвращаем токены для восстановления на клиенте
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      },
    });
  } catch (e: any) {
    console.error("Error in restore-session:", e);
    return NextResponse.json(
      { session: null, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

