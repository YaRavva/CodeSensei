import { NextResponse } from "next/server";
import { AppwriteException, ID, type Models } from "node-appwrite";
import { getAdminAccount, getSessionAccount } from "@/lib/appwrite/client";
import { sessionCookieOptions } from "@/lib/appwrite/session";
import { ensureUserProfile } from "@/lib/appwrite/users";

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

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль должен содержать минимум 8 символов" },
      { status: 400 }
    );
  }

  try {
    const created = await getAdminAccount().create({
      userId: ID.unique(),
      email,
      password,
      name: displayName || email.split("@")[0],
    });

    const session = await getAdminAccount().createEmailPasswordSession({ email, password });
    const account = getSessionAccount(session.secret);
    const user: Models.User = await account.get();
    const profile = await ensureUserProfile(user ?? created);

    const response = NextResponse.json(
      {
        user: { id: user.$id, email: user.email, name: user.name },
        profile,
      },
      { status: 201 }
    );
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
      const status = error.code === 409 ? 409 : 400;
      const message =
        error.code === 409
          ? "Пользователь с таким email уже существует"
          : error.message || "Не удалось зарегистрироваться";
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Не удалось зарегистрироваться" }, { status: 500 });
  }
}
