import { NextResponse } from "next/server";
import { touchLastActive } from "@/lib/appwrite/users";
import { getAuthContext } from "@/lib/utils/auth";

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await touchLastActive(context.user.$id);

  return NextResponse.json({
    user: {
      id: context.user.$id,
      email: context.user.email,
      name: context.user.name,
    },
    profile: context.profile,
  });
}
