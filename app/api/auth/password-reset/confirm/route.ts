import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { getAdminAccount } from "@/lib/appwrite/client";
import { hit, MINUTE, tooManyRequests } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  let body: { userId?: string; secret?: string; password?: string };

  try {
    body = (await request.json()) as { userId?: string; secret?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { userId, secret, password } = body;

  if (!userId || !secret || !password) {
    return NextResponse.json({ error: "Недостаточно данных для сброса пароля" }, { status: 400 });
  }

  const limit = hit(`reset-confirm:user:${userId}`, 10, 15 * MINUTE);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  if (password.length < 8 || password.length > 256) {
    return NextResponse.json(
      { error: "Пароль должен содержать от 8 до 256 символов" },
      { status: 400 }
    );
  }

  try {
    await getAdminAccount().updateRecovery({ userId, secret, password });
    return NextResponse.json({ success: true });
  } catch (error) {
    // The message of Appwrite can tell apart an unknown user from an expired
    // token, so the client always receives the same text. The cause stays in
    // the log.
    console.error("Password reset failed:", error);
    if (error instanceof AppwriteException) {
      return NextResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 });
    }

    return NextResponse.json({ error: "Не удалось обновить пароль" }, { status: 500 });
  }
}
