import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Repo = current directory; staging = STAGE_DIR or ../CodeSensei-deploy next to the repo.
const repo = process.cwd();
const stage = process.env.STAGE_DIR || path.resolve(repo, '..', 'CodeSensei-deploy');

// A secret in a tracked file would be shipped to the server. Fail before staging.
execFileSync(process.execPath, [path.join(repo, 'scripts', 'check-secrets.mjs')], {
  cwd: repo,
  stdio: 'inherit',
});

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Cleaning stage directory...');
if (fs.existsSync(stage)) {
  fs.rmSync(stage, { recursive: true, force: true });
}
fs.mkdirSync(stage, { recursive: true });

// EXCLUDE node_modules and .next per skill v1.2.0 (clean source staging ~220 KB)
const dirs = ['app', 'components', 'hooks', 'lib', 'types', 'public'];
for (const d of dirs) {
  console.log(`Copying dir: ${d}`);
  copyRecursiveSync(path.join(repo, d), path.join(stage, d));
}

const scriptDirs = ['appwrite'];
for (const s of scriptDirs) {
  console.log(`Copying script dir: ${s}`);
  copyRecursiveSync(path.join(repo, 'scripts', s), path.join(stage, 'scripts', s));
}

const files = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'tsconfig.json',
  'appwrite.config.json',
  'proxy.ts',
    'components.json',
  'next-env.d.ts'
];

for (const f of files) {
  const src = path.join(repo, f);
  if (fs.existsSync(src)) {
    console.log(`Copying file: ${f}`);
    copyRecursiveSync(src, path.join(stage, f));
  }
}

console.log('Clean staging preparation completed successfully (node_modules and .next excluded).');
