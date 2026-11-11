---
name: appwrite-sites-deploy
description: "Use when building and deploying a Next.js site to a self-hosted Appwrite via Appwrite Sites on Windows, especially the CodeSensei project. Covers local production build, preparing a small staging directory for a real source deployment, `appwrite sites create-deployment` from CLI (run in the background — the build takes 1-3 min and does not need to be awaited), activation, and post-deploy page verification run in the background ~3 minutes later. Triggers: deploy appwrite site, create-deployment, build nextjs for appwrite sites, self-hosted appwrite deploy, codesensei deploy."
metadata:
  author: Ravva
  version: "1.3.0"
---

# Appwrite Sites Deploy (self-hosted)

## Scope

Deploys a Next.js (App Router, SSR via Appwrite adapter) site to a **self-hosted**
Appwrite 1.9.x instance using the **Appwrite Sites** capability and the Appwrite CLI.
The reference project is **CodeSensei** (`siteId: codesensei`, project
`6adc4f50003202881547`, DB `codesensei`, TablesDB-based).

This skill encodes the exact working procedure plus the traps discovered while
fixing "Runtime not supported", OAuth failures, and SSR timeouts on this project.
Follow it **in order** — every step exists because an earlier shortcut failed.

## Key facts about Environment Variables (`.env.local` vs Appwrite Site Variables)

