import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { getGuestAccount } from "@/lib/appwrite/client";
import { hit, MINUTE, tooManyRequests } from "@/lib/security/rate-limit";

interface VerifyBody {
  userId?: string;
  secret?: string;
}

export async function POST(request: Request) {
  let body: VerifyBody;

  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const secret = body.secret?.trim();

  if (!userId || !secret) {
    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 400 });
  }

  if (userId.length > 64 || secret.length > 256) {
    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 400 });
  }

  const limit = hit(`verify:user:${userId}`, 10, 15 * MINUTE);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  try {
    await getGuestAccount().updateEmailVerification({ userId, secret });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.type === "user_invalid_token") {
        return NextResponse.json(
          {
            error: "Ссылка недействительна или устарела. Запросите новое письмо на странице входа.",
          },
          { status: 400 }
        );
      }

      console.error("Appwrite verification error:", error.type, error.message);
      return NextResponse.json(
        { error: "Временная ошибка сервиса авторизации. Пожалуйста, повторите попытку позже." },
        { status: 503 }
      );
    }

    console.error("Email verification failed:", error);
    return NextResponse.json({ error: "Не удалось подтвердить email" }, { status: 500 });
  }
}
