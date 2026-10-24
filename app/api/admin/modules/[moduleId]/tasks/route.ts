import { NextResponse } from "next/server";
import { badRequest, requireApiAdmin } from "@/lib/appwrite/api";
import { getModule } from "@/lib/appwrite/modules";
import { createTask, listTasksByModule } from "@/lib/appwrite/tasks";
import type { Task } from "@/types/db";

interface RouteContext {
  params: Promise<{ moduleId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { moduleId } = await params;
  const tasks = await listTasksByModule(moduleId);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request, { params }: RouteContext) {
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

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const difficulty = (body.difficulty ?? "easy") as Task["difficulty"];

  if (!title || !description) {
    return badRequest("Укажите название и описание задания");
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return badRequest("Некорректная сложность задания");
  }

  try {
    const task = await createTask({
      module_id: moduleId,
      title,
      description,
      starter_code: String(body.starter_code ?? ""),
      solution_code: body.solution_code == null ? null : String(body.solution_code),
      test_cases: body.test_cases ?? [],
      xp_reward: Number(body.xp_reward ?? 10),
      difficulty,
      hints: body.hints ?? null,
      order_index: Number(body.order_index ?? 0),
      variant_number:
        body.variant_number == null || body.variant_number === ""
          ? null
          : Number(body.variant_number),
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Не удалось создать задание" }, { status: 500 });
  }
}
