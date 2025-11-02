// Пороги уровней согласно PRD
export const LEVEL_XP_THRESHOLDS = [
  0, // Level 1 (начальный)
  100, // Level 2
  250, // Level 3
  500, // Level 4
  1000, // Level 5
  2000, // Level 6
  3500, // Level 7
  5500, // Level 8
  8000, // Level 9
  12000, // Level 10
  17000, // Level 11
  23000, // Level 12
];

/**
 * Рассчитывает уровень пользователя на основе XP
 */
export function calculateLevel(totalXp: number): number {
  for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Рассчитывает прогресс до следующего уровня
 * @returns Объект с текущим уровнем, прогрессом и XP до следующего уровня
 */
export function calculateLevelProgress(totalXp: number) {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelIndex = currentLevel - 1;
  const currentThreshold = LEVEL_XP_THRESHOLDS[currentLevelIndex];
  const nextThreshold =
    LEVEL_XP_THRESHOLDS[currentLevelIndex + 1] ??
    LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
  const xpInCurrentLevel = totalXp - currentThreshold;
  const xpNeededForNext = nextThreshold - currentThreshold;
  const progress = Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100);

  return {
    currentLevel,
    currentXp: totalXp,
    currentThreshold,
    nextThreshold,
    xpInCurrentLevel,
    xpNeededForNext,
    progress,
  };
}
