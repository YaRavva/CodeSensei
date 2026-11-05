import { TABLES } from "@/lib/appwrite/config";
import { createRow, isConflict, listRows, Query } from "@/lib/appwrite/db";

export type XpSourceType = "task" | "achievement" | "adjustment";

export interface XpEvent {
  id: string;
  user_id: string;
  source_type: XpSourceType;
  source_id: string;
  amount: number;
  created_at: string;
}

/**
 * Records an XP award. Returns false when the same user already received XP for
 * this source: the unique index (user_id, source_type, source_id) makes awards
 * idempotent even for repeated or parallel requests.
 */
export async function recordXpEvent(input: {
  userId: string;
  sourceType: XpSourceType;
  sourceId: string;
  amount: number;
  details?: unknown;
}): Promise<boolean> {
  try {
    await createRow(TABLES.xpEvents, {
      user_id: input.userId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      amount: input.amount,
      details: input.details === undefined ? null : JSON.stringify(input.details),
      created_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    if (isConflict(error)) return false;
    throw error;
  }
}

export async function listXpEventsSince(since: Date): Promise<XpEvent[]> {
  const rows = await listRows(TABLES.xpEvents, [
    Query.greaterThanEqual("created_at", since.toISOString()),
  ]);
  return rows.map((row) => ({
    id: row.$id,
    user_id: String(row.user_id),
    source_type: row.source_type as XpSourceType,
    source_id: String(row.source_id),
    amount: Number(row.amount ?? 0),
    created_at: String(row.created_at),
  }));
}
