import { TABLES } from "@/lib/appwrite/config";
import { countRows, createRow, listRows, Query } from "@/lib/appwrite/db";
import { toAiGenerationLog } from "@/lib/appwrite/mappers";
import type { AiGenerationLog } from "@/types/db";

export type GenerationType = AiGenerationLog["generation_type"];

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function countGenerationsToday(
  userId: string,
  generationType: GenerationType
): Promise<number> {
  return countRows(TABLES.aiLogs, [
    Query.equal("user_id", userId),
    Query.equal("generation_type", generationType),
    Query.equal("created_date", todayKey()),
  ]);
}

export async function hasGenerationToday(
  userId: string,
  generationType: GenerationType
): Promise<boolean> {
  return (await countGenerationsToday(userId, generationType)) > 0;
}

export async function logGeneration(userId: string, generationType: GenerationType): Promise<void> {
  if (await hasGenerationToday(userId, generationType)) return;

  try {
    await createRow(TABLES.aiLogs, {
      user_id: userId,
      generation_type: generationType,
      created_at: new Date().toISOString(),
      created_date: todayKey(),
    });
  } catch {
    // Unique index (user_id, generation_type, created_date) — already logged.
  }
}

export async function listGenerations(userId: string): Promise<AiGenerationLog[]> {
  const rows = await listRows(TABLES.aiLogs, [
    Query.equal("user_id", userId),
    Query.orderDesc("created_at"),
  ]);

  return rows.map(toAiGenerationLog);
}
