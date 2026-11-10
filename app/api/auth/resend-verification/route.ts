import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { sendVerificationEmail } from "@/lib/appwrite/email-verification";
import { clientIp, HOUR, hitAll, MINUTE, tooManyRequests } from "@/lib/security/rate-limit";

interface ResendBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: ResendBody;

  try {
    body = (await request.json()) as ResendBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
  }

  const limit = hitAll([
    { key: `resend-verify:ip:${clientIp(request)}`, limit: 5, windowMs: 15 * MINUTE },
    { key: `resend-verify:email:${email}`, limit: 3, windowMs: HOUR },
  ]);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  // Never build the link from the Host header (link poisoning).
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    return NextResponse.json({ error: "Подтверждение почты временно недоступно" }, { status: 503 });
  }

  try {
    const result = await sendVerificationEmail(email, password, `${origin}/verify-email`);
    return NextResponse.json({
      success: true,
      alreadyVerified: result.alreadyVerified,
      message: result.alreadyVerified
        ? "Email уже подтверждён — можно войти."
        : "Письмо со ссылкой подтверждения отправлено.",
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

    console.error("Resend verification failed:", error);
    return NextResponse.json({ error: "Не удалось отправить письмо" }, { status: 500 });
  }
}
