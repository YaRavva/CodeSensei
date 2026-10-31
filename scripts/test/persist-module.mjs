/**
 * Persists the AI-generated "Строки" module into the Appwrite database
 * and publishes it (is_published = true).
 *
 * Converts the generated theory JSON into the same markdown description
 * format that the admin module form produces (see module-form.tsx:
 * description field), so the module renders correctly on the site.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();

// Admin user id used by all existing modules (creator of the live rows).
const CREATED_BY = "f3f0bfac-49e0-4280-9e85-9982f21cad55";

const generatedPath = resolve(dirname(fileURLToPath(import.meta.url)), "generated-module-stroki.json");
const generated = JSON.parse(readFileSync(generatedPath, "utf8"));

const { topic = "Строки", level = 2, description: shortDescription = "", theory } = generated;
if (!theory) {
  console.error("Generated module has no theory — aborting.");
  process.exit(1);
}

// Build markdown description exactly like components/admin/module-form.tsx
let description = "";
if (shortDescription) description += `${shortDescription}\n\n`;
if (theory.introduction) description += `## Введение\n\n${theory.introduction}\n\n`;

if (Array.isArray(theory.sections)) {
  theory.sections.forEach((section) => {
    if (section.heading) description += `## ${section.heading}\n\n`;
    if (section.content) description += `${section.content}\n\n`;
    if (Array.isArray(section.code_examples)) {
      section.code_examples.forEach((example) => {
        if (example.description) description += `### ${example.description}\n\n`;
        if (example.code) description += `\`\`\`python\n${example.code}\n\`\`\`\n\n`;
        if (example.output) description += `**Вывод:**\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
        if (example.explanation) description += `*${example.explanation}*\n\n`;
      });
    }
  });
}

if (theory.summary) description += `## Резюме\n\n${theory.summary}\n\n`;
if (Array.isArray(theory.key_concepts)) {
  description += "## Ключевые концепции\n\n";
  theory.key_concepts.forEach((concept) => {
    description += `- ${concept}\n`;
  });
  description += "\n";
}

const finalDescription = description.trim();

// Determine next order_index: max existing order_index among the same level + 1
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

async function withRetry(fn, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const waitMs = 500 * (i + 1);
      console.error(`Попытка ${i + 1} не удалась: ${error.code ?? error.message ?? error} — повтор через ${waitMs} мс`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

const existing = await withRetry(() =>
  tablesDB.listRows({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "modules",
    queries: [],
  })
);

const sameLevel = existing.rows.filter((row) => Number(row.level) === Number(level));
const orderIndex = Math.max(0, ...sameLevel.map((row) => Number(row.order_index ?? 0))) + 1;

// Check for an existing row with the same topic to keep the script idempotent.
const dup = existing.rows.find((row) => String(row.topic).toLowerCase() === String(topic).toLowerCase());
if (dup) {
  const updateBody = {
    title: topic,
    description: finalDescription,
    topic,
    level: Number(level),
    order_index: orderIndex,
    is_published: true,
  };
  await withRetry(() =>
    tablesDB.updateRow({
      databaseId: env.APPWRITE_DATABASE_ID,
      tableId: "modules",
      rowId: dup.$id,
      data: updateBody,
    })
  );
  console.log(`✓ Обновлён существующий модуль ${dup.$id} (topic "${topic}") и опубликован.`);
} else {
  const body = {
    title: topic,
    description: finalDescription,
    topic,
    level: Number(level),
    order_index: orderIndex,
    is_published: true,
    created_by: CREATED_BY,
  };
  const row = await withRetry(() =>
    tablesDB.createRow({
      databaseId: env.APPWRITE_DATABASE_ID,
      tableId: "modules",
      rowId: crypto.randomUUID(),
      data: body,
    })
  );
  console.log(`✓ Создан модуль ${row.$id} (topic "${topic}", level ${level}, order_index ${orderIndex}), опубликован.`);
}

console.log(`Description length: ${finalDescription.length} символов.`);
