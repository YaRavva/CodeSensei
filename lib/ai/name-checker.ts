/**
 * Проверка имени ученика ИИ-моделью.
 *
 * Требуемый формат — «Фамилия Имя» (например, «Петров Иван»): так ученика
 * удобно искать по фамилии. Проверка выполняется при регистрации и при каждом
 * входе; вердикт сохраняется в профиле, чтобы не платить за API повторно.
 *
 * Проверка не блокирует пользователя, если модель недоступна: сбой сервиса не
 * должен выкидывать ученика с сайта.
 */

import { createChatCompletion, isOmnirouteConfigured, OmnirouteError } from "@/lib/ai/omniroute";
import { saveNameCheckResult } from "@/lib/appwrite/users";
import { buildNameCheckPrompt, parseNameCheckResponse } from "@/lib/prompts";
import { getNameValidationError } from "@/lib/utils/name-validation";
import type { NameCheckStatus, UserProfile } from "@/types/db";

/** Максимальная длина имени, при которой проверка имеет смысл. */
const MAX_NAME_LENGTH = 100;

/** Время ожидания ответа модели: проверка не должна задерживать вход. */
const TIMEOUT_MS = 20_000;

/** Через сколько после неудачной проверки имя стоит проверить заново. */
const RETRY_AFTER_MS = 30 * 60 * 1000;

export interface NameVerdict {
  status: NameCheckStatus;
  reason: string;
  suggestedName?: string;
}

/**
 * Предварительная проверка без обращения к модели: имя, которое заведомо не
 * может быть в формате «Фамилия Имя», не отправляется в API.
 */
export function preflightNameCheck(name: string | null | undefined): NameVerdict | null {
  const trimmed = name?.trim() ?? "";

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { status: "invalid", reason: "Имя слишком длинное" };
  }

  // Правила формата одни и те же на клиенте и на сервере.
  const error = getNameValidationError(trimmed);

  return error ? { status: "invalid", reason: error } : null;
}

/**
 * Спрашивает модель о верном ли имени. Возвращает null, если проверка не
 * удалась: вызывающий код трактует это как «пропустить ученика».
 */
async function askModel(name: string): Promise<NameVerdict | null> {
  if (!isOmnirouteConfigured()) return null;

  try {
    const completion = await createChatCompletion({
      messages: [{ role: "user", content: buildNameCheckPrompt(name) }],
      temperature: 0,
      maxTokens: 500,
      timeoutMs: TIMEOUT_MS,
    });

    const parsed = parseNameCheckResponse(completion.content);

    if (!parsed) return null;

    return {
      status: parsed.valid ? "valid" : "invalid",
      reason: parsed.reason.slice(0, 250),
      suggestedName: parsed.suggested_name || undefined,
    };
  } catch (error) {
    if (error instanceof OmnirouteError) {
      console.error("Name check AI error:", error.message, error.details);
      return null;
    }

    // Любая другая ошибка тоже не должна блокировать ученика.
    console.error("Name check failed:", error);
    return null;
  }
}

/**
 * Проверяет имя без обращения к БД.
 *
 * Статус "unknown" означает, что модель была недоступна: имя пропускают без
 * блокировки.
 */
export async function checkName(name: string | null | undefined): Promise<NameVerdict> {
  const trimmed = name?.trim() ?? "";

  const preflight = preflightNameCheck(trimmed);

  if (preflight) return preflight;

  const verdict = await askModel(trimmed);

  return verdict ?? { status: "unknown", reason: "" };
}

/**
 * Проверяет имя и сохраняет вердикт в профиле.
 */
export async function checkAndStoreName(
  userId: string,
  name: string | null | undefined
): Promise<NameVerdict> {
  const trimmed = name?.trim() ?? "";
  const verdict = await checkName(trimmed);

  await storeVerdict(userId, trimmed, verdict.status, verdict.reason || null);

  return verdict;
}

/**
 * Сохранение вердикта не должно ломать вход: если колонки ещё не созданы или
 * запись не удалась, ученик просто проходит дальше.
 */
async function storeVerdict(
  userId: string,
  checkedName: string,
  status: NameCheckStatus,
  reason: string | null
): Promise<void> {
  try {
    await saveNameCheckResult(userId, { status, checkedName, reason });
  } catch (error) {
    console.error("Failed to store name check result:", error);
  }
}

/**
 * Нужно ли проверять имя заново: вердикт получен для другого имени или
 * проверка ещё не выполнялась.
 *
 * Вердикт "unknown" (сервис был недоступен) повторяется через
 * RETRY_AFTER_MS: иначе сбой модели оставил бы имя непроверенным навсегда.
 */
export function needsNameCheck(profile: UserProfile): boolean {
  const current = profile.display_name?.trim() ?? "";

  if (!current) return true;
  if (profile.name_check_status === "unchecked") return true;

  if (profile.name_checked_name?.trim() !== current) return true;

  if (profile.name_check_status === "unknown") {
    const checkedAt = profile.name_checked_at ? Date.parse(profile.name_checked_at) : 0;

    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > RETRY_AFTER_MS) return true;
  }

  return false;
}

/**
 * Требует ли профиль исправления имени: вердикт «invalid» и он относится
 * к текущему имени.
 */
export function requiresNameFix(profile: UserProfile): boolean {
  if (profile.name_check_status !== "invalid") return false;

  const current = profile.display_name?.trim() ?? "";

  return profile.name_checked_name?.trim() === current;
}
