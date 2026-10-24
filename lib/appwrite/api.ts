import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/utils/auth";

export async function requireApiAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const context = await getAuthContext();

  if (!context) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (context.profile.role !== "admin" && context.profile.role !== "teacher") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: context.user.$id };
}

export async function requireApiUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const context = await getAuthContext();

  if (!context) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: context.user.$id };
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
