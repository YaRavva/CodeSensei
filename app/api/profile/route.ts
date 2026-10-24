import { NextResponse } from "next/server";
import { badRequest } from "@/lib/appwrite/api";
import { updateUserProfile } from "@/lib/appwrite/users";
import { getAuthContext } from "@/lib/utils/auth";
import { getNameValidationError } from "@/lib/utils/name-validation";

export async function PATCH(request: Request) {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { display_name?: string };
  try {
    body = (await request.json()) as { display_name?: string };
  } catch {
    return badRequest("Некорректный запрос");
  }

  const displayName = (body.display_name ?? "").trim();
  const validationError = getNameValidationError(displayName);

  if (validationError) {
    return badRequest(validationError);
  }

  if (displayName.length > 100) {
    return badRequest("Имя слишком длинное");
  }

  try {
    const profile = await updateUserProfile(context.user.$id, {
      display_name: displayName,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Не удалось обновить профиль" }, { status: 500 });
  }
}
