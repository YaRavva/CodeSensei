import { NextResponse } from "next/server";
import { badRequest, requireApiUser } from "@/lib/appwrite/api";
import { getAuthContext } from "@/lib/utils/auth";
import { MAX_CODE_LENGTH, MAX_TEXT_LENGTH } from "@/lib/security/rate-limit";
import { canAccessTask } from "@/lib/security/task-access";
import {
  countTaskAttempts,
  createTaskAttempt,
  hasSuccessfulAttempt,
  listAttemptsForTasks,
} from "@/lib/appwrite/attempts";
import { hasUsedHint } from "@/lib/appwrite/hint-events";
import { getTask } from "@/lib/appwrite/tasks";
import type { Json } from "@/types/db";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const taskIds = (url.searchParams.get("taskIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (taskIds.length === 0) {
    return NextResponse.json({ attempts: [] });
  }

  const attempts = await listAttemptsForTasks(auth.userId, taskIds);
  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const auth = { userId: context.user.$id };

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

  if (code.length > MAX_CODE_LENGTH) {
    return badRequest("Код решения слишком длинный");
  }

  const testResults = body.testResults ?? {};
  if (JSON.stringify(testResults).length > 50_000) {
    return badRequest("Слишком большой результат тестов");
  }

  const task = await getTask(taskId);
  if (!task || !(await canAccessTask(auth.userId, context.profile.role, task))) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  const isSuccessful = Boolean(body.isSuccessful);
  // Hint usage comes from server-side hint events, not from the request.
  const [attemptNumber, hadSuccess, usedAiHint] = await Promise.all([
    countTaskAttempts(auth.userId, taskId),
    hasSuccessfulAttempt(auth.userId, taskId),
    hasUsedHint(auth.userId, taskId),
  ]);

  const attempt = await createTaskAttempt({
    user_id: auth.userId,
    task_id: taskId,
    code_solution: code,
    test_results: testResults as Json,
    is_successful: isSuccessful,
    used_ai_hint: usedAiHint,
    execution_time_ms: body.executionTimeMs == null ? null : Number(body.executionTimeMs),
    solving_time_ms: body.solvingTimeMs == null ? null : Number(body.solvingTimeMs),
    error_message:
      body.errorMessage == null ? null : String(body.errorMessage).slice(0, MAX_TEXT_LENGTH),
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
