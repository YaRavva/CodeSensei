# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

CodeSensei is an interactive Python trainer for Russian-speaking school students (7–9 grades)
built on:

- **Next.js 16 App Router** + React 19 + TypeScript (Tailwind CSS 4, shadcn/ui)
- **Self-hosted Appwrite 1.9** (TablesDB) for auth, profiles, XP, progress, achievements and content
- **Pyodide** in the browser to execute student Python code and run structured tests
- **Omniroute** (`OMNIROUTE_MODEL`, по умолчанию `antigravity/gemini-3-flash`) for AI content generation and solution feedback

Most end-user UI copy and documentation are in **Russian**; when generating user-visible text
(labels, messages, hints, task descriptions), prefer Russian.

## Key documentation

- `docs/PRD.md` – product requirements, XP system, delivery phases
- `docs/DATABASE_SCHEMA.md` – historical PostgreSQL schema; the live schema is Appwrite
- `docs/APPWRITE.md` – Appwrite setup, tables, permissions, auth architecture
- `docs/IMPROVED_AI_PROMPTS.md` – prompts and conventions for AI-generated content
- `docs/README.md` – entrypoint into the documentation set

When changing core flows (auth, XP, AI, modules/tasks), consult PRD and
`docs/APPWRITE.md`, and keep them in sync.

## Commands and development workflow

Use `pnpm` (the repo has both lockfiles, but pnpm is the primary one).

```bash
pnpm install            # dependencies
pnpm dev                # Next.js dev server (the user controls it)
pnpm build              # production build
pnpm start              # production server
pnpm lint               # Biome check
pnpm lint:fix           # Biome autofix
pnpm typecheck          # tsc --noEmit
pnpm appwrite:setup     # create/update Appwrite database, tables, columns, indexes
pnpm appwrite:seed      # seed achievements and demo modules/tasks
```

`appwrite:*` scripts read `.env.local` automatically. See `docs/APPWRITE.md` for the
required variables and API-key scopes.

### Tests

There is no Node/JS test runner configured. Behaviour checks happen in the browser via the
Pyodide test runner (`lib/utils/test-runner.ts`) and through application flows.

## High-level architecture

### App Router layout

- `app/layout.tsx` – root layout, wraps everything in `ClientLayout`, `<html lang="ru">`.
- `app/(auth)/...` – login, register, forgot/reset password (Appwrite auth via API routes).
- `app/(dashboard)/dashboard` – user dashboard (progress, attempts, achievements).
- `app/(dashboard)/leaderboard` – leaderboard built from Appwrite user rows.
- `app/(dashboard)/achievements` – full achievement collection.
- `app/modules` – module catalog and per-module workspace with tasks.
- `app/modules/[moduleId]/tasks/[taskId]` – single task page.
- `app/(admin)/admin/...` – admin/teacher area (module and task CRUD).
- `app/profile` – profile management.
- `app/api/...` – all data access endpoints (see below).

Protected pages use `lib/utils/auth.ts`:

- `requireAuth()` – reads the Appwrite session cookie, validates it with the session client,
  loads/creates the profile and redirects to `/login` when unauthenticated.
- `requireAdmin()` – additionally requires `role === "admin" | "teacher"`.

### Appwrite integration

All database access is server-side; the API key never reaches the browser.

- `lib/appwrite/config.ts` – env settings, cookie name, table IDs.
- `lib/appwrite/client.ts` – admin client (API key) and session client factories.
- `lib/appwrite/db.ts` – typed row helpers (`getRowOrNull`, `listRows`, `countRows`, ...).
- `lib/appwrite/mappers.ts` – Appwrite row → application object (JSON columns are parsed here).
- `lib/appwrite/users.ts`, `modules.ts`, `tasks.ts`, `attempts.ts`, `progress.ts`,
  `achievements.ts`, `ai-logs.ts` – repositories.
