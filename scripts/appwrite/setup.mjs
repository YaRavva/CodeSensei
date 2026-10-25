/**
 * Creates (or updates) the CodeSensei database schema on a self-hosted Appwrite.
 *
 * Usage:
 *   pnpm appwrite:setup
 *
 * Requires APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY
 * (read from .env.local automatically through the npm script).
 */

import { Client, TablesDB } from "node-appwrite";
import { DATABASE_ID, tables } from "./schema.mjs";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const columnCreators = {
  varchar: (params) => tablesDB.createVarcharColumn(params),
  text: (params) => tablesDB.createTextColumn(params),
  mediumtext: (params) => tablesDB.createMediumtextColumn(params),
  longtext: (params) => tablesDB.createLongtextColumn(params),
  integer: (params) => tablesDB.createIntegerColumn(params),
  float: (params) => tablesDB.createFloatColumn(params),
  boolean: (params) => tablesDB.createBooleanColumn(params),
  datetime: (params) => tablesDB.createDatetimeColumn(params),
  email: (params) => tablesDB.createEmailColumn(params),
  url: (params) => tablesDB.createUrlColumn(params),
  enum: (params) => tablesDB.createEnumColumn(params),
};

async function ensureDatabase() {
  try {
    await tablesDB.get({ databaseId: DATABASE_ID });
    console.log(`database "${DATABASE_ID}" already exists`);
  } catch (error) {
    if (error.code !== 404) throw error;
    await tablesDB.create({ databaseId: DATABASE_ID, name: "CodeSensei" });
    console.log(`database "${DATABASE_ID}" created`);
  }
}

function columnPayload(tableId, column) {
  const payload = {
    databaseId: DATABASE_ID,
    tableId,
    key: column.key,
    required: column.required ?? false,
  };

  if (column.size !== undefined) payload.size = column.size;
  if (column.default !== undefined) payload.xdefault = column.default;
  if (column.elements !== undefined) payload.elements = column.elements;

  return payload;
}

async function waitForColumns(tableId, expected) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    const byKey = new Map(table.columns.map((column) => [column.key, column]));

    if (expected.every((key) => byKey.get(key)?.status === "available")) {
      return table;
    }

    await sleep(400);
  }

  throw new Error(`Timed out waiting for columns of "${tableId}"`);
}

async function ensureTable(definition) {
  let table;

  try {
    table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId: definition.id });
    console.log(`table "${definition.id}" already exists`);
  } catch (error) {
    if (error.code !== 404) throw error;
    table = await tablesDB.createTable({
      databaseId: DATABASE_ID,
      tableId: definition.id,
      name: definition.name,
      permissions: [],
      rowSecurity: false,
      columns: [],
    });
    console.log(`table "${definition.id}" created`);
  }

  const existingColumns = new Set(table.columns.map((column) => column.key));

  for (const column of definition.columns) {
    if (existingColumns.has(column.key)) continue;

    const create = columnCreators[column.type];
    if (!create) throw new Error(`Unsupported column type "${column.type}"`);

    await create(columnPayload(definition.id, column));
    console.log(`  + column ${definition.id}.${column.key} (${column.type})`);
  }

  await waitForColumns(
    definition.id,
    definition.columns.map((column) => column.key),
  );

  const currentIndexes = new Set(table.indexes?.map((index) => index.key) ?? []);

  for (const index of definition.indexes) {
    if (currentIndexes.has(index.key)) continue;

    try {
      await tablesDB.createIndex({
        databaseId: DATABASE_ID,
        tableId: definition.id,
        key: index.key,
        type: index.type,
        columns: index.columns,
      });
      console.log(`  + index ${definition.id}.${index.key} (${index.type})`);
    } catch (error) {
      // 409 means a concurrent run already created it.
      if (error.code !== 409) throw error;
    }
  }
}

async function main() {
  console.log(`Appwrite endpoint: ${process.env.APPWRITE_ENDPOINT}`);
  console.log(`Project: ${process.env.APPWRITE_PROJECT_ID}`);

  await ensureDatabase();

  for (const definition of tables) {
    await ensureTable(definition);
  }

  const result = await tablesDB.listTables({ databaseId: DATABASE_ID });
  console.log(`\nDone. Tables: ${result.total}`);
  for (const table of result.tables) {
    console.log(` - ${table.$id} (${table.columns.length} columns, ${table.indexes?.length ?? 0} indexes)`);
  }
}

main().catch((error) => {
  console.error(`\nSchema setup failed: ${error.type ?? ""} ${error.message ?? error}`);
  process.exit(1);
});
