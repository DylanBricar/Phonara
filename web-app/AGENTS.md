# AGENTS.md

This file is the entrypoint for AI agents working in this repo. The detailed rules live in `.agents/rules/`; agents must read the relevant rule files manually because that directory is not guaranteed to be auto-loaded.

`CLAUDE.md` is a thin deeplink to this file; do not duplicate guidance there.

## About the project <NAME>

If you read this, ask question about the project to fill this part. You need to describe what is the purpose of the project, main feature and goals.

## Project Foundation

NowStack is a TanStack Start + Convex SaaS starter/app with Better Auth organizations, Stripe billing, admin/account areas, docs/blog/changelog content, email templates, and Cloudflare R2 uploads.

## Stack

- Frontend: TanStack Start, TanStack Router, React 19, TailwindCSS v4, shadcn/base-ui components.
- Backend: Convex only. Do not add Prisma, PostgreSQL, or DB-mirroring flows unless explicitly requested.
- Auth: Better Auth through `@convex-dev/better-auth`; auth state and org data live in Convex.
- Billing: Stripe SDK calls live in Convex actions; Stripe webhooks go to Convex `httpAction`.
- Forms: TanStack Form. `react-hook-form` exists only for legacy code and must not be used for new forms.

## Non-Negotiable Workflow

1. Before editing any file, read at least 3 relevant existing files: similar implementations plus imported helpers whose API is not obvious.
2. Before editing files under `convex/`, read `convex/_generated/ai/guidelines.md`.
3. Before touching a domain covered by `.agents/rules/`, read the matching rule file from the index below.
4. When the user reports a bug while `pnpm start-all` is running, tail `.logs/web.txt` and `.logs/convex.txt` before guessing.
5. After code or maintenance changes, update `CHANGELOG.md` under today's `## YYYY-MM-DD` section.
6. Do not revert unrelated worktree changes. This repo often has user work in progress.

## Rule Index

Use this index before planning edits. If a rule path matches the files or behavior you will touch, read it first.

- `.agents/rules/api-routes.md` - Editing `src/routes/api/**/*.ts`; API routes use inline auth + `try/catch` + `handleApiError`, not middleware chains.
- `.agents/rules/authentication.md` - Auth, sessions, org access, client session UI, or Convex auth helpers.
- `.agents/rules/changelog.md` - Any code, docs, rule, config, or maintenance change.
- `.agents/rules/code-conventions.md` - General TS/React styling, state, forms, backend, API requests, file storage.
- `.agents/rules/convex-authorization-dto.md` - Convex org/admin builders, roles, permissions, DTO mappers, and centralized billing plan/status constants.
- `.agents/rules/convex-imports.md` - Any import from `convex/`; use `@convex/*`, never relative paths.
- `.agents/rules/convex-queries.md` - Any `convex/**/*.ts`; use indexes, bounded reads, no `.filter()` scans.
- `.agents/rules/development-commands.md` - Typecheck, lint, build, tests, Convex deploy, email preview, Stripe command choices.
- `.agents/rules/dialog-manager.md` - Any modal/dialog/confirm/input/custom dialog UI. Use `dialogManager`, do not create one-off modals.
- `.agents/rules/file-naming.md` - New or moved Convex modules, routes, schemas, components, hooks, tests.
- `.agents/rules/mdx.md` - `content/**/*.mdx` or `content/**/*.md`; frontmatter title is the H1, content starts at H2.
- `.agents/rules/page-skeletons.md` - Any route file. Every route needs a custom `pendingComponent` matching the final layout.
- `.agents/rules/read-logs.md` - Runtime bugs, blank page, failing mutation, HMR issue, auth redirect issue.
- `.agents/rules/start-commands.md` - Starting or changing dev processes; `pnpm start-all` is canonical.
- `.agents/rules/stripe-billing.md` - Stripe, billing, plans, subscriptions, Stripe env vars, webhooks.
- `.agents/rules/tanstack-form.md` - New or modified forms. Use `useForm` / `Form` from `@/features/form/tanstack-form`.
- `.agents/rules/testing.md` - Adding or running unit/e2e tests. Use CI commands, not watch/UI modes.
- `.agents/rules/ui-ux.md` - UI polish; no emojis and no gradients unless explicitly requested.

## Commands

- `pnpm start-all` - canonical local dev command; runs Convex + TanStack Start and writes `.logs/web.txt` / `.logs/convex.txt`.
- `pnpm start-all -p <port>` - same, custom web port and matching `SITE_URL`.
- `pnpm ts` - TypeScript check.
- `pnpm lint` - ESLint with fixes.
- `pnpm lint:ci` - ESLint without fixes.
- `pnpm test:ci` - Vitest once.
- `pnpm test:e2e:ci` - Playwright headless.
- `pnpm build` - production build.
- `pnpm convex:dev` - Convex dev/codegen only.
- `pnpm convex:deploy` - deploy current Convex deployment.

Never run `pnpm test` or `pnpm test:e2e` in agent workflows; they are interactive/watch commands.

## Runtime Logs

`pnpm start-all` truncates and rewrites these files on every start:

- `.logs/web.txt` - Vite/TanStack Start, SSR errors, route warnings, HMR/build errors.
- `.logs/convex.txt` - Convex dev, schema validation, query/mutation/action logs, deployment state.

Read the tail first:

