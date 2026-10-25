import { NextResponse } from "next/server";
import { getAdminAccount } from "@/lib/appwrite/client";

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

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

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
