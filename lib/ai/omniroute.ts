/**
 * Omniroute — OpenAI-compatible LLM gateway used for all AI features
 * (module/task generation, hints and solution feedback).
 *
 * Configuration (server-only):
 *   OMNIROUTE_BASE_URL=https://omniroute.example.com/v1
 *   OMNIROUTE_API_KEY=sk-...
 *   OMNIROUTE_MODEL=antigravity/gemini-3-flash
 */

const BASE_URL = (process.env.OMNIROUTE_BASE_URL ?? "").replace(/\/+$/, "");
const API_KEY = process.env.OMNIROUTE_API_KEY ?? "";

export const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || "antigravity/gemini-3-flash";

function envPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * Maximum number of tokens the model may generate in one response.
 * This is an output cap, not the context window (Omniroute models expose ~1M tokens
 * of context, but the completion itself is still limited by the provider).
 */
export const OMNIROUTE_MAX_OUTPUT_TOKENS = envPositiveInt("OMNIROUTE_MAX_OUTPUT_TOKENS", 8192);

/**
 * Safety cap for a single text fragment embedded into a prompt (student code,
 * task description, runtime output). 100k characters ≈ 25k tokens — far below
 * the 1M context window, but enough to avoid multi-megabyte prompts from a
 * runaway `print()` loop or a pasted file.
 *
 * Override with OMNIROUTE_MAX_INPUT_CHARS if you really need more.
 */
export const PROMPT_CHAR_LIMIT = envPositiveInt("OMNIROUTE_MAX_INPUT_CHARS", 100_000);

/** Truncates prompt input defensively and marks the cut so the model knows it. */
export function clipForPrompt(value: unknown, limit = PROMPT_CHAR_LIMIT): string {
  const text = typeof value === "string" ? value : String(value ?? "");

  if (text.length <= limit) return text;

  return `${text.slice(0, limit)}\n\n[... текст обрезан: ещё ${text.length - limit} символов ...]`;
}

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class OmnirouteError extends Error {
  readonly status: number;
  readonly details?: string;

  constructor(message: string, status = 502, details?: string) {
    super(message);
    this.name = "OmnirouteError";
    this.status = status;
    this.details = details;
  }
}

export function isOmnirouteConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<{ content: string; model: string; usage?: ChatCompletionResponse["usage"] }> {
  if (!isOmnirouteConfigured()) {
    throw new OmnirouteError(
      "Omniroute не настроен: задайте OMNIROUTE_BASE_URL и OMNIROUTE_API_KEY",
      500
    );
  }

  const model = options.model ?? OMNIROUTE_MODEL;
  const timeoutMs = options.timeoutMs ?? 120_000;

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? OMNIROUTE_MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new OmnirouteError(`Не удалось подключиться к Omniroute: ${reason}`, 502);
  }

  if (!response.ok) {
    const details = (await response.text().catch(() => "")).slice(0, 1000);
    throw new OmnirouteError(`Omniroute API error: ${response.status}`, response.status, details);
  }

  let data: ChatCompletionResponse;

  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new OmnirouteError("Omniroute вернул некорректный JSON", 502);
  }

  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new OmnirouteError(
      "Omniroute вернул пустой ответ",
      502,
      JSON.stringify(data).slice(0, 500)
    );
  }

  return {
    content,
    model: data.model ?? model,
    usage: data.usage,
  };
}
