import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { requireApiAdmin } from "@/lib/appwrite/api";
import { buildTaskGenerationPrompt, extractJsonFromMarkdown, tryFixJson } from "@/lib/prompts";
import { AI_SERVICE_UNAVAILABLE, serverError } from "@/lib/security/api-errors";
import { logGeneration } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { checkRateLimit } = await import("@/lib/utils/rate-limit");
    const rateLimitCheck = await checkRateLimit(userId, "task");
    if (!rateLimitCheck.canGenerate) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error || "Rate limit exceeded",
          remaining: rateLimitCheck.remaining,
        },
        { status: 429 }
      );
    }

    if (!isOmnirouteConfigured()) {
      return NextResponse.json(
        { error: "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { topic, difficulty, lessonTheory, taskType } = body;

    if (!topic || !difficulty) {
      return NextResponse.json({ error: "Topic and difficulty are required" }, { status: 400 });
    }

    const effectiveTaskType: "linear" | "function" | "class" =
      taskType === "function" || taskType === "class" ? taskType : "linear";

    const prompt = buildTaskGenerationPrompt({
      topic,
      difficulty,
      lessonTheory,
      taskType: effectiveTaskType,
    });

    let generatedText = "";

    try {
      const completion = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
      });
      generatedText = completion.content;
    } catch (error) {
      if (error instanceof OmnirouteError) {
        // The details of the failure stay on the server: they can carry the
        // address of the service and the body of the request.
        console.error("Omniroute error while generating a task:", error.message, error.details);
        return NextResponse.json({ error: AI_SERVICE_UNAVAILABLE }, { status: 502 });
      }
      throw error;
    }

    if (!generatedText) {
      return NextResponse.json({ error: "AI-сервис вернул пустой ответ" }, { status: 502 });
    }

    const jsonText = extractJsonFromMarkdown(generatedText.trim());

    let taskData: any = null;
    try {
      taskData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // The text of the model is not written to the log: it can be large and
      // it is not needed to find the cause.
      console.error("Generated text length:", generatedText.length);
      taskData = tryFixJson(jsonText);
    }

    await logGeneration(userId, "task");

    if (taskData && typeof taskData === "object") {
      taskData.task_type = effectiveTaskType;
      if (Array.isArray(taskData.test_cases)) {
        for (const tc of taskData.test_cases) {
          if (tc && typeof tc === "object" && !tc.verification_mode) {
            tc.verification_mode = effectiveTaskType === "function" ? "function" : "variable";
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: taskData,
      remaining: rateLimitCheck.remaining - 1,
    });
  } catch (error) {
    // The message of the exception can carry internal details, so the client
    // only receives a short message and the cause stays in the log.
    return serverError("Generate task error", error);
  }
}
