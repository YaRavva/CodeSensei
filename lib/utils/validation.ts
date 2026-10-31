const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Проверка адреса почты для клиентской валидации (B9). */
export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Укажите почту";
  if (!EMAIL_PATTERN.test(trimmed)) return "Похоже, в адресе опечатка. Пример: name@school.ru";
  return null;
}

/** Минимальная длина пароля: 8 символов, как и на сервере. */
export function validatePassword(value: string): string | null {
  if (!value) return "Введите пароль";
  if (value.length < 8) return "Пароль короче 8 символов";
  return null;
}

/** Проверка совпадения паролей на экране восстановления. */
export function validatePasswordRepeat(password: string, repeat: string): string | null {
  if (!repeat) return "Повторите пароль";
  if (password !== repeat) return "Пароли не совпадают";
  return null;
}