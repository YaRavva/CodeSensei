import { NextResponse } from "next/server";
import { checkName } from "@/lib/ai/name-checker";
import { badRequest } from "@/lib/appwrite/api";
import { getUserProfile, saveNameCheckResult, updateUserProfile } from "@/lib/appwrite/users";
import { getAuthContext } from "@/lib/utils/auth";
import { getNameValidationError } from "@/lib/utils/name-validation";

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: context.user, profile: context.profile });
}

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
    await updateUserProfile(context.user.$id, {
      display_name: displayName,
    });

    // Имя изменилось — вердикт по нему устарел, проверяем заново.
    const verdict = await checkName(displayName);

    await saveNameCheckResult(context.user.$id, {
      status: verdict.status,
      checkedName: displayName,
      reason: verdict.reason || null,
    }).catch((error) => {
      console.error("Failed to store name check result:", error);
    });

    // Профиль перечитывается: в ответе должен быть свежий вердикт, иначе
    // клиент увидит старое состояние и оставит баннер об ошибке имени.
    const freshProfile = (await getUserProfile(context.user.$id)) ?? context.profile;

    return NextResponse.json({
      profile: freshProfile,
      nameInvalid: verdict.status === "invalid",
      nameReason: verdict.status === "invalid" ? verdict.reason : undefined,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Не удалось обновить профиль" }, { status: 500 });
  }
}
