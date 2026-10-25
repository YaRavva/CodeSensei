import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/appwrite/client";
import { clearSessionCookie, readSessionCookie } from "@/lib/appwrite/session";

export async function POST() {
  const secret = await readSessionCookie();

  if (secret) {
    try {
      await getSessionAccount(secret).deleteSession("current");
    } catch {
      // The session may already be expired — clearing the cookie is enough.
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
