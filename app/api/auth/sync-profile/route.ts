import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API endpoint для синхронизации профиля между сервером и клиентом
 * Используется для принудительного обновления профиля после OAuth
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Загружаем профиль с retry
    let profile = null;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries && !profile) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(`[sync-profile] Error loading profile (attempt ${retries + 1}):`, error);
      }

      if (data) {
        profile = data;
        break;
      }

      if (retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)));
        retries++;
      } else {
        break;
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found", userId: user.id },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("[sync-profile] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

