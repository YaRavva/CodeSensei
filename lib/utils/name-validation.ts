/**
 * Проверяет, соответствует ли имя минимальным требованиям (минимум 2 слова)
 * @param name Имя для проверки
 * @returns true если имя валидно или пустое, false если имя невалидно
 */
export function isValidName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") {
    return true;
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return true;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  for (const part of parts) {
    if (part.length < 2) {
      return false;
    }
  }

  return true;
}

export const isValidRussianName = isValidName;

/**
 * Получает сообщение об ошибке для невалидного имени
 */
export function getNameValidationError(name: string | null | undefined): string {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return "";
  }

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return "Имя должно содержать минимум 2 слова (например: Иван Петров или John Doe)";
  }

  for (const part of parts) {
    if (part.length < 2) {
      return "Каждая часть имени должна содержать минимум 2 символа";
    }
  }

  return "";
}

