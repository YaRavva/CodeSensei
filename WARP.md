# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

CodeSensei is an interactive Python trainer for Russian‑speaking school students (7–9 grades) built on:
- **Next.js 16 App Router** + React + TypeScript
- **Supabase (PostgreSQL)** for auth, profiles, XP, progress, achievements and content storage
- **Pyodide** in the browser to execute student Python code and run structured tests
- **Hugging Face Inference (openai/gpt-oss-20b)** for AI content generation and solution feedback

Most end‑user UI copy and documentation are in **Russian**; when generating user‑visible text (labels, messages, hints, task descriptions), prefer Russian.

## Key documentation

All high‑level product and architecture docs live in `docs/`:
- `docs/PRD.md` – main product requirements, XP system, phases of delivery
- `docs/DATABASE_SCHEMA.md` – PostgreSQL schema, RLS policies, example data
- `docs/ARCHITECTURE_RECOMMENDATIONS.md` – architectural decisions and example code for App Router, Pyodide, AI endpoints, testing, and deployment
- `docs/IMPROVED_AI_PROMPTS.md` – prompts and conventions for AI‑generated content
- `docs/README.md` – entrypoint into the documentation set and links to analysis/summary docs

When changing core flows (auth, XP, AI, modules/tasks), consult PRD + DATABASE_SCHEMA first and keep them as source of truth.

## Commands and development workflow

Use your preferred Node package manager (`pnpm` or `npm`); examples below use `pnpm`.

### Install dependencies

```bash
pnpm install
```

### Run dev server (Next.js App Router)

```bash
pnpm dev
```

This starts the Next.js dev server. Per project rules, **Warp should not start/stop or manage the dev server automatically** – let the user control it.

### Build and run in production mode

```bash
# Build
pnpm build

# Start production server
pnpm start
```

### Linting and formatting (Biome)

```bash
# Check only
pnpm lint

# Autofix issues
pnpm lint:fix

# Format codebase
pnpm format
```

When Warp edits TypeScript/React files, run `pnpm lint` (and `pnpm lint:fix` if appropriate) to ensure there are no syntax or style errors.

### Tests

There is currently **no configured Node/JS test runner or `test` script** in `package.json`. Automated behavior checks happen primarily:
- in‑browser via the Pyodide test runner (`lib/utils/test-runner.ts`), and
- via application‑level flows (e.g. XP/achievements/AI endpoints) rather than CLI tests.

If a JavaScript test runner is added in the future, document the `test` command and how to run a single test here.

## High‑level architecture

### App Router layout and routing

The app uses the Next.js **App Router** under `app/` with segmented routes:
- `app/layout.tsx` – root layout, imports `./globals.css` and wraps everything in `ClientLayout`. The `<html lang="ru">` indicates Russian locale.
- `app/(auth)/...` – authentication flows (`login`, `register`, `forgot-password`, `reset-password`) and Supabase session handling.
- `app/(dashboard)/dashboard` – main dashboard for a logged‑in user; aggregates Supabase data (`user_progress`, `task_attempts`, user profile) and passes it into `components/dashboard/dashboard-content`.
- `app/(dashboard)/leaderboard` – leaderboard UI on top of DB stats.
- `app/modules` – main learning modules catalog and per‑module view:
  - `app/modules/page.tsx` lists published modules, enforces valid profile name, and computes per‑module stats (task counts, progress).
  - `app/modules/[moduleId]/page.tsx` fetches a module + all its tasks, aggregates attempts into per‑module progress and user stats, and renders `ModuleUnifiedPage`.
  - `app/modules/[moduleId]/tasks/[taskId]/page.tsx` loads a single task with navigation to prev/next tasks and last attempt for that user.
- `app/(admin)/admin/...` – admin/teacher area:
  - `admin/modules` – list and manage modules using server‑side Supabase queries and `components/admin/modules-list`.
  - `admin/modules/new` – module creation via `ModuleForm`; server API routes handle actual DB inserts.
- `app/profile` – profile management (e.g. student display name), using `components/profile/profile-content`.

All protected pages rely on utilities from `lib/utils/auth.ts`:
- `requireAuth()` – creates a **server Supabase client**, fetches the current user + profile, and `redirect("/login")` when unauthenticated.
- `requireAdmin()` – builds on `requireAuth` to enforce `role === "admin" | "teacher"`, redirecting unauthorized users to `/modules`.

### Supabase integration and sessions

