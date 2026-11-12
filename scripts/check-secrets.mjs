/**
 * Scans tracked files for hardcoded secrets.
 *
 * The Appwrite API key and the Omniroute key live in .env.local (gitignored)
 * and in Appwrite Sites variables (marked secret). Nothing in the repository
 * may contain their values, and no script may carry a session secret: a
 * committed key is readable by anyone with the repository.
 *
 * Usage:
 *   node scripts/check-secrets.mjs
 *
 * Exits with code 1 when a secret is found.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Patterns of a secret value that must never be committed. */
const PATTERNS = [
  { name: "Appwrite API key", regex: /\bstandard_[A-Za-z0-9]{40,}\b/g },
  { name: "Appwrite session secret", regex: /\b[a-f0-9]{20}_[a-f0-9]{64}\b/g },
  { name: "OpenAI-style API key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
];

/** Files where a secret is expected to be read at runtime, never stored. */
const ALLOWED = new Set([".env.example"]);

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

function isBinary(path) {
  try {
    const buffer = readFileSync(resolve(root, path));
    return buffer.includes(0);
  } catch {
    return true;
  }
}

const findings = [];

for (const path of trackedFiles()) {
  if (ALLOWED.has(path)) continue;

  let content;
  try {
    content = readFileSync(resolve(root, path), "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;

  for (const { name, regex } of PATTERNS) {
    const matches = content.match(regex);
    if (!matches) continue;

    for (const match of matches) {
      const line = content.slice(0, content.indexOf(match)).split("\n").length;
      findings.push({ path, name, line, preview: `${match.slice(0, 12)}…` });
    }
  }
}

if (findings.length > 0) {
  console.error("Hardcoded secrets found in tracked files:\n");
  for (const finding of findings) {
    console.error(`  ${finding.path}:${finding.line}  ${finding.name}  ${finding.preview}`);
  }
  console.error("\nMove the value into .env.local (gitignored) or an Appwrite Sites secret variable.");
  process.exit(1);
}

console.log(`No hardcoded secrets in ${trackedFiles().length} tracked files.`);