- `lib/appwrite/api.ts` – shared auth/role guards for route handlers.
- `lib/appwrite/session.ts` – HttpOnly session cookie helpers.

Auth flow:

- `POST /api/auth/login` creates an Appwrite email/password session and stores the session
  secret in the `a_session_<PROJECT_ID>` HttpOnly cookie.
- `GET /api/auth/me` returns `{ user, profile }` for the browser `AuthProvider`.
- `POST /api/auth/logout` deletes the Appwrite session and clears the cookie.
- `proxy.ts` checks cookie presence for protected routes.

Client components never call Appwrite directly; they call Next.js route handlers:

- `GET/POST /api/tasks/attempts` – load attempts for tasks / save a new attempt.
- `POST /api/tasks/award-xp` – XP calculation, module progress, achievements.
- `POST /api/tasks/evaluate`, `POST /api/ai/*` – AI feedback, hints, content generation.
- `PATCH /api/profile` – update display name.
- `GET /api/achievements` – active achievements + earned rows.
- `GET/POST /api/admin/modules`, `GET/PATCH/DELETE /api/admin/modules/[moduleId]`,
  `GET/POST /api/admin/modules/[moduleId]/tasks`, `GET/PATCH/DELETE /api/admin/tasks/[taskId]`
  – admin CRUD.

### Python execution and test pipeline (Pyodide)

Student solutions run fully in the browser via Pyodide (CDN `v314.0.7`):

- `components/editor/*` – Monaco editor, runner and test results UI.
- `hooks/use-pyodide.ts` – loads Pyodide once and captures `stdout`.
- `lib/utils/test-runner.ts` – builds a synthetic Python script, calls the student function
  with JSON test inputs and compares results.

Test cases are stored as JSON strings in `tasks.test_cases` (see
`docs/DATABASE_SCHEMA.md` for the format). Admins edit them in
`components/admin/test-cases-editor.tsx`.

### XP, levels, progress and achievements

- `lib/utils/xp-calculation.ts` – PRD XP rules (difficulty, attempt multiplier, hints,
  perfect/fast bonuses) with a human-readable breakdown.
- `lib/utils/levels.ts` – level thresholds and `calculateLevel`.
- `lib/appwrite/progress.ts` – per-module progress and completion recalculation.
- `lib/utils/achievements.ts` – achievement engine (condition checks, awarding, XP).
- `lib/appwrite/achievements.ts` – achievement/user-achievement queries.

Achievement definition changes must keep `docs/APPWRITE.md` and the seed script
(`scripts/appwrite/seed.mjs`) in sync.

### AI endpoints and rate limiting

- `app/api/ai/generate-module/route.ts` – admin/teacher only; Omniroute chat completion
  returning JSON for a module description; robust JSON extraction with fallback.
- `app/api/ai/generate-task/route.ts` – AI-generated task draft.
- `app/api/ai/hint/route.ts` – step-by-step hint for a student.
- `app/api/tasks/evaluate/route.ts` – AI score `0..1` + feedback (`score >= 0.7` passes).
- `lib/utils/rate-limit.ts` + `lib/appwrite/ai-logs.ts` – per-user daily quota stored in
  `ai_generation_logs` (unique index per user/type/date).

## Language, tools and conventions

Repo rules for other assistants live in `.qoder/rules/general.md` and `.cursor/rules/`.

- **Language:** UI and documentation are Russian; user-facing copy should be Russian.
- **Shell:** PowerShell on Windows.
- **Dev server:** do not start/stop/restart it automatically.
- **Linting:** run `pnpm lint` (and `pnpm lint:fix` if appropriate) after edits; TypeScript
  checks via `pnpm typecheck`.
- **One solution:** apply one well-reasoned implementation instead of alternatives.
- **Styling:** keep light and dark themes in sync (`components/theme-provider.tsx`).
- **Secrets:** never commit `.env.local`; the Appwrite API key is server-only.
