/**
 * Утилиты для расчета XP при выполнении заданий
 */

export interface XPCalculationParams {
  baseXP: number; // Базовая награда за задание (из xp_reward)
  difficulty: "easy" | "medium" | "hard";
  attemptNumber: number; // Номер попытки (1, 2, 3+)
  usedAiHint: boolean; // Использована ли AI-подсказка
  isFirstAttempt: boolean; // Решено с первой попытки
  executionTime?: number; // Время выполнения в мс
  averageExecutionTime?: number; // Среднее время выполнения для этой задачи (опционально)
}

export interface XPCalculationResult {
  baseXP: number;
  attemptMultiplier: number;
  hintPenalty: boolean;
  bonuses: {
    perfectSolution: number; // +5 XP за идеальное решение
    noHints: number; // +3 XP без подсказок
    speed: number; // +2 XP за скорость
  };
  totalXP: number;
  breakdown: string[]; // Описание расчета для отображения
}

/**
 * Базовые значения XP по сложности
 */
const BASE_XP_BY_DIFFICULTY: Record<"easy" | "medium" | "hard", number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

/**
 * Множители по попыткам
 */
const ATTEMPT_MULTIPLIERS: Record<number, number> = {
  1: 1.0, // Первая попытка: 100%
  2: 0.7, // Вторая попытка: 70%
  // 3+: 0.5 (обрабатывается отдельно)
};

/**
 * Бонусы
 */
const BONUSES = {
  PERFECT_SOLUTION: 5, // Идеальное решение (первая попытка)
  NO_HINTS: 3, // Без подсказок
  SPEED: 2, // Быстрое решение
} as const;

/**
 * Рассчитывает XP за выполнение задания
 */
export function calculateXP(params: XPCalculationParams): XPCalculationResult {
  const { baseXP, attemptNumber, usedAiHint, isFirstAttempt, executionTime, averageExecutionTime } = params;

  // Используем базовое значение из задания или по умолчанию по сложности
  const actualBaseXP = baseXP || BASE_XP_BY_DIFFICULTY[params.difficulty];

  // Определяем множитель попытки
  let attemptMultiplier = ATTEMPT_MULTIPLIERS[attemptNumber] || 0.5; // 3+ попытка = 0.5x
  
  // Если использована подсказка, применяем штраф 0.5x вместо обычного множителя
  const hintPenalty = usedAiHint;
  if (hintPenalty) {
    attemptMultiplier = 0.5;
  }

  // Базовый XP с учетом множителя
  const baseWithMultiplier = Math.round(actualBaseXP * attemptMultiplier);

  // Бонусы
  const bonuses = {
    perfectSolution: 0,
    noHints: 0,
    speed: 0,
  };

  // Бонус за идеальное решение (первая попытка + успешно)
  if (isFirstAttempt && attemptNumber === 1 && !usedAiHint) {
    bonuses.perfectSolution = BONUSES.PERFECT_SOLUTION;
  }

  // Бонус за решение без подсказок
  if (!usedAiHint) {
    bonuses.noHints = BONUSES.NO_HINTS;
  }

  // Бонус за скорость (если есть данные о среднем времени)
  if (executionTime && averageExecutionTime && executionTime < averageExecutionTime * 0.7) {
    bonuses.speed = BONUSES.SPEED;
  }

  // Итоговый XP
  const totalXP = baseWithMultiplier + bonuses.perfectSolution + bonuses.noHints + bonuses.speed;

  // Формируем описание расчета
  const breakdown: string[] = [];
  breakdown.push(`Базовая награда: ${actualBaseXP} XP`);
  breakdown.push(`Множитель попытки ${attemptNumber}: ${(attemptMultiplier * 100).toFixed(0)}% = ${baseWithMultiplier} XP`);
  
  if (hintPenalty) {
    breakdown.push(`Штраф за использование подсказки: 50%`);
  }
  
  if (bonuses.perfectSolution > 0) {
    breakdown.push(`Бонус "Идеальное решение": +${bonuses.perfectSolution} XP`);
  }
  if (bonuses.noHints > 0) {
    breakdown.push(`Бонус "Без подсказок": +${bonuses.noHints} XP`);
  }
  if (bonuses.speed > 0) {
    breakdown.push(`Бонус "Скорость": +${bonuses.speed} XP`);
  }
  breakdown.push(`Итого: ${totalXP} XP`);

  return {
    baseXP: actualBaseXP,
    attemptMultiplier,
    hintPenalty,
    bonuses,
    totalXP,
    breakdown,
  };
}

