import { NextResponse } from "next/server";
import { badRequest, requireApiUser } from "@/lib/appwrite/api";
import {
  countTaskAttempts,
  createTaskAttempt,
  hasSuccessfulAttempt,
  listAttemptsForTasks,
} from "@/lib/appwrite/attempts";
import { getTask } from "@/lib/appwrite/tasks";
import type { Json } from "@/types/db";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const taskIds = (url.searchParams.get("taskIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (taskIds.length === 0) {
    return NextResponse.json({ attempts: [] });
  }

  const attempts = await listAttemptsForTasks(auth.userId, taskIds);
  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Некорректный запрос");
  }

  const taskId = String(body.taskId ?? "");
  const code = String(body.code ?? "");

  if (!taskId || !code) {
    return badRequest("Укажите задание и код решения");
  }

  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  const isSuccessful = Boolean(body.isSuccessful);
  const [attemptNumber, hadSuccess] = await Promise.all([
    countTaskAttempts(auth.userId, taskId),
    hasSuccessfulAttempt(auth.userId, taskId),
  ]);

  const attempt = await createTaskAttempt({
    user_id: auth.userId,
    task_id: taskId,
    code_solution: code,
    test_results: (body.testResults ?? {}) as Json,
    is_successful: isSuccessful,
    used_ai_hint: Boolean(body.usedAiHint),
    execution_time_ms: body.executionTimeMs == null ? null : Number(body.executionTimeMs),
    solving_time_ms: body.solvingTimeMs == null ? null : Number(body.solvingTimeMs),
    error_message: body.errorMessage == null ? null : String(body.errorMessage),
  });

  return NextResponse.json(
    {
      attempt,
      attemptNumber: attemptNumber + 1,
      isFirstSuccessfulAttempt: isSuccessful && !hadSuccess,
    },
    { status: 201 }
  );
}
