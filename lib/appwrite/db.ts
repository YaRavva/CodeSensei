import type { Models } from "node-appwrite";
import { AppwriteException, Query } from "node-appwrite";
import { getTablesDB } from "@/lib/appwrite/client";
import { DATABASE_ID } from "@/lib/appwrite/config";

export type AppwriteRow = Models.Row & Record<string, unknown>;

export function isNotFound(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 404;
}

export function isConflict(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 409;
}

export async function getRowOrNull(tableId: string, rowId: string): Promise<AppwriteRow | null> {
  try {
    const row = await getTablesDB().getRow({ databaseId: DATABASE_ID, tableId, rowId });
    return row as AppwriteRow;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function listRows(tableId: string, queries: string[] = []): Promise<AppwriteRow[]> {
  const tablesDB = getTablesDB();
  const pageSize = 100;
  const maxRows = 5000;
  const rows: AppwriteRow[] = [];
  let offset = 0;

  while (offset < maxRows) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [...queries, Query.limit(pageSize), Query.offset(offset)],
    });

    rows.push(...(response.rows as AppwriteRow[]));

    if (response.rows.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

/** Returns the number of rows matching the queries without fetching the rows. */
export async function countRows(tableId: string, queries: string[] = []): Promise<number> {
  const response = await getTablesDB().listRows({
    databaseId: DATABASE_ID,
    tableId,
    queries: [...queries, Query.limit(1)],
  });

  return response.total;
}

export async function createRow(
  tableId: string,
  data: Record<string, unknown>,
  rowId?: string
): Promise<AppwriteRow> {
  const row = await getTablesDB().createRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId: rowId ?? crypto.randomUUID(),
    data,
  });

  return row as AppwriteRow;
}

export async function updateRow(
  tableId: string,
  rowId: string,
  data: Record<string, unknown>
): Promise<AppwriteRow> {
  const row = await getTablesDB().updateRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    data,
  });

  return row as AppwriteRow;
}

export async function deleteRow(tableId: string, rowId: string): Promise<void> {
  try {
    await getTablesDB().deleteRow({ databaseId: DATABASE_ID, tableId, rowId });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function incrementColumn(
  tableId: string,
  rowId: string,
  column: string,
  value: number
): Promise<AppwriteRow> {
  const row = await getTablesDB().incrementRowColumn({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    column,
    value,
  });

  return row as AppwriteRow;
}

export { Query };
