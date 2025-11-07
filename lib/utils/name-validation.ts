/**
 * Проверяет, соответствует ли имя формату "Фамилия Имя" на русском языке
 * @param name Имя для проверки
 * @returns true если имя соответствует формату, false в противном случае
 */
export function isValidRussianName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }

  const trimmed = name.trim();
  
  // Проверяем, что имя не пустое
  if (trimmed.length === 0) {
    return false;
  }

  // Разбиваем на части (должно быть минимум 2 слова: Фамилия и Имя)
  const parts = trimmed.split(/\s+/).filter(Boolean);
  
  if (parts.length < 2) {
    return false;
  }

  // Проверяем, что каждая часть содержит только русские буквы (и возможно дефисы для двойных фамилий/имен)
  const russianLetterPattern = /^[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)*$/;
  
  // Проверяем каждую часть
  for (const part of parts) {
    if (!russianLetterPattern.test(part)) {
      return false;
    }
    
    // Проверяем, что первая буква заглавная
    if (part[0] !== part[0].toUpperCase()) {
      return false;
    }
    
    // Проверяем, что остальные буквы строчные (кроме возможных дефисов)
    const rest = part.slice(1).replace(/-/g, "");
    if (rest !== rest.toLowerCase()) {
      return false;
    }
  }

  return true;
}

/**
 * Получает сообщение об ошибке для невалидного имени
 */
export function getNameValidationError(name: string | null | undefined): string {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return "Имя обязательно для заполнения";
  }

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return "Имя должно содержать фамилию и имя (например: Иванов Иван)";
  }

  const russianLetterPattern = /^[А-ЯЁа-яё]+(-[А-ЯЁа-яё]+)*$/;
  
  for (const part of parts) {
    if (!russianLetterPattern.test(part)) {
      return "Имя должно содержать только русские буквы (например: Иванов Иван)";
    }
    
    if (part[0] !== part[0].toUpperCase()) {
      return "Каждое слово должно начинаться с заглавной буквы (например: Иванов Иван)";
    }
  }

  return "Имя должно быть в формате 'Фамилия Имя' на русском языке";
}

