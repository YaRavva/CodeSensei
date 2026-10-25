import { NextResponse } from "next/server";
import { badRequest, requireApiAdmin } from "@/lib/appwrite/api";
import { deleteModuleCascade, getModule, updateModule } from "@/lib/appwrite/modules";
import { listTasksByModule } from "@/lib/appwrite/tasks";

interface RouteContext {
  params: Promise<{ moduleId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { moduleId } = await params;
  const module = await getModule(moduleId);

  if (!module) {
    return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  }

  const tasks = await listTasksByModule(moduleId);
  return NextResponse.json({ module, tasks });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { moduleId } = await params;
  const module = await getModule(moduleId);
  if (!module) {
    return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Некорректный запрос");
  }

  const patch: Record<string, unknown> = {};

  if ("title" in body) patch.title = String(body.title ?? "").trim();
  if ("description" in body) {
    patch.description = body.description == null ? null : String(body.description);
  }
  if ("topic" in body) patch.topic = String(body.topic ?? "").trim();
  if ("level" in body) {
    const level = Number(body.level);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return badRequest("Уровень сложности должен быть от 1 до 5");
    }
    patch.level = level;
  }
  if ("order_index" in body) patch.order_index = Number(body.order_index ?? 0);
  if ("is_published" in body) patch.is_published = Boolean(body.is_published);

  if (Object.keys(patch).length === 0) {
    return badRequest("Нет данных для обновления");
  }

  try {
    const updated = await updateModule(
      moduleId,
      patch as unknown as Parameters<typeof updateModule>[1]
    );
    return NextResponse.json({ module: updated });
  } catch (error) {
    console.error("Failed to update module:", error);
    return NextResponse.json({ error: "Не удалось обновить модуль" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { moduleId } = await params;
  const module = await getModule(moduleId);
  if (!module) {
    return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  }

  try {
    await deleteModuleCascade(moduleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete module:", error);
    return NextResponse.json({ error: "Не удалось удалить модуль" }, { status: 500 });
  }
}
