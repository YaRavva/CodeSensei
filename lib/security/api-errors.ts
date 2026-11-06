import { NextResponse } from "next/server";

/**
 * The response of an API route must not tell the client what went wrong
 * inside: the text of an exception can carry the URL of an internal service,
 * a fragment of a request with a key, or the path of a file.
 *
 * The details are written to the server log, where they are needed to find
 * the cause, and the client receives a short message written for people.
 */

/** The message the client receives when the AI service fails. */
export const AI_SERVICE_UNAVAILABLE = "AI-сервис временно недоступен. Повторите позже.";

/** The message the client receives when the request could not be handled. */
export const UNEXPECTED_ERROR = "Не удалось выполнить запрос. Повторите позже.";

/**
 * Logs the error on the server and returns a response without the details of
 * the failure.
 */
export function serverError(
  context: string,
  error: unknown,
  message: string = UNEXPECTED_ERROR,
  status = 500
): NextResponse {
  console.error(`${context}:`, error);
  return NextResponse.json({ error: message }, { status });
}
