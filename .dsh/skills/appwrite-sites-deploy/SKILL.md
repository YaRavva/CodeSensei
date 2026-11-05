---
name: appwrite-sites-deploy
description: "Use when building and deploying a Next.js site to a self-hosted Appwrite via Appwrite Sites on Windows, especially the CodeSensei project. Covers local production build, preparing a small staging directory for a real source deployment, `appwrite sites create-deployment` from CLI, activation, and post-deploy page verification. Triggers: deploy appwrite site, create-deployment, build nextjs for appwrite sites, self-hosted appwrite deploy, codesensei deploy."
metadata:
  author: Ravva
  version: "1.2.0"
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

## Step 2 — Prepare the staging dir (CRITICAL: DO NOT INCLUDE node_modules)

**Reason:** 
1. `create-duplicate-deployment` rebuilds the ORIGINAL frozen source archive (`sourceSize` stays constant), so code edits never reach production unless you use `create-deployment --code` with a fresh staging directory.
2. **Never include `node_modules` or `.next` in staging.** Including `node_modules` results in a huge archive (~1.5–3 GB), which violates Appwrite storage limits (`The file size exceeds maximum allowed size`). 
3. **Always deploy clean source code only** (~220 KB archive: `app`, `components`, `hooks`, `lib`, `types`, `public`, `scripts/appwrite`, `scripts/migrate`, `package.json`, `package-lock.json`, and core config files). OpenRuntimes builder will safely install dependencies and build on the server.

Do NOT copy: `node_modules`, `.next`, `.env.local`, `.env`, `.git`, `.migration`, `scripts/test`.

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
| `next.config.ts` (or `.js`) | Next.js build configuration |
| `tsconfig.json` | TypeScript compiler options |
| `app/globals.css` | Global styles and Tailwind directives |

**Pre-deploy staging verification (PowerShell):**
```powershell
$staging = "C:\Users\Ravva\CodeSensei-deploy"
$required = @("postcss.config.js","postcss.config.mjs","tailwind.config.ts","components.json","next-env.d.ts","appwrite.config.json","package.json","package-lock.json","next.config.ts","tsconfig.json")
$missing = $required | Where-Object { !(Test-Path (Join-Path $staging $_)) }
if ($missing) {
  Write-Host "ERROR: Missing required files in staging:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
```
If `postcss.config.js` is missing, the build will succeed but **all CSS styles will be completely broken** in production (white unstyled pages).

## Step 3 — Deploy from CLI & Managing CLI Blocking Behavior

```
appwrite sites create-deployment --site-id codesensei --activate true --code "C:\Users\Ravva\CodeSensei-deploy"
```

- **Understanding CLI Blocking / "Hanging"**: `appwrite sites create-deployment` blocks the terminal shell because it streams remote build logs in real-time from OpenRuntimes. **This is normal and does not mean it is frozen.** A clean source build takes ~1–3 minutes.
- **Handling npm / store-dir conflicts**: Ensure no global/local `.npmrc` containing `store-dir` (from pnpm) leaks into the environment or staging, as this causes remote npm builds to hang in deadlock.
- **Verification via SDK**: If you prefer non-blocking execution or if CLI throws serialization bugs (`Go unmarshal error` on `list-logs`), poll deployment status via Node.js SDK:
  ```js
  const dep = await sites.getDeployment({ siteId: "codesensei", deploymentId });
  // wait until status === "ready"
  ```

## Step 4 — Post-deploy verification

Probe key routes (`/login`, `/register`, `/modules`, `/dashboard`, `/profile`) with a valid session cookie to confirm HTTP 200 responses.
