/**
 * Applies the CodeSensei auth email templates to Appwrite.
 *
 * Usage:
 *   pnpm appwrite:emails
 *
 * Templates are stored for both `en` (the instance default locale) and `ru`
 * so the Russian copy is used regardless of locale resolution.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Project } from "node-appwrite";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));

const templates = [
  {
    id: "verification",
    subject: "Подтвердите email — CodeSensei",
    file: "verification.html",
  },
  {
    id: "recovery",
    subject: "Сброс пароля — CodeSensei",
    file: "recovery.html",
  },
];

const locales = ["en", "ru"];
const senderName = "CodeSensei";
const senderEmail = "no-reply@ravva.su";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const project = new Project(client);

async function main() {
  for (const template of templates) {
    const message = readFileSync(join(here, "templates", template.file), "utf8");
    for (const locale of locales) {
      const result = await project.updateEmailTemplate({
        templateId: template.id,
        locale,
        subject: template.subject,
        message,
        senderName,
        senderEmail,
      });
      console.log(`+ ${template.id} [${locale}] subject="${result.subject}" sender=${result.senderEmail}`);
    }
  }
  console.log("\nDone. Auth email templates applied.");
}

main().catch((error) => {
  console.error(`\nTemplate apply failed: ${error.type ?? ""} ${error.message ?? error}`);
  process.exit(1);
});