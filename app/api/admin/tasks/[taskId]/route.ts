import { NextResponse } from "next/server";
import { badRequest, requireApiAdmin } from "@/lib/appwrite/api";
import { deleteTaskCascade, getTask, updateTask } from "@/lib/appwrite/tasks";
import type { Task } from "@/types/db";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const task = await getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Некорректный запрос");
  }

  const patch: Record<string, unknown> = {};

  if ("title" in body) patch.title = String(body.title ?? "").trim();
  if ("description" in body) patch.description = String(body.description ?? "");
  if ("starter_code" in body) patch.starter_code = String(body.starter_code ?? "");
  if ("solution_code" in body) {
    patch.solution_code = body.solution_code == null ? null : String(body.solution_code);
  }
  if ("test_cases" in body) patch.test_cases = body.test_cases ?? [];
  if ("hints" in body) patch.hints = body.hints ?? null;
  if ("xp_reward" in body) patch.xp_reward = Number(body.xp_reward ?? 10);
  if ("difficulty" in body) {
    const difficulty = String(body.difficulty) as Task["difficulty"];
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return badRequest("Некорректная сложность задания");
    }
    patch.difficulty = difficulty;
  }
  if ("order_index" in body) patch.order_index = Number(body.order_index ?? 0);
  if ("variant_number" in body) {
    patch.variant_number =
      body.variant_number == null || body.variant_number === ""
        ? null
        : Number(body.variant_number);
  }
  if ("module_id" in body) patch.module_id = String(body.module_id);

  if (Object.keys(patch).length === 0) {
    return badRequest("Нет данных для обновления");
  }

  try {
    const updated = await updateTask(taskId, patch as unknown as Parameters<typeof updateTask>[1]);
    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Не удалось обновить задание" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  try {
    await deleteTaskCascade(taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ error: "Не удалось удалить задание" }, { status: 500 });
  }
}
