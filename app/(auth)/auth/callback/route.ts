import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/modules";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Получаем правильный origin из заголовков запроса
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (requestUrl.protocol === "https:" ? "https" : "http");
  const origin = `${protocol}://${host}`;

  return NextResponse.redirect(new URL(next, origin));
}
