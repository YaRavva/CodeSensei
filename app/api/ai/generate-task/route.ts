import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { requireApiAdmin } from "@/lib/appwrite/api";
import { logGeneration } from "@/lib/utils/rate-limit";
import { buildTaskGenerationPrompt, extractJsonFromMarkdown, tryFixJson } from "@/lib/prompts";

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

    const effectiveTaskType: "linear" | "function" = taskType === "linear" ? "linear" : "function";

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
        return NextResponse.json({ error: error.message, details: error.details }, { status: 502 });
      }
      throw error;
    }

    if (!generatedText) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    let jsonText = extractJsonFromMarkdown(generatedText.trim());

    let taskData: any = null;
    try {
      taskData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Generated text:", generatedText);
      taskData = tryFixJson(jsonText);
    }

    await logGeneration(userId, "task");

    if (taskData && typeof taskData === "object") {
      taskData.task_type = effectiveTaskType;
      if (Array.isArray(taskData.test_cases)) {
        for (const tc of taskData.test_cases) {
          if (tc && typeof tc === "object" && !tc.verification_mode) {
            tc.verification_mode = effectiveTaskType === "linear" ? "variable" : "function";
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
    console.error("Generate task error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
