import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { getAdminAccount } from "@/lib/appwrite/client";

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

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль должен содержать минимум 8 символов" },
      { status: 400 }
    );
  }

  try {
    await getAdminAccount().updateRecovery({ userId, secret, password });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppwriteException) {
      return NextResponse.json(
        { error: error.message || "Ссылка недействительна или устарела" },
        { status: 400 }
      );
    }

    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Не удалось обновить пароль" }, { status: 500 });
  }
}
