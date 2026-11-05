import { NextResponse } from "next/server";
import { getAdminAccount } from "@/lib/appwrite/client";
import { clientIp, HOUR, hitAll, MINUTE, tooManyRequests } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  let email = "";

  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase() ?? "";
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Укажите email" }, { status: 400 });
  }

  const limit = hitAll([
    { key: `reset:ip:${clientIp(request)}`, limit: 5, windowMs: 15 * MINUTE },
    { key: `reset:email:${email}`, limit: 3, windowMs: HOUR },
  ]);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  // Never build the reset link from the Host header (link poisoning).
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    console.error("NEXT_PUBLIC_SITE_URL is not set: password recovery disabled");
    return NextResponse.json({ error: "Сброс пароля временно недоступен" }, { status: 503 });
  }

  try {
    await getAdminAccount().createRecovery({
      email,
      url: `${origin}/reset-password`,
    });
  } catch (error) {
    // Do not reveal whether the email exists.
    console.warn("Password recovery request failed:", error);
  }

  return NextResponse.json({
    success: true,
    message: "Если такой email зарегистрирован, письмо со ссылкой отправлено.",
  });
}
