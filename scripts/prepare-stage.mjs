import fs from 'node:fs';
import path from 'node:path';

const repo = 'C:/Users/Ravva/CodeSensei';
const stage = 'C:/Users/Ravva/CodeSensei-deploy';

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

const dirs = ['app', 'components', 'hooks', 'lib', 'types', 'public', 'node_modules', '.next'];
for (const d of dirs) {
  console.log(`Copying dir: ${d}`);
  copyRecursiveSync(path.join(repo, d), path.join(stage, d));
}

const scriptDirs = ['appwrite', 'migrate'];
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
  'biome.json',
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

console.log('Staging preparation with node_modules completed successfully.');