```bash
tail -n 100 .logs/web.txt .logs/convex.txt
```

If the files are missing or empty, the unified dev server is not running.

## Browser Verification

Use the `dev-browser` skill/CLI for browser work. It is the required path for opening pages, clicking through flows, filling forms, taking screenshots, inspecting UI state, and verifying local runtime behavior.

- Prefer `dev-browser` over ad hoc Playwright scripts, `open`, manual browser steps, or other browser automation.
- Keep scripts small and focused; use stable page names such as `main` so browser state persists between commands.
- Use `page.snapshotForAI()` for structure and screenshots for visual layout checks.
- If `dev-browser` is missing, install it from `https://github.com/SawyerHood/dev-browser` before browser verification.

## Important Files

- `src/lib/auth-server.ts` - Convex + Better Auth server bindings: `fetchAuthQuery`, `fetchAuthMutation`, `fetchAuthAction`, `getToken`, `handler`.
- `src/lib/auth-client.ts` - Better Auth client: `useSession`, `authClient`.
- `src/lib/auth/auth-user.ts` - `getUser`, `getRequiredUser`, admin helpers.
- `src/lib/organizations/get-org.ts` - `getCurrentOrg`, `getRequiredCurrentOrg`.
- `src/lib/api-middleware.ts` - API route error handling via `handleApiError`.
- `src/features/form/tanstack-form.tsx` - canonical form wrapper and field components.
- `src/features/dialog-manager/` - global dialog system.
- `src/components/ui/` - shadcn/base-ui primitives.
- `src/components/nowts/` - shared project components.
- `src/site-config.ts` - site and product configuration.
- `convex/schema.ts` - app Convex schema.
- `convex/auth.config.ts`, `convex/auth/`, `convex/betterAuth/` - Better Auth wiring.
- `convex/http.ts`, `convex/stripe/actions.ts` - Convex HTTP routes and Stripe webhook/action flow.
- `scripts/start-all.sh` - unified dev process and log writer.
- `scripts/setup-stripe-webhook.mjs` - idempotent Stripe webhook setup for Convex.
- `scripts/worktree-context.sh`, `scripts/worktree-setup.sh`, `scripts/worktree-cleanup.sh` - canonical worktree environment scripts.

## Import Rules

- Always use path aliases: `@/*` for `src/*`, `@email/*` for `emails/*`, `@convex/*` for `convex/*`.
- Never import from `convex/` with relative paths.
- Use `@/lib/up-fetch.ts` for HTTP requests; do not introduce raw `fetch` for app API calls.

## Server And Data Rules

- App data reads and writes should go through Convex queries, mutations, or actions.
- API routes under `src/routes/api/` do not support declarative middleware chains; authenticate inline and catch errors with `handleApiError`.
- From API route or route-loader server code, call Convex with `fetchAuthQuery`, `fetchAuthMutation`, or `fetchAuthAction`.
- Inside Convex org/admin functions, use `orgQuery`, `orgMutation`, `orgAction`, `adminQuery`, `adminMutation`, or `adminAction`; do not hand-roll auth checks.
- Inside other Convex functions, use project helpers such as `requireAuth`; do not use raw `ctx.auth` directly.
- Convex queries must use schema indexes with `.withIndex()`. Avoid `.filter()`, unbounded `.collect()`, and `.collect().length`.
- Keep Convex env vars in Convex. If cloning env for worktrees, use transient `.env-convex`, apply it, then delete it.

## Frontend Rules

- Use TanStack Router conventions: `$param` segments, `(group)` pathless folders, `_components/` and `_actions/` private folders. Do not use Next.js `[slug]`.
- Every route, including layout and redirect-only routes, needs a custom `pendingComponent`.
- Use TanStack Form for forms and Convex mutations/actions for submissions.
- Use `dialogManager` for modal flows.
- Use `Skeleton` layouts that match the final page structure.
- Prefer shared typography from `@/components/nowts/typography.tsx`.
- Avoid emojis and gradients unless the user explicitly asks for them.

## Billing And Files

- Stripe checkout/customer portal flows are Convex actions.
- Stripe webhooks go to Convex `POST /stripe/webhook`, mounted in `convex/http.ts`; they do not go through Vercel/TanStack API routes.
- Never expose or externally call `*FromWebhook` internal subscription mutations.
- Cloudflare R2 is the only file backend. Upload through `convex/files/actions.ts`.

## Worktree Environment

- Use one canonical script path per action. Do not add wrapper duplicates for Codex, Cursor, or Conductor.
- Canonical scripts live in `scripts/worktree-setup.sh`, `scripts/worktree-cleanup.sh`, and shared helpers in `scripts/worktree-context.sh`.
- This repo is Convex-only; do not add PostgreSQL/Prisma setup or cleanup.
- Worktree Convex deployments use separate `dev/<slug>` deployments when setup requires isolation.

## Verification

Choose checks based on the change:

- Types-only/shared logic: `pnpm ts`.
- Lint-sensitive edits: `pnpm lint:ci` or `pnpm lint`.
- Unit-covered logic: `pnpm test:ci`.
- Routes/UI flows: start with `pnpm start-all -p <port>`, inspect logs, and use `dev-browser` verification when behavior matters.
- Convex changes: read guidelines first, then run the appropriate Convex codegen/dev/check path for the change.

Record any skipped verification and why in the final response.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