- **Local Development & Build**: `.env.local` in the project root holds local environment variables (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_API_KEY`, etc.) used during `npm run dev` and local `npm run build`.
- **Production Runtime on Appwrite Sites**: Appwrite Sites runtime container does **not** read `.env.local`. All production environment variables are stored as **Appwrite Site Variables** on the server (`appwrite sites create-variable` or `update-variable`).
- **`.env.local` must NOT be included in staging** when deploying code via `appwrite sites create-deployment --code`.

## Key facts about the two Appwrite hosts (must understand, do not mix up)

- `https://aw.note-canopus.ts.net/v1` — Tailscale hostname, historically used for CLI
  login/session. **NOT reachable from the site container** (`fetch failed`).
- `https://appwrite.ravva.su/v1` — public Cloudflare-fronted endpoint, **must be used
  by the site runtime**, verified via `/v1/health/version` → `{"version":"1.9.6"}`.
- `appwrite.config.json` `endpoint` must match the **current** CLI session endpoint
  or CLI refuses with "does not match the current login session endpoint".
  Currently the CLI session is on `appwrite.ravva.su` — so the committed
  `appwrite.config.json` was updated to that. If a task says otherwise, check
  `appwrite client --debug` first.
- Site variables are secret/write-only: `listVariables` returns empty visible strings
  (`length: 0`), so **verify by behavior, not by reading values**. If in doubt,
  recreate the site variable via `appwrite sites update-variable --variable-id <name> --value <val> --secret --site-id codesensei`.

## Prerequisites

- Node 22, pnpm/npm installed, `node_modules` present.
- Appwrite CLI logged in (session endpoint = the endpoint in `appwrite.config.json`).
  Verify with `appwrite client --debug`.
- `.env.local` with required Appwrite keys for local testing.
- Staging dir: `C:\Users\Ravva\CodeSensei-deploy`.

## Step 1 — Local checks (typecheck + build)

Run in the repo root `C:\Users\Ravva\CodeSensei`:

- `npm run typecheck` (tsc --noEmit) — must be clean.
- `npm run build` (next build, Turbopack) — must end with "Compiled successfully" and list routes.
  The build takes a minute or two — run it **in the background** and continue with
  staging preparation while it finishes.

## Step 2 — Prepare the staging dir (CRITICAL: DO NOT INCLUDE node_modules)

**Reason:** 
1. `create-duplicate-deployment` rebuilds the ORIGINAL frozen source archive (`sourceSize` stays constant), so code edits never reach production unless you use `create-deployment --code` with a fresh staging directory.
2. **Never include `node_modules` or `.next` in staging.** Including `node_modules` results in a huge archive (~1.5–3 GB), which violates Appwrite storage limits (`The file size exceeds maximum allowed size`). 
3. **Always deploy clean source code only** (~220 KB archive: `app`, `components`, `hooks`, `lib`, `types`, `public`, `scripts/appwrite`, `scripts/migrate`, `package.json`, `package-lock.json`, and core config files). OpenRuntimes builder will safely install dependencies and build on the server.

Do NOT copy: `node_modules`, `.next`, `.env.local`, `.env`, `.git`, `.migration`, `scripts/test`.

**CRITICAL — `proxy.ts` MUST be in staging.**
The root `proxy.ts` (Next 16 renamed `middleware` to `proxy`) holds the CSRF
check, the session redirect and the Content Security Policy nonce. If it is
missing from the staging archive, the site builds and starts, but the proxy
never runs: there is no CSRF protection and no CSP, and nothing warns you.
Copy it as a single root file.

**CRITICAL — `next.config.ts` MUST NOT import project files.**
The deployment platform compiles `next.config.ts` on its own and runs it as a
plain Node module, so an `import` of a file from the project becomes a runtime
`require` of a path that is not in the deployment:

```
Error: Cannot find module './lib/security/csp'
Require stack:
- /usr/local/server/src/function/next.config.compiled.js
```

The site then fails at startup with every request hanging. Keep
`next.config.ts` self-contained: only `import type { NextConfig } from "next"`
(type-only imports are erased at compile time). The security headers live
directly in `next.config.ts`; the CSP with its per-request nonce lives in
`proxy.ts`.

**CRITICAL — Required config files that MUST be in staging:**
The following files are essential for the remote build to succeed. Missing any of them will cause silent CSS/style failures or build errors:

| File | Purpose |
|---|---|
| `postcss.config.js` (or `.mjs`) | Tailwind CSS v4 processing — **without this, all styles are broken** |
| `tailwind.config.ts` (or `.js`) | Tailwind theme configuration |
| `components.json` | shadcn/ui component registry |
| `next-env.d.ts` | Next.js TypeScript declarations |
| `appwrite.config.json` | Appwrite CLI endpoint configuration |
| `package.json` + `package-lock.json` | Dependencies lock |
| `next.config.ts` (or `.js`) | Next.js build configuration — must stay self-contained |
| `proxy.ts` | CSRF check, session redirect, CSP nonce — **without it there is no CSRF and no CSP** |
| `tsconfig.json` | TypeScript compiler options |
| `app/globals.css` | Global styles and Tailwind directives |

**Pre-deploy staging verification (PowerShell):**
```powershell
$staging = "C:\Users\Ravva\CodeSensei-deploy"
$required = @("postcss.config.js","postcss.config.mjs","tailwind.config.ts","components.json","next-env.d.ts","appwrite.config.json","package.json","package-lock.json","next.config.ts","proxy.ts","tsconfig.json")
$missing = $required | Where-Object { !(Test-Path (Join-Path $staging $_)) }
if ($missing) {
  Write-Host "ERROR: Missing required files in staging:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
# next.config.ts must not import project files: the platform runs it as a
# plain Node module, so the import would fail at runtime.
$badImports = Select-String -Path (Join-Path $staging "next.config.ts") -Pattern '^\s*import\s+(?!type)' -ErrorAction SilentlyContinue
if ($badImports) {
  Write-Host "ERROR: next.config.ts imports a value from another file:" -ForegroundColor Red
  $badImports | ForEach-Object { Write-Host "  - $($_.Line.Trim())" -ForegroundColor Red }
  exit 1
}
```
If `postcss.config.js` is missing, the build will succeed but **all CSS styles will be completely broken** in production (white unstyled pages).
If `proxy.ts` is missing, the site works but **CSRF protection and the CSP are silently absent**.

## Step 3 — Deploy from CLI (асинхронно, без ожидания)

```
appwrite sites create-deployment --site-id codesensei --activate true --code "C:\Users\Ravva\CodeSensei-deploy"
```

- **Деплой запускается в фоне и не блокирует работу.** Не жди его завершения в
  этом же вызове: команда стримит удалённые логи сборки в реальном времени и
  занимает 1–3 минуты. Запусти её в фоне (`run_in_background`) или отдельной
  командой с `&` и переходи к следующим задачам.
- **Understanding CLI Blocking / "Hanging"**: `appwrite sites create-deployment` blocks the terminal shell because it streams remote build logs in real-time from OpenRuntimes. **This is normal and does not mean it is frozen.** A clean source build takes ~1–3 minutes.
- **Handling npm / store-dir conflicts**: Ensure no global/local `.npmrc` containing `store-dir` (from pnpm) leaks into the environment or staging, as this causes remote npm builds to hang in deadlock.
- **Verification via SDK**: If you prefer non-blocking execution or if CLI throws serialization bugs (`Go unmarshal error` on `list-logs`), poll deployment status via Node.js SDK:
  ```js
  const dep = await sites.getDeployment({ siteId: "codesensei", deploymentId });
  // wait until status === "ready"
  ```
- **Быстрая проверка статуса без ожидания** (одноразовый опрос):
  ```bash
  node --env-file-if-exists=.env.local -e "
  const { Client, Sites } = require('node-appwrite');
  const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
  new Sites(c).listDeployments({ siteId: 'codesensei' }).then(r => {
    const d = r.deployments[0];
    console.log(d.\$id, d.status, 'buildDuration=' + d.buildDuration);
  });"
  ```
  Статусы: `waiting` → `building` → `ready` | `failed`.

## Step 4 — Post-deploy verification (в фоне, через 3 минуты после деплоя)

**Не проверяй прод сразу после запуска деплоя.** Сборка идёт на сервере 1–3
минуты, и сайт переключается на новую версию только после `ready` + активации.
Проверку запускай **в фоне с задержкой ~3 минуты** и не блокируй этим терминал:

```bash
# В фоне: подождать 3 минуты и прогнать проверки
(sleep 180; bash scripts/check-prod.sh) &
```

Где `scripts/check-prod.sh` — набор запросов: коды ответов на `/login`,
`/register`, `/verify-email`, `/reset-password`, `/forgot-password`, `/modules`
(307 без сессии — норма), наличие `/emails/katana.png`, непустой заголовок
`Content-Security-Policy` (если он пуст — `proxy.ts` не попал в деплой),
cross-site POST → 403 (проверка CSRF), пустой токен подтверждения → 400.

Дополнительно (по SSH на `aw`) во время ожидания можно посмотреть контейнер
сборки: `docker ps | grep <deploymentId>` — контейнер `...-build` живёт, пока
идёт сборка.

Если деплой упал (`failed`), смотри логи на сервере:
`docker logs appwrite-worker-builds --since 15m`.

