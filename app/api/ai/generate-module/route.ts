import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  isOmnirouteConfigured,
  OMNIROUTE_MAX_OUTPUT_TOKENS,
  OmnirouteError,
} from "@/lib/ai/omniroute";
import { requireApiAdmin } from "@/lib/appwrite/api";
import { buildModuleGenerationPrompt, extractJsonFromMarkdown } from "@/lib/prompts";
import { AI_SERVICE_UNAVAILABLE, serverError } from "@/lib/security/api-errors";
import { logGeneration } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { checkRateLimit } = await import("@/lib/utils/rate-limit");
    const rateLimitCheck = await checkRateLimit(userId, "module");
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
    const { topic, level, description } = body;

    if (!topic || !level) {
      return NextResponse.json({ error: "Topic and level are required" }, { status: 400 });
    }

    const prompt = buildModuleGenerationPrompt({ topic, level, description });

    let generatedText = "";

    try {
      const completion = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        maxTokens: OMNIROUTE_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      });
      generatedText = completion.content;
    } catch (error) {
      if (error instanceof OmnirouteError) {
        // The details of the failure stay on the server: they can carry the
        // address of the service and the body of the request.
        console.error("Omniroute error while generating a module:", error.message, error.details);
        return NextResponse.json({ error: AI_SERVICE_UNAVAILABLE }, { status: 502 });
      }
      throw error;
    }

    let moduleData: unknown;
    try {
      let jsonText = extractJsonFromMarkdown(generatedText.trim());

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];

      jsonText = jsonText.replace(/,\s*"\{/g, ",{").replace(/\}\s*"\s*,/g, "},");

      moduleData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Only the length of the answer is written to the log: the text itself
      // is large and is not needed to find the cause.
      console.error("Generated text length:", generatedText.length);
      moduleData = {
        description: generatedText,
        theory: null,
      };
    }

    await logGeneration(userId, "module");

    return NextResponse.json({
      success: true,
      data: moduleData,
      remaining: rateLimitCheck.remaining - 1,
    });
  } catch (error) {
    // The message of the exception can carry internal details, so the client
    // only receives a short message and the cause stays in the log.
    return serverError("Error generating module", error);
  }
}
