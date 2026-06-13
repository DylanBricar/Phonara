---
name: step-02-vercel-setup
description: Link Vercel project, write vercel.json with the Convex deploy script, and normalize Vercel env to deploy keys only
prev_step: step-01-convex-prod.md
next_step: step-03-deploy.md
---

# Step 2: Vercel Setup

## Goal

By the end of this step:

1. The repo is linked to a Vercel project (`.vercel/project.json` exists).
2. `vercel.json` uses `pnpm convex:deploy:vercel` as the build command.
3. Vercel env contains only the Convex deploy keys needed for builds.
4. App/runtime secrets are removed from Vercel because Convex owns them.

## Rules

- Use `vercel link` only when `.vercel/project.json` is missing.
- Do not add Stripe, Resend, OAuth, R2, Better Auth, database, or public app vars to Vercel.
- Use `pnpm vercel:setup-convex-env` to prune Vercel env and ensure `CONVEX_PROD_DEPLOY_KEY` exists for preview builds.
- Do not run `vercel deploy` in this step.

## Execution

### 1. Verify Vercel Link

```bash
test -f .vercel/project.json && cat .vercel/project.json || vercel link
```

### 2. Verify `vercel.json`

The canonical file is:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm convex:deploy:vercel",
  "framework": null,
  "installCommand": "pnpm install --frozen-lockfile"
}
```

This makes Vercel run the repo script, which calls `convex deploy --cmd "pnpm build" --cmd-url-env-var-name VITE_CONVEX_URL`.

### 3. Normalize Vercel Env

Run:

```bash
pnpm vercel:setup-convex-env
```

This script:

- removes obsolete app/runtime env vars from Vercel Production, Preview, and Development;
- keeps `CONVEX_DEPLOY_KEY` for Production;
- keeps `CONVEX_DEPLOY_KEY` for Preview;
- creates and adds `CONVEX_PROD_DEPLOY_KEY` to Preview when missing.

With the current Vercel CLI, adding an all-preview variable may ask for a git branch. Press Enter to apply it to all Preview branches.

### 4. Verify

```bash
vercel env ls
```

Expected remaining variables:

```text
CONVEX_DEPLOY_KEY       Production
CONVEX_DEPLOY_KEY       Preview
CONVEX_PROD_DEPLOY_KEY  Preview
```

## Success Metrics

✅ `vercel.json` uses `pnpm convex:deploy:vercel`.
✅ `vercel env ls` shows only Convex deploy keys.
✅ No app/runtime secrets remain in Vercel.

## Next Step

Load `step-03-deploy.md`.