Supabase client wiring is centralized under `lib/supabase/`:
- `lib/supabase/server.ts` – SSR client using `createServerClient`, wired to Next.js `cookies()` for httpOnly cookie management and secure defaults (`httpOnly`, `sameSite`, `secure`). Used in server components and API routes.
- `lib/supabase/client.ts` – browser client using `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Auth/session flows (detailed in `docs/ARCHITECTURE_RECOMMENDATIONS.md` and PRD):
- After login, the app calls `POST /api/auth/set-session` to sync the Supabase session into httpOnly cookies for SSR.
- Sign‑out uses `POST /api/auth/signout` (server‑side cleanup) plus client‑side `supabase.auth.signOut()`.
- Role checks for admin/teacher are enforced primarily in UI/SSR (`requireAdmin`) instead of extra RPC calls inside hot paths, to avoid RLS flakiness.

### Python execution and test pipeline (Pyodide)

Student solutions are written in Python and executed **fully in the browser** via Pyodide:
- `components/editor/*` – Monaco‑based code editor, code runner and test results UI.
- `lib/utils/test-runner.ts` – core logic for running the configured JSON tests against student code:
  - Parses the user’s Python to locate the function name.
  - Builds a synthetic Python script that imports user code, calls the function with inputs converted from JS using `valueToPython` / `inputToPythonArgs`, and compares results with `_test_compare` helper.
  - Executes the script via `pyodide.runPythonAsync`, then reads `_test_result`, `_test_passed` and `_test_error` back into JS.
  - Cleans up temporary Python globals after each test.
  - `runTestSuite` resets captured stdout and runs all test cases in sequence, aggregating pass/fail counts and execution time.

The expected test case format is documented in `docs/README.md` and `docs/DATABASE_SCHEMA.md` (JSON with `input` + `expected_output`). Admins define these test cases via the admin UI (`components/admin/test-cases-editor.tsx`), and they are stored in the DB.

### XP, levels, progress and achievements

Gamification logic is factored into `lib/utils/` and database RPCs:

- `xp-calculation.ts`
  - Implements the PRD XP rules: base XP per difficulty (`easy`/`medium`/`hard`), attempt multipliers (1st/2nd/3+), penalties for AI hints and bonuses for perfect/no‑hint/fast solutions.
  - Returns a detailed `breakdown` array suitable for explaining XP to the student in the UI.

- `levels.ts`
  - Encodes level XP thresholds from PRD in `LEVEL_XP_THRESHOLDS`.
  - `calculateLevel(totalXp)` and `calculateLevelProgress(totalXp)` turn XP into the current level and progress to the next level; used on the dashboard and profile.

- `progress.ts`
  - (Marked as deprecated) implements an older flow that combined XP updates and `user_progress` tracking per module. Current logic is moved into `/api/tasks/award-xp` and DB‑level logic; prefer working against the API route and DB schema instead of extending this file.

- `achievements.ts`
  - Encapsulates **achievement engine** logic:
    - `checkAndAwardAchievements` loads active achievements, checks conditions per user (`task_count`, `module_count`, streaks, time‑of‑day, first‑day, no‑hints, etc.), writes `user_achievements` rows and updates user XP/level via the `calculate_user_level` RPC.
    - `getUserAchievements` joins `user_achievements` with `achievements` for display on the dashboard.
  - This file is the main place to extend or debug achievement behavior, but any schema changes must stay in sync with `docs/DATABASE_SCHEMA.md`.

Dashboard and leaderboard pages consume these aggregates to render high‑level progress (`app/(dashboard)/dashboard/page.tsx`, `components/dashboard/dashboard-content.tsx`, and `components/leaderboard/leaderboard-content.tsx`).

### AI endpoints and rate limiting

AI operations are handled by Next.js API routes under `app/api/` and utilities in `lib/utils/`:

- `app/api/ai/generate-module/route.ts`
  - Authenticates the user via server Supabase client.
  - Uses RPC `get_user_role` to ensure the user is an `admin` or `teacher`.
  - Imports `checkRateLimit` / `logGeneration` from `lib/utils/rate-limit.ts` to enforce per‑user daily quotas stored in `ai_generation_logs`.
  - Calls the Hugging Face chat‑completions endpoint with model `openai/gpt-oss-20b` and a Russian prompt to get a **JSON description + theory sections** for a teaching module.
  - Includes robust JSON extraction and recovery: strips Markdown fences, searches for the first JSON object, fixes common formatting artifacts and tries multiple parsing/repair strategies. If parsing still fails, it falls back to returning the raw text in `description` so the UI can continue working.

- `app/api/tasks/evaluate/route.ts`
  - Authenticates the student and loads minimal task metadata.
  - Sends code, runtime output and a summary of test results to the same Hugging Face endpoint, asking for JSON `{ score: 0..1, feedback: string }`.
  - Parses (or falls back) and returns a numeric score and textual feedback; the caller decides whether the solution “passes” (currently `score >= 0.7`).

- `lib/utils/rate-limit.ts`
  - `checkRateLimit(userId, "module" | "task")` counts rows in `ai_generation_logs` for the current date and returns `{ canGenerate, remaining, error? }`.
  - `logGeneration(userId, ...)` inserts a row keyed by user/date/type, tolerating unique‑constraint races.

These pieces together implement admin‑side AI content generation and student‑side AI feedback while protecting the Hugging Face quota.

## Language, tools and assistant‑specific conventions

This repo also contains rules for other assistants under `.qoder/rules/general.md`. The most important conventions for Warp are:

- **Language:** UI and documentation are Russian. When generating user‑facing copy (UI text, prompts, error messages shown in the browser), prefer Russian.
- **Terminal:** Use PowerShell‑style commands where relevant (the primary shell here is PowerShell on Windows).
- **Dev server:** Do **not** automatically start/stop/restart the Next.js dev server; assume the user controls it.
- **Linting after edits:** After making code changes, run Biome via `pnpm lint` (and `pnpm lint:fix` if appropriate) to avoid leaving syntax/style errors.
- **Single best solution:** When modifying code, apply one well‑reasoned solution instead of presenting multiple alternative implementations.
- **Styling changes:** When adjusting theme or UI styles, keep light and dark themes in sync (see `components/theme-provider.tsx` / `components/theme-toggle.tsx` for how theme is wired).

Use this file as the canonical place to extend Warp‑specific rules or add concrete workflows as the project evolves.
