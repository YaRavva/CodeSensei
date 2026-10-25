import { NextResponse } from "next/server";
import { listActiveAchievements, listUserAchievements } from "@/lib/appwrite/achievements";
import { requireApiUser } from "@/lib/appwrite/api";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const [achievements, earned] = await Promise.all([
    listActiveAchievements(),
    listUserAchievements(auth.userId),
  ]);

  return NextResponse.json({ achievements, earned });
}
