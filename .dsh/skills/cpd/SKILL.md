---
name: cpd
description: >
  Commit, push and deploy CodeSensei in one step. Use when the user invokes /cpd,
  or asks to commit, push and deploy together. Performs all three without asking
  for confirmation, then reports one line per step.
whenToUse: >
  The user typed /cpd, or wrote some combination of "commit", "push" and "deploy"
  as a single instruction. Not for a request that names only one of the three.
---

# /cpd — commit, push, deploy (CodeSensei)

Run all three, in order. **The invocation itself is the authorization** — do not ask
for confirmation, and do not stop between steps unless a step actually fails.

## 1. Commit

1. `git status` and `git diff` in `C:\Users\Ravva\CodeSensei`.
2. Check for secrets before staging: `.env`, `.env.local`, `.appwrite/`, `*.pem`,
   `/.migration/`. If one would be staged, unstage it and report instead of committing.
3. `git add -A` unless there is unrelated work in progress.
4. Write a real commit message: imperative mood, subject at most 72 characters, no
   trailing period. Match the style of `git log --oneline -10`.
5. **If the working tree is clean**, report `Nothing to commit` and stop — do not
   deploy, since there is nothing new to publish.

## 2. Push

1. `git push` on `main`.
2. Report the pushed range, for example `15ed44c..40a11a4 main -> main`.
3. **Exit code caveat.** On Windows `git push` writes progress to stderr, so
   PowerShell reports exit code 1 even on success. Treat the push as failed only when
   no `<old>..<new> main -> main` line was printed.
4. Never force-push unless explicitly asked.

## 3. Deploy

Follow the project's `appwrite-sites-deploy` skill; load it before touching the deploy.
The short form:

1. `pnpm tsc --noEmit` — must be clean.
2. `pnpm next build` — must succeed. **If the build fails, stop and report; never
   deploy a broken build.**
3. Stage clean source into `C:\Users\Ravva\CodeSensei-deploy`, excluding
   `node_modules`, `.next`, `.env.local`, `.git`.
4. Confirm required configs are present in staging — in particular
   `postcss.config.js`: without it the remote build succeeds but all styling breaks.
5. Deploy:

   ```
   appwrite sites create-deployment --site-id codesensei --activate true --code "C:\Users\Ravva\CodeSensei-deploy"
   ```

## Reporting

Report one line per step:

- commit hash and subject,
- pushed range,
- deployment id and the `activate` flag.

**Do not poll or wait for the deployment to finish.** Run the deploy command in the
background, read the deployment record it prints, and finish. The user verifies the
live site themselves.
