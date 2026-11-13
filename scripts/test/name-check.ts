/**
 * Ручная проверка ИИ-вердикта по имени: показывает, что именно модель
 * считает корректным форматом «Фамилия Имя».
 *
 * Usage:
 *   node --env-file-if-exists=.env.local --import tsx scripts/test/name-check.ts
 */

import { checkName } from "@/lib/ai/name-checker";

const NAMES = [
  "Петров Иван",
  "Иван Петров",
  "Кузнецова Мария",
  "John Doe",
  "Петров",
  "Петров Иван Петров",
  "О'Нил Патрик",
  "Роум-Ричардс Алиса",
  "Петров Иван123",
  "Иванов-Петров Сергей",
];

async function main() {
  for (const name of NAMES) {
    const verdict = await checkName(name);
    console.log(`${verdict.status.padEnd(8)} | ${name.padEnd(22)} | ${verdict.reason}`);
  }
}

main();
