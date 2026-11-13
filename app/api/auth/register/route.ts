import { NextResponse } from "next/server";
import { AppwriteException, ID } from "node-appwrite";
import { checkAndStoreName } from "@/lib/ai/name-checker";
import { getAdminAccount } from "@/lib/appwrite/client";
import { sendVerificationEmail } from "@/lib/appwrite/email-verification";
import { ensureUserProfile, getUserProfile } from "@/lib/appwrite/users";
import { HOUR, hit, tooManyRequests } from "@/lib/security/rate-limit";

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
}

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const displayName = body.displayName?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
  }

  if (email.length > 254 || password.length > 256 || (displayName?.length ?? 0) > 100) {
    return NextResponse.json({ error: "Слишком длинные данные" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль должен содержать минимум 8 символов" },
      { status: 400 }
    );
  }

  // The limit is keyed by email, not by IP: behind the CDN every visitor
  // shares one address, so an IP bucket blocks all registrations at once.
  const limit = hit(`register:email:${email}`, 5, HOUR);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  try {
    const userId = ID.unique();
    const created = await getAdminAccount().create({
      userId,
      email,
      password,
      name: displayName || email.split("@")[0],
    });

    let profile = await ensureUserProfile(created);

    // Имя проверяется сразу при регистрации: вердикт сохраняется в профиле,
    // и при первом входе проверять его заново не придётся. Проверяется фактическое
    // имя профиля — если ученик его не указал, там email-логин.
    const verdict = await checkAndStoreName(created.$id, profile.display_name);

    // Профиль перечитывается: в ответе должен быть свежий вердикт, иначе
    // клиент увидит состояние до проверки.
    profile = (await getUserProfile(created.$id)) ?? profile;

    // Registration no longer auto-verifies: the user confirms ownership via
    // the emailed link before the first login.
    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    const verification = origin
      ? await sendVerificationEmail(email, password, `${origin}/verify-email`)
      : { sent: false, alreadyVerified: false };

    return NextResponse.json(
      {
        user: { id: created.$id, email: created.email, name: created.name },
        profile,
        verificationSent: verification.sent,
        nameInvalid: verdict.status === "invalid",
        nameReason: verdict.status === "invalid" ? verdict.reason : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppwriteException) {
      const status = error.code === 409 ? 409 : 400;
      const message =
        error.code === 409
          ? "Пользователь с таким email уже существует"
          : error.type === "password_recently_used" || error.type === "password_personal_data"
            ? error.message
            : error.code === 400
              ? "Проверьте email и пароль"
              : "Не удалось зарегистрироваться";
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Не удалось зарегистрироваться" }, { status: 500 });
  }
}
