import { NextResponse } from "next/server";
import { badRequest, requireApiUser } from "@/lib/appwrite/api";
import {
  countTaskAttempts,
  createTaskAttempt,
  hasSuccessfulAttempt,
  listAttemptsForTasks,
} from "@/lib/appwrite/attempts";
import { hasUsedHint } from "@/lib/appwrite/hint-events";
import { getTask } from "@/lib/appwrite/tasks";
import { runServerTestSuite, SandboxUnavailableError } from "@/lib/sandbox/python-sandbox";
import {
  HOUR,
  hit,
  MAX_CODE_LENGTH,
  MAX_TEXT_LENGTH,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { canAccessTask } from "@/lib/security/task-access";
import { getAuthContext } from "@/lib/utils/auth";
import type { Json } from "@/types/db";
import type { TestCase } from "@/types/test-case";

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

  const task = await getTask(taskId);
  if (!task || !(await canAccessTask(auth.userId, context.profile.role, task))) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  // Each check starts a sandboxed Python process.
  const limit = hit(`attempts:user:${auth.userId}`, 120, HOUR);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  // The verdict comes from the server-side test run; `isSuccessful` and
  // `testResults` sent by the browser are ignored (PRD 11).
  const testCases = Array.isArray(task.test_cases)
    ? (task.test_cases as unknown as TestCase[])
    : [];
  let verdict: Awaited<ReturnType<typeof runServerTestSuite>>;
  try {
    verdict = await runServerTestSuite(code, testCases, task.task_type);
  } catch (error) {
    console.error("Server-side test run failed:", error);
    const message =
      error instanceof SandboxUnavailableError
        ? "Проверка на сервере сейчас перегружена. Повторите через минуту."
        : "Не удалось проверить решение на сервере. Повторите позже.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  const isSuccessful = verdict.allPassed;
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
    test_results: verdict as unknown as Json,
    is_successful: isSuccessful,
    used_ai_hint: usedAiHint,
    execution_time_ms: verdict.executionTime,
    solving_time_ms:
      Number.isFinite(Number(body.solvingTimeMs)) && Number(body.solvingTimeMs) >= 0
        ? Math.min(Math.round(Number(body.solvingTimeMs)), 30 * 24 * 3600 * 1000)
        : null,
    error_message: verdict.results.find((r) => !r.passed)?.error?.slice(0, MAX_TEXT_LENGTH) ?? null,
  });

  // The hidden checks are reported without their expected value: the student
  // must not learn the answer from the response of the server. The value the
  // program produced is safe to show, because it comes from the student's own
  // code.
  const visibleIds = new Set(testCases.filter((tc) => tc.is_visible === true).map((tc) => tc.id));

  return NextResponse.json(
    {
      attempt,
      attemptNumber: attemptNumber + 1,
      isSuccessful,
      testResults: {
        ...verdict,
        results: verdict.results.map((result) =>
          visibleIds.has(result.testCaseId) ? result : { ...result, error: result.error }
        ),
      },
      isFirstSuccessfulAttempt: isSuccessful && !hadSuccess,
    },
    { status: 201 }
  );
}
