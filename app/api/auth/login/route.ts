import { NextResponse } from "next/server";
import { AppwriteException, type Models } from "node-appwrite";
import { getAdminAccount, getSessionAccount } from "@/lib/appwrite/client";
import { sessionCookieOptions } from "@/lib/appwrite/session";
import { ensureUserProfile } from "@/lib/appwrite/users";
import { hit, MINUTE, tooManyRequests } from "@/lib/security/rate-limit";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
  }

  // API-key calls bypass Appwrite abuse limits: throttle brute force here.
  const limit = hit(`login:email:${email}`, 10, 15 * MINUTE);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  try {
    const session = await getAdminAccount().createEmailPasswordSession({ email, password });
    const account = getSessionAccount(session.secret);
    const user: Models.User = await account.get();

    if (!user.emailVerification) {
      await account.deleteSession({ sessionId: "current" }).catch(() => undefined);
      return NextResponse.json(
        {
          error:
            "Подтвердите email: перейдите по ссылке из письма, которое мы отправили при регистрации.",
          code: "email_unverified",
        },
        { status: 403 }
      );
    }

    const profile = await ensureUserProfile(user);

    const response = NextResponse.json({
      user: { id: user.$id, email: user.email, name: user.name },
      profile,
    });
    const options = sessionCookieOptions(session.expire);
    response.cookies.set(options.name, session.secret, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
      ...(options.expires ? { expires: options.expires } : {}),
    });

    return response;
  } catch (error) {
    if (error instanceof AppwriteException) {
      const status = error.code === 401 ? 401 : 400;
      const message =
        error.code === 401 ? "Неверный email или пароль" : "Не удалось выполнить вход";
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Login failed:", error);
    return NextResponse.json({ error: "Не удалось выполнить вход" }, { status: 500 });
  }
}
