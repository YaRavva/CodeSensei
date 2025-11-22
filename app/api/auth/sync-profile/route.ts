import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

/**
 * API endpoint для синхронизации профиля между сервером и клиентом
 * Используется для принудительного обновления профиля после OAuth
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("[sync-profile] Request received:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (!user) {
      console.warn("[sync-profile] Unauthorized - no user");
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

      const typedData = data as UserProfile | null;
      console.log(`[sync-profile] Query attempt ${retries + 1}/${maxRetries}:`, {
        hasData: !!typedData,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        dataPreview: typedData ? { id: typedData.id, email: typedData.email, role: typedData.role } : null,
      });

      if (error && error.code !== "PGRST116") {
        console.error(`[sync-profile] Error loading profile (attempt ${retries + 1}):`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }

      if (typedData) {
        profile = typedData;
        console.log(`[sync-profile] Profile found:`, {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          display_name: profile.display_name,
        });
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
      console.warn(`[sync-profile] Profile not found after ${maxRetries} attempts for user ${user.id}`);
      return NextResponse.json(
        { error: "Profile not found", userId: user.id },
        { status: 404 }
      );
    }

    console.log(`[sync-profile] Returning profile for user ${user.id}`);
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("[sync-profile] Unexpected error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

