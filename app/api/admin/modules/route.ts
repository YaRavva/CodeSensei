import { NextResponse } from "next/server";
import { badRequest, requireApiAdmin } from "@/lib/appwrite/api";
import { createModule, listAllModules } from "@/lib/appwrite/modules";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const modules = await listAllModules();
  return NextResponse.json({ modules });
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Некорректный запрос");
  }

  const title = String(body.title ?? "").trim();
  const topic = String(body.topic ?? "").trim();
  const description = body.description == null ? null : String(body.description);
  const level = Number(body.level ?? 1);
  const orderIndex = Number(body.order_index ?? 0);
  const isPublished = Boolean(body.is_published);

  if (!title || !topic) {
    return badRequest("Укажите название и тему модуля");
  }

  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return badRequest("Уровень сложности должен быть от 1 до 5");
  }

  try {
    const module = await createModule({
      title,
      description,
      topic,
      level,
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
      is_published: isPublished,
      created_by: auth.userId,
    });

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error("Failed to create module:", error);
    return NextResponse.json({ error: "Не удалось создать модуль" }, { status: 500 });
  }
}
