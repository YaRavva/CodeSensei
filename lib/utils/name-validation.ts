/**
 * Проверка имени по правилам русского языка.
 *
 * Требуемый формат — «Фамилия Имя» (например, «Петров Иван»): так ученика
 * удобно искать по фамилии. Проверка формата выполняется без обращения к
 * ИИ-модели; окончательный вердикт о правильности фамилии и имени выносит
 * модель (см. lib/ai/name-checker.ts).
 */

const CYRILLIC_PART = /^[А-Яа-яЁё]+(?:[-'][А-Яа-яЁё]+)*$/;

/** Сообщение о пустом имени: его нужно заполнить, а не исправлять. */
export const NAME_REQUIRED_ERROR = "Укажите имя и фамилию";

/**
 * Проверяет структуру имени: ровно два слова, оба по-русски.
 *
 * @returns текст ошибки или null, если имя подходит по формату
 */
export function getNameValidationError(name: string | null | undefined): string {
  if (!name || typeof name !== "string") {
    return NAME_REQUIRED_ERROR;
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return NAME_REQUIRED_ERROR;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length !== 2) {
    return "Имя должно состоять из двух слов: фамилия и имя (например: Петров Иван)";
  }

  for (const part of parts) {
    if (part.length < 2) {
      return "Каждая часть имени должна содержать минимум 2 буквы";
    }

    if (!CYRILLIC_PART.test(part)) {
      return "Имя и фамилия должны быть написаны по-русски, кириллицей, без цифр и латиницы";
    }
  }

  return "";
}

/**
 * Соответствует ли имя формату «Фамилия Имя».
 */
export function isValidRussianName(name: string | null | undefined): boolean {
  return getNameValidationError(name) === "";
}
