# Changelog

## 2026-05-15

REFACTOR: Inline legacy route page components into TanStack index route files

## 2026-05-14

CHORE: Make init-project R2 provisioning idempotent and include DNS edit for custom domains
CHORE: Prefer Cloudflare R2 custom domains during init-project storage provisioning
CHORE: Add Cloudflare R2 bucket and access-token provisioning to init-project
CHORE: Replace the AGENTS rule index table with a readable list
CHORE: Replace Claude instructions file with a symlink to AGENTS.md
FIX: Send Better Auth organization permission checks with the supported permissions payload
CHORE: Bootstrap GitHub repository setup at the start of init-project
FIX: Mark Convex API proxy handlers as async for lint compliance
CHORE: Move root test and skill artifacts into canonical project folders
FIX: Require an authenticated user before redirecting the landing page to organizations
FIX: Replace lingering old project identity with NowStack configuration defaults
FIX: Align single-action card footers to the right

## 2026-05-13

REFACTOR: Move organization member UI out of route-local files and reuse the shared invite member form
REFACTOR: Split admin organization member management into reusable role, member table, and invitation table components
FIX: Show admin organization invitations and move invite submission into the dialog footer
FEATURE: Let platform admins invite organization members, change any member role, and remove any member from admin organization details
FIX: Isolate Better Auth cookie names per worktree so parallel local sign-ins can use separate accounts
FIX: Avoid Better Auth dynamic imports when listing, creating, and deleting organization API keys in Convex
FIX: Align the organization delete action to the right in danger settings
FIX: Show clean client error messages across the app instead of raw Convex request wrappers
REFACTOR: Convert the admin user Organizations action icon into a dropdown with Open organization and Copy ID
REFACTOR: Replace app-side Better Auth adapter queries with indexed component data functions
REFACTOR: Replace Better Auth adapter calls in apiKeys mutations and queries with auth.api._ high-level methods and remove redundant organization null checks in orgApiQuery handlers
REFACTOR: Move /api/v1/_ routes from TanStack into Convex HTTP router and delete the duplicate TanStack route files and public-api helper
REFACTOR: Split api-keys index route into focused \_components (skeleton, empty, table, row, dialog-content, format-date)
REFACTOR: Extract NowStack dialog primitives and reuse them in route and manager dialogs
FIX: Align create organization route dialog with the shared bordered dialog footer style
FIX: Add breathing room between the create organization form fields and the footer button
REFACTOR: Share header and footer shell between /orgs/list and /orgs/new and redesign the empty organizations state
FIX: Route every in-app organization creation link through the intercepted dialog mask
FIX: Match admin Users and Organizations filter button height to the small columns control
REFACTOR: Align admin feedback list with the cleaner Users and Organizations table layout
FEATURE: Add admin subscription discount modes with an automatic Stripe 100% off coupon and a cleaner Free/Custom toggle UI
FEATURE: Show admin subscription billing details with coupon, discount value, billing price, and plan benefits
FIX: Let admin 100% off subscriptions activate the selected plan even when Stripe price env vars are missing
FIX: Automatically create Stripe customers after organization creation and repair missing admin billing customers on Billing view
FIX: Persist contact feedback submissions into admin feedback and remove empty feedback search URLs
REFACTOR: Align admin organization Members tab styling with the Sessions tab for a clean, consistent look
REFACTOR: Align admin user Organizations tab styling with the Sessions tab for a clean, consistent look
FEATURE: Open organization creation from the organization list as an intercepted route dialog
FIX: Replace placeholder API documentation domains with the configured production domain
REFACTOR: Rename the organization API route skill to org-api-route and capture API-key endpoint lessons
FIX: Replace the API keys docs block with a minimal Docs link beside the page title
FIX: Split organization member API documentation into separate list and detail endpoint pages
FEATURE: Add `/api/v1/me` for API-key organization details and keep member API responses member-focused
FIX: Move one-time API key reveal into a dialog and render existing API keys in a table with dropdown actions
FIX: Surface public API documentation URLs from the organization API keys settings page
FIX: Create and delete organization API keys through the Better Auth adapter so Convex mutations avoid unsupported dynamic imports
FIX: Move organization API key creation into a dialog and expose create actions in the API keys header and empty state
FIX: Keep API key settings on the current route when access is unavailable instead of redirecting back to the organization dashboard
FIX: Navigate to the new organization URL via typed router params after a slug change so the URL is not mangled

## 2026-05-12

CHORE: Add an intercepted-route TanStack Start skill documenting route mask modal patterns
FEATURE: Mask sign-in modal links as `/auth/signin` and unmask them to the full sign-in page on refresh
REFACTOR: Add a createPublicApiHandler helper and project skill for organization API routes
REFACTOR: Add orgApiAction and orgApiQuery builders for organization-scoped API key endpoints
FIX: Scope organization API key deletion to the active organization and document the member detail endpoint
REFACTOR: Route public API key endpoints through a shared handlePublicApi helper and move API key CRUD to Convex mutations
FEATURE: Add `/api/v1/members/:memberId` route returning member details
REFACTOR: Reuse shared Better Auth organization lookup helpers across Convex modules
FEATURE: Add organization API keys and a public members API endpoint
FEATURE: Mask changelog detail links as real entry URLs while rendering the timeline dialog and unmasking to the detail page on refresh
FIX: Bundle changelog MDX files into Nitro server assets and read them from storage in production so client navigation to changelog detail pages does not fall through to 404
FIX: Stabilize auth and organization e2e selectors around hydrated TanStack forms and current account UI labels
CHORE: Skip incomplete account-deletion and invitation-acceptance e2e flows until Convex token lookup helpers exist
CHORE: Relax legacy form unit-test timeouts so React Query test providers do not make CI fail spuriously
FIX: Reload after admin impersonation session swaps so Convex auth uses the impersonated user
FIX: Ignore local setup-stripe agent scripts during ESLint so parser-project checks stay within the app TypeScript project
FIX: Target auth e2e form fields by input name so devtools labels cannot collide with Playwright email locators
REFACTOR: Centralize auth callback URL normalization and pass resolved redirect targets through sign-in, signup, OTP, and OAuth flows
FEATURE: Store remaining in-page tab state in the URL with Nuqs
CHORE: Add a Convex cost optimizer skill and refresh optimizer guidance for current Convex and TanStack Query patterns
FEATURE: Persist organization member tabs in the URL with Nuqs and open invitations after sending an invite
REFACTOR: Reinstall TanStack Query, wrap the app in QueryClientProvider, and replace the custom useAsyncMutation hook with React Query useMutation
REFACTOR: Route organization create, update, delete, invitation, and member role mutations through Convex authComponent wrappers instead of direct Better Auth organization client calls
REFACTOR: Move non-entrypoint Convex root modules into feature and utils folders
CHORE: Remove inert client directives from TanStack Start source files and NowStack guidance
FIX: Remove bordered footer styling from remaining public auth cards
FIX: Modernize the forget password card layout to match sign-in pages
FIX: Point NowStack production URLs at nowstack.melvynx.dev and restore demo sign-in trusted origin
FIX: Keep `/home` on the landing page when `enableLandingRedirection` sends `/` through the organization redirect flow
FIX: Remove the hover zoom effect from post cards on the blog page
FIX: Only sync missing Convex env keys during `start-all` instead of rewriting existing local secrets
FIX: Remove Convex env vars from worktree `dev/*` deployments during worktree cleanup
FIX: Point worktree setup source fallback and Codex environment label at NowStack
FIX: Derive Codex Convex worktree deployment refs from the unique worktree folder when HEAD is detached

## 2026-05-11

FEATURE: Redesign /posts blog page and post detail with modern dark/light layout, filter toolbar (All + tags + search + RSS), featured 2-column grid, "More Articles" 3-column grid, and centered detail hero with metadata row
FEATURE: Add user impersonation to the admin user detail action menu
FIX: Let Convex contact and feedback emails fall back to SiteConfig contact email so the production feedback button does not fail when contact env is absent
FIX: Bundle blog post MDX files into Nitro server assets and read them from storage in production so `/posts` does not crash when `content/posts` is missing from the Vercel runtime filesystem
FIX: Skip Convex postinstall codegen during worktree dependency install so setup can select the deployment first
CHORE: Upgrade dependencies — @aws-sdk/client-s3, @tanstack/react-form, convex, markdown-to-jsx, tailwind-merge, tailwindcss, @tailwindcss/vite, vite, @eslint/compat, @types/node, knip, better-auth, @tanstack/react-devtools
CHORE: Add node-compile-cache/ to .gitignore
CHORE: Add a Vercel preview smoke-test changelog entry for worktree sign-in validation
FIX: Make setup-stripe read billing plans from convex/billing/plans.ts instead of a temporary JSON file
FIX: Quote skill frontmatter descriptions so Codex can load init-project and setup-stripe
FEATURE: Add a setup-stripe agent skill for Convex env Stripe setup, plan collection, Stripe price creation, and billing code updates
REFACTOR: Render transactional email badges as modern avatars, use organization logos on org emails, and pull link/action colors from SiteConfig brand color
CHORE: Refresh Cloudflare R2 upload credentials for the NowStack bucket
FIX: Sync Cloudflare R2 upload env vars into Convex during `start-all` so image upload actions can read them
FIX: Wire enableLandingRedirection into the root route so `/` redirects through the organization flow when enabled
CHORE: Remove the obsolete enableImageUpload site-config flag now that R2 setup is always required
FIX: Preserve the email OTP step when revisiting organization invitation sign-in and show configured OAuth providers there
FIX: Persist organization logo changes through the Convex org mutation and block saving while logo uploads are pending or failed
FIX: Require init-project to always ask for Cloudflare R2 env instead of marking it not applicable when uploads are disabled
REFACTOR: Replace hardcoded NowStack source copy with SiteConfig-backed title and description references
CHORE: Remove obsolete Resend audience references from setup docs and scripts
CHORE: Lock init-project shadcn theme setup to the safe start-template preset command
REFACTOR: Make AGENTS.md the central agent entrypoint and reduce CLAUDE.md to a deeplink stub
CHORE: Update init-project skill (SKILL.md, steps, checklist template) to edit AGENTS.md instead of CLAUDE.md
CHORE: Ignore the temporary init-project runtime checklist file
CHORE: Add a runtime INIT_CHECKLIST template and required checklist updates to init-project
CHORE: Add explicit stop gates and state-machine guardrails to the init-project skill
CHORE: Rewrite init-project skill into a strict six-step Convex-first workflow
FIX: Document fresh-clone Convex setup order and run Convex scripts through the local pnpm executable
CHORE: Tune init-project skill to batch discovery questions before execution instead of asking for every field
CHORE: Point SiteConfig app icon at the root public icon and remove the duplicate images copy

## 2026-05-10

CHORE: Align init-project question prompts with Codex dynamic `request_user_input` UI
CHORE: Make the init-project skill explicitly interactive across identity, repository, marketing, landing, and env checkpoints
CHORE: Move the pull-request unit-test workflow to `.github/workflows/ci.yml` so GitHub indexes it as a fresh CI check
CHORE: Add an explicit GitHub Actions run name and Node 24 action runtime opt-in for the unit-test workflow
CHORE: Replace the inactive GitHub Actions quality workflow with an active CI unit-test workflow and skip Convex codegen during CI installs
FIX: Gate organization redirect and list queries behind confirmed Convex auth after OTP sign-in
CHORE: Update init-project skill to collect and apply shadcn/ui preset themes
FIX: Guard filesystem-backed content managers from browser `process` evaluation when server functions are client-referenced
FIX: Avoid client-side `process` access when shared billing plan metadata loads in organization pages
FIX: Resolve Better Auth preview origins from forwarded Vercel request hosts instead of mutating Convex env during preview builds
REFACTOR: Redesign /orgs/list with a minimal app header, footer, plain-text role display, and no card hover effects
FIX: Set Convex preview auth origins from Vercel deployment URLs so Better Auth sign-in does not fall back to localhost
CHORE: Add the notification system implementation plan under `.agents/plan`
FIX: Preserve membership avatar, logo, and override-limit data across workspace views
FIX: Render organization invitation emails with Markdown-authored button links while keeping the fallback link as text
FIX: Make the user dropdown name and email selectable as full values and add breathing room to the identity label
FEATURE: Add a sync-with-nowstack agent skill for safely pulling latest NowStack boilerplate updates into forks
FIX: Gate organization workspace Convex queries behind confirmed Convex auth so logged-in users do not intermittently hit the signed-out error page
FIX: Skip Convex postinstall codegen in Vercel deploy-key environments so preview installs can reach the Convex deploy build step
FIX: Run filesystem-backed org, docs, posts, and changelog route loaders through TanStack Start server functions so client navigation no longer bundles Node `path`
FIX: Remove server-only auth fetches and server-derived type imports from client-loaded route modules, guard admin pages by session role, and fix Base UI tabs using link triggers
CHORE: Add a reusable Vercel Convex env setup script, commit the Vercel Convex deploy build command, and stop requiring Vercel app secrets for the public contact email
FIX: Sync Better Auth and OAuth provider env vars into Convex during `start-all` so sign-in providers render on fresh dev deployments
FIX: Resolve SEO and Open Graph URLs from localhost in dev and the configured production origin instead of the old demo domain
FIX: Suppress Bash job termination noise when stopping `pnpm start-all` with Ctrl+C
FEATURE: Add a Vercel Convex preview deploy script that exports production data and imports it into fresh preview deployments after `convex deploy`
FIX: Keep the native Open Graph image renderer out of Vite dependency optimization so local dev boots cleanly
FEATURE: Add full noindex social metadata for admin and organization workspace pages so shared private URLs render branded OG cards
REFACTOR: Restore Open Graph image side borders and use the brand primary color for the bottom rule
REFACTOR: Move Open Graph image theme tokens into SiteConfig and simplify the social card style to a minimalist black layout
FEATURE: Add dynamic NowStack Open Graph image generation for social sharing previews
FIX: Match the landing header to the Lumail-style full-width bordered navigation bar
FIX: Preserve type-safe organization role literals on Convex org builders instead of exposing `roles` as `string[]`
FIX: Preserve direct custom media support in the landing feature section alongside Tella-style embeds
FEATURE: Sync the landing hero and feature section with the codelynx `/nowstack` Tella demo embeds and boilerplate positioning
REFACTOR: Switch `createNoIndexHead` to named parameters so SEO noindex route heads are explicit and review-friendly
FEATURE: Add centralized SEO metadata, structured data, robots, sitemap, RSS feed, image metadata, public prerender coverage, and NowStack-aligned landing copy
CHORE: Add focused Convex agent rules for org/admin builders, DTO mappers, centralized billing plan constants, and exported function naming
FEATURE: Add generated `/llms.txt` URL map for AI agents and make `/docs` return the full documentation corpus as Markdown for non-browser clients
REFACTOR: Split admin DTO mappers into `convex/admin/dto/*` and centralize billing plan names, prices, trial days, limits, and active subscription statuses in `convex/billing/plans`
CHORE: Add the `@convex/*` alias to Vitest so shared Convex constants resolve in unit tests
FEATURE: Serve `/docs/*` pages as `text/markdown` for curl, HTTPie, SDK-style fetches, and explicit markdown/plain-text Accept headers while keeping browser requests on the normal HTML docs UI
REFACTOR: Move admin data helpers out of `convex/auth`, use generated Better Auth Convex document types, and push admin list filtering and sorting into indexed Convex adapter queries
REFACTOR: Rename the admin subscription patch mutation to `patchById` and reuse a single Stripe client reference inside organization billing actions
REFACTOR: Centralize Convex authorization through `orgQuery`, `orgMutation`, `orgAction`, `adminQuery`, `adminMutation`, and `adminAction`; move admin users, organizations, feedback, and billing endpoints under `convex/admin`
REFACTOR: Replace non-static TanStack server functions for billing, plans, contact forms, feedback replies, admin subscription management, and image uploads with Convex queries, mutations, and actions
FIX: Throw structured Convex errors for auth, permission, validation, configuration, and not-found failures instead of bare `Error` strings in the refactored Convex guards and endpoints
FIX: Inline the admin dashboard route loader so it calls the Convex admin dashboard query directly without a one-use wrapper

## 2026-05-09

CHORE: Add `dev-browser` as the required browser verification workflow in `AGENTS.md`, including the install fallback from `https://github.com/SawyerHood/dev-browser`
CHORE: Rewrite `AGENTS.md` into a repo operating guide with a `.agents/rules` index, trigger map, canonical commands, log workflow, and high-risk Convex/Auth/API/Form/Stripe/worktree rules so agent instructions remain usable even when `.agents/rules` is not auto-loaded
FIX: Org invite member dialog `Role` select now fills its column - add `w-full` to `SelectTrigger` so it no longer leaves empty space next to it
FIX: Org members `Invitations` tab now shows the `Empty` state when no pending invitations exist - filter out `accepted` invitations before the length check so accepted invitations no longer collapse the panel into a blank `CardContent`

## 2026-05-08

CHORE: Update `optimizer` skill - drop `useMutation`-wraps-`useConvexMutation` pattern in favor of direct `useConvexMutation` calls and `.withOptimisticUpdate(...)`; replace `nuqs` and Next.js `app/[orgSlug]/layout.tsx` references with TanStack Router `validateSearch` and `$orgSlug` `route.tsx` patterns
CHORE: Fix `convex-create-component` skill - replace `getAuthUserId(ctx)` (forbidden) with `requireAuth(ctx)` from `auth/config` in advanced-patterns example
CHORE: Fix `convex-performance-audit` skill - replace `useMutation` callsite reference with `useConvexMutation` in scope checklist
FEATURE: Add `/orgs/list` page showing all organizations the user belongs to with their role per org; add `auth.queries.listOrganizationsWithRoles` Convex query for single round-trip member+org join
FEATURE: Send "removed from organization" email (with a link to `/orgs/list`) when a member is kicked from the org settings members tab
REFACTOR: Member removal in `org-members-form.tsx` now calls the Convex `auth.mutations.removeMember` directly via `useConvexMutation` (no more `useMutation` wrapper) and triggers a full `window.location.reload()` so sidebar/nav state stays in sync
FIX: Drop the `text-muted-foreground` class on the `Theme` `SunMoon` icon in `UserDropdown` so the row aesthetic matches the other dropdown items; preserve the Dark/Light/System submenu
FEATURE: Add `hideTheme` prop on `UserDropdown` (threaded through `AuthButtonClient` -> `LoggedInButton`); landing header passes `hideTheme` so the `/` page user dropdown no longer shows the Theme switcher
FIX: Align header `ThemeToggle` with sibling ghost buttons - use `size="icon-sm"` and matching `size-4` Sun/Moon icons (was `size="sm"` with mismatched `h-6 w-[1.3rem]` Sun + `size-5` Moon)
FIX: Resolve `globalMiddleware is not iterable` SSR crash by clean-reinstalling node_modules to remove duplicate stale `nitro` (260311-beta + 260429-beta) and `@tanstack/react-start` (1.167.32 + 1.167.65) copies left over from earlier merges
FEATURE: Modernize `/posts` blog pages with shadcn `Card` grid (cover image, tags, description, meta), unify `PostCard` (default + compact variants), add `Empty` empty states and `pendingComponent` skeletons across index/category/detail
PERF: Replace full-table user scan in `auth.queries.{getUserById,getUserByIdAdmin}` with a direct `betterAuth.adapter.findOne` by `_id`
PERF: Batch member/membership user+org lookups in convex/auth/queries.ts (kills N+1)
PERF: Move `getAdminDashboard` to a non-reactive route loader; fold userGrowth + mrrHistory into single sorted-walk passes; mirror AUTH_PLANS prices instead of duplicating PLAN_PRICES_IN_CENTS
PERF: Collapse `getOrg` double Convex round-trip into one query (`getCurrentOrganization` now exposes `stripeCustomerId`); fix `updatedAt` mapping bug (was using `createdAt`)
FIX: Replace 1000-row feedback fetch with searchIndex + cursor pagination
FIX: Make org command palette keyboard- and mobile-accessible

## 2026-05-07

FIX: Add `requireAdmin` to `feedbacks.queries.{getById,list,search}` (was unauthenticated, leaking PII)
FIX: Add `requireAuth` and derive `userId`/`email` from session in `feedbacks.mutations.create` (was accepting forged caller-supplied identity)
FIX: Require platform admin OR org owner/admin role in `auth.mutations.setOrgStripeCustomerId` (was unauthenticated, allowing arbitrary Stripe customer hijacking)
FIX: Require platform admin in `auth.mutations.createUser` (was only requiring login at the Convex layer)
FIX: Add membership check to `auth.queries.getOrganizationById` (was leaking `stripeCustomerId` to any authenticated user)
FIX: Switch `subscriptions.mutations.{upsert,update}` to `requireAdmin` (was only `requireAuth`, allowing plan escalation)
FIX: Replace `trustedOrigins: ["http://localhost:*"]` wildcard with the specific `siteUrl` value
FIX: Stop embedding the OTP code in the magic-link URL (logged in browser/server/referrer history)
REFACTOR: Hoist Stripe SDK to a single module-level singleton in `convex/stripe.ts` (was instantiated 6 times per call)
REFACTOR: Reuse `mapSubscription` in `getOrgActiveSubscription` (removes triplicated mapping)
REFACTOR: Extract shared `SUBSCRIPTION_STATUS_CONFIG` to `src/lib/billing/subscription-status.ts` (deduped from billing overview + plan tabs)
FIX: Add `aria-label` to icon-only Copy / Filter / MoreHorizontal buttons in admin user/org pages

FEATURE: Simplify billing usage cards to minimalist style - small muted label, large current/limit number, thin color-coded progress bar (foreground/warning/destructive based on usage). Removed Live/Planned badges, icons, percent text, "X left" footer, and per-card descriptions
FEATURE: Show trial end date on org billing overview when subscription status is `trialing` (full date + relative "in X days")
FIX: Make `GET`/`POST` handlers in `src/routes/api/auth/$.ts` async to satisfy `@typescript-eslint/promise-function-async`
FIX: Suppress `react-hooks/incompatible-library` warnings on `useReactTable()` in admin users + organizations list components (TanStack Table API is intrinsically non-memoizable)
CHORE: Add `convex/**/_generated` to ESLint ignore list so nested Convex component generated folders (e.g. `convex/betterAuth/_generated`) are skipped
FIX: Restore `/api/auth/*` proxy and migrate to TanStack Start v1.167 route format. The auth client (`@convex-dev/better-auth/react`) hits `/api/auth/get-session` and `/api/auth/convex/token` against the local origin, so the local proxy route MUST exist - it cannot be replaced by Convex `http.ts`. Reverted that misguided deletion. Also fixed `src/routes/api/admin/organizations/$orgId/payments.ts` (used by `organization-payments.tsx`). Both files were on the dead `createAPIFileRoute` from `@tanstack/react-start/api` (subpath removed in 1.167) and were also being skipped by `^api$` in `vite.config.ts`'s `routeFileIgnorePattern`. Migrated both to `createFileRoute(...)` with `server: { handlers: { GET, POST } }` and removed `^api$|` from the ignore pattern so route discovery picks them up
FIX: Admin org Billing tab now loads payments. The `payments.ts` handler was extracting `stripeCustomerId` from `url.pathname.split("/").at(-2)`, which returned the Convex `orgId`, not a Stripe customer ID - Stripe rejected the call and the route returned 500. Switched to `params.orgId` and `fetchAuthQuery(api.auth.queries.getOrganizationByIdAdmin)` to resolve the actual `stripeCustomerId` from the org record
CHORE: Bump dependencies to latest non-major versions (convex 1.35 -> 1.37, better-auth 1.5.6 -> 1.6.9, @convex-dev/better-auth 0.11.4 -> 0.12.2, @tanstack/react-router/start/query/form, react 19.2.6, zod 4.4.3, knip 6.12, lucide-react 1.14, prettier-plugin-tailwindcss 0.8, plus minor/patch bumps to vite/vitest/tailwindcss/typescript/eslint plugins/etc.). Skipped `eslint` 9 -> 10 and `react-email` 5 -> 6 (major bumps, need manual migration). `@react-email/{components,tailwind}` left at current versions (latest is deprecated). Refactored `src/hooks/use-mobile.ts` to `useSyncExternalStore` to satisfy the new `react-hooks/set-state-in-effect` rule from `eslint-plugin-react-hooks` 7.1.1
CHORE: Delete legacy v1 dead code surfaced by `knip`. Removed legacy TanStack Start API routes superseded by Convex `http.ts` (`api/webhooks/{stripe,resend}.ts`, `api/auth/$.ts`) plus orphaned `api/{manifest,sitemap,og/post,admin/organizations,admin/users,admin/users/create,orgs/$orgId}.ts`. Removed Next.js leftovers (`src/server.ts`, `src/types/next.ts`, `src/lib/{metadata,og-image-font}.ts`, `src/lib/react/cache.ts`, `src/lib/auth/{proxy-utils,auth-org}.ts`, the `loading.tsx`/`error.tsx`/`not-found.tsx`/`post-slug-metadata-image.tsx` files under `(layout)/posts` + `(layout)/docs`, `(layout)/not-found/index.tsx`, `auth/error.tsx`). Removed unused features (`changelog/{changelog-dialog,changelog.action}`, `markdown/{client-markdown,markdown.config}`, `navigation/navigation-wrapper`, `page/{error-400,page-400}`, `plans/pricing-card` (replaced by `simple-pricing-card`), `server-sonner/client-toast`). Removed unused account/admin/billing components (`account/{account-navigation,edit-profile.schema}`, admin `_components/{admin-charts-section,admin-stats-section,user-details-card}`, admin org `_actions/organization-admin.actions` + `_components/organization-title-form`, admin user `_components/user-actions`, billing `_components/{billing-actions,billing-info-card,card-skeleton,edit-billing-button,payment-methods-card,plan-usage-card,upcoming-invoice-card}`, orphaned `users/{client-org,donuts-chart,users-chart}.tsx` with no `index.tsx`). Trimmed `admin/_components/admin-charts-data.ts` to keep only the still-used type exports. Updated `knip.json` to ignore two false positives (`scripts/setup-stripe-webhook.mjs` is invoked by `start-all.sh`; `api/admin/organizations/$orgId/payments.ts` is hit by `organization-payments.tsx`)
FEATURE: Auto-register the Stripe webhook on `pnpm start-all`. Rewrote `scripts/setup-stripe-webhook.mjs` to be fully dynamic and idempotent: derives the Convex deployment URL from `VITE_CONVEX_SITE_URL` (`.env.local`), reads `STRIPE_SECRET_KEY` from `.env`/`.env.local`/Convex env, looks up an existing Stripe webhook for `<convex-site>/stripe/webhook`, and writes `STRIPE_WEBHOOK_SECRET` into Convex env via `npx convex env set`. If the endpoint exists but the Convex env secret is missing, deletes + recreates (Stripe never returns the signing secret on read). Wired a third async background block into `scripts/start-all.sh` that waits up to 60s for `VITE_CONVEX_SITE_URL` to appear (i.e. Convex dev is up) and then runs `node scripts/setup-stripe-webhook.mjs --quiet`. Failures only warn; they never block the dev servers. Skips cleanly when `STRIPE_SECRET_KEY` is absent
CHORE: Mop up residual stale references in `.agents/skills/` after the file-storage and Stripe-webhook refactors. `init-project/steps/step-06-setup-env.md` STACK REMINDER table - was still claiming "Cloudflare R2 (default adapter at `src/lib/files/r2-adapter.ts`)"; fixed to reference `uploadFile(file, path)` in `src/lib/files/r2.ts`. `publish-to-production/SKILL.md` stack-context - was claiming the Stripe webhook is the Vercel API route; corrected to "Convex `httpAction` mounted at `https://<deployment>.convex.site/stripe/webhook` (registered via `node scripts/setup-stripe-webhook.mjs`); the Vercel route `src/routes/api/webhooks/stripe.ts` is a stub kept for local debugging only", and updated the file-upload line to point at the new `r2.ts`. `publish-to-production/steps/step-03-deploy.md:180` - changed `.claude/rules/changelog.md` to the canonical `.agents/rules/changelog.md` (both resolve via the symlink, but `.agents/` is the source of truth)
CHORE: Rename app brand to "NowStack" across user-facing copy, docs, content/docs MDX, agent skills, README, CHANGELOG entries, workflow + worktree scripts, env template, admin sidebar label, and emails (`convex/auth/config.ts`, `src/site-config.ts`, `convex/siteConfig.ts`, `src/lib/auth/stripe/auth-plans.ts`, etc.)
FEATURE: Replace the bare "No pending invitations" line on the org members > Invitations tab with the shadcn `Empty` component (icon + title + description + inline `Invite` form when seats remain). Installed `src/components/ui/empty.tsx` via `shadcn add empty`
REFACTOR: Collapse the file-upload "adapter" abstraction now that R2 is the only backend. Deleted `src/lib/files/upload-file.ts` (the `UploadFileAdapter` interface) and renamed `r2-adapter.ts` -> `r2.ts`. The new module exports a single `uploadFile(file, path): Promise<{ url: string }>` that throws on failure - no more `{ error, data }` discriminated-union ceremony. Updated the two callers in `src/features/images/upload-image.action.ts` to use try/catch + `ActionError`. Updated the "File Storage" section in `code-conventions.md` to point at the new module path
CHORE: Update `init-project` skill to one-shot the current setup. `step-06-setup-env.md`: replaced the wrong `pnpm stripe-webhooks` advice for `STRIPE_WEBHOOK_SECRET` with the canonical `node scripts/setup-stripe-webhook.mjs` flow (registers the Convex `httpAction` endpoint with Stripe and stores the signing secret in Convex env, idempotent); deleted the stale "If user prefers Vercel Blob or UploadThing, ask them and create/swap the adapter" line (Vercel Blob is gone, no UploadThing exists); R2 section now flags it can be skipped when `enableImageUpload: false` in `site-config.ts`. `step-07-finalize.md`: replaced the parallel `pnpm convex:dev` + `pnpm dev` instruction with the canonical single-terminal `pnpm start-all` (English + French summaries). `SKILL.md` stack-context now reflects the Convex webhook endpoint and the new `uploadFile` from `r2.ts`
CHORE: Drop the Vercel Blob file-storage adapter — Cloudflare R2 is the only adapter now. Deleted `src/lib/files/vercel-blob-adapter.ts`, removed `@vercel/blob` from `package.json`, cleaned the file-upload comment in `src/site-config.ts` (was suggesting Vercel Blob / S3 alternatives that no longer have adapters), and updated the "File Storage" section of `code-conventions.md` to reflect a single-adapter setup. `src/lib/files/` now contains only `r2-adapter.ts` + `upload-file.ts` (the `UploadFileAdapter` interface)
REFACTOR: Trim and scope `.agents/rules/stripe-billing.md`. Cut from 87 lines to 79, removed the verbose architecture diagram and per-step Stripe Dashboard instructions, condensed the env-vars + key-files tables, and split mutation visibility into a 4-row table that calls out `*FromWebhook` as internal-only. Added `paths:` frontmatter (`**/stripe*`, `**/stripe/**`, `**/billing/**`, `**/plans/**`, `**/*subscription*`, `**/subscriptions/**`) so the rule only loads when an agent touches Stripe-related files instead of every TS edit
CHORE: Delete `.agents/rules/mandatory-dependencies.md` — the rule mostly duplicated `package.json` and overlapped with the "use X not Y" guidance already in `code-conventions.md`. Folded the only non-obvious bit (the file-storage adapter situation) into a new "File Storage" section in `code-conventions.md`: R2 via `@/lib/files/r2-adapter` (using `@aws-sdk/client-s3` for the S3-compatible API) is the default; `@/lib/files/vercel-blob-adapter` (using `@vercel/blob`) is an alternative
CHORE: Expand `.agents/rules/file-naming.md` from a single line about `.action.ts` into a full naming reference. Clarified that `.action.ts` files are TanStack server functions (`createServerFn`), not Next.js server actions, and that route-scoped ones live under `_actions/`. Documented Convex conventions (multi-function `<feature>/{queries,mutations}.ts` vs single-file `<feature>.ts`, `convex/<componentName>/` for components, `_generated/` is off-limits). Added TanStack Router conventions (`__root.tsx`, `route.tsx`, `index.tsx`, `$param`, pathless `(group)/`, private `_components/` and `_actions/`, no Next.js `[slug]` brackets), plus schema/component/hook/test naming
REFACTOR: Clean up `src/lib/api-middleware.ts` to match what TanStack Start actually allows. Deleted `authMiddleware`, `orgMiddleware`, `adminMiddleware` exports — they were `createMiddleware({ type: "function" })` instances, which TanStack Start only composes onto `createServerFn`, NOT onto `createAPIFileRoute`. They had zero callers across the codebase (the real action middlewares for server functions are `authActionMiddleware`/`orgActionMiddleware`/`adminActionMiddleware` in `src/lib/actions/safe-actions.ts`). `api-middleware.ts` now exports only `handleApiError`. Renamed `ZodRouteError` -> `HttpError` (file `src/lib/errors/zod-route-error.ts` -> `src/lib/errors/http-error.ts`); the `ZodRouteError` name implied a `next-zod-route` library that was never installed - it was a local class for "API error with status code". Made the `status` field non-optional (defaults to 400 in the constructor) to match how it's actually used. Updated `__tests__/api-middleware.test.ts` and `__tests__/errors.test.ts` to the new name. Rewrote `.agents/rules/api-routes.md` to document the actual two-track pattern (API routes use inline auth + try/catch + `handleApiError`; server fns use the action middleware chain) so agents stop trying to attach the wrong kind of middleware to `createAPIFileRoute`
CHORE: Sync AI configuration (`.agents/skills/`, `.agents/rules/`, root `CLAUDE.md`) with the current TanStack Start + Convex codebase. Deleted skills that no longer apply (`convex-quickstart`, `convex-setup-auth`, `security-check`) and rules that misled (`architecture-overview.md` claimed Next.js + Prisma, `fetching-patterns.md` was built on the Server Components mental model, `middleware-proxy.md` referenced a missing `proxy.ts`). Rewrote `stripe-billing.md` to describe the real flow (webhook is a Convex `httpAction` at `convex/http.ts` -> `internal.stripe.processWebhook` -> `subscriptions.mutations.upsertFromWebhook`/`updateFromWebhook`; `STRIPE_WEBHOOK_SECRET` lives in Convex env). Rewrote `code-conventions.md` (Convex backend, no RSC/PageProps/Prisma, no nuqs), `authentication.md` (use `requireAuth(ctx)` inside Convex; `fetchAuthQuery`/`fetchAuthMutation` from server fns; `useSession` from `@/lib/auth-client`), `development-commands.md` (delegate startup to `start-commands.md`, drop turbopack/prisma scripts, add convex scripts), `mandatory-dependencies.md` (full dep list with TanStack/Convex/Better Auth/Stripe). Trimmed `optimizer` skill: deleted `caching.md`, `nextjs-optimization.md`, `nuqs.md` ref files; rewrote `client-side-fetch.md` around Convex queries via `convexQuery` + TanStack Router search params; updated SKILL.md description. Fixed `add-documentation` (`.Codex/skills/...` -> `.agents/skills/...` script paths), `init-project` (step-02 filename typo), `create-tests/references/unit-tests.md` (replaced Prisma global mock with the actual mocks from `test/vitest.setup.ts` - `fetchAuthQuery`/`fetchAuthMutation`, `stripe`, `authClient`, `resend`; flagged the legacy `useZodForm` form-test pattern), `convex-create-component` (replaced `getAuthUserId` from `@convex-dev/auth/server` with `requireAuth(ctx)` from `convex/auth/config.ts`; aligned path convention with the existing `convex/betterAuth/` precedent), `convex-migration-helper` (note that `@convex-dev/migrations` is not yet installed). Refreshed root `CLAUDE.md` "Important Files" to point at the actual files (`auth-server.ts`, `auth-client.ts`, `auth/auth-user.ts`, `organizations/get-org.ts`, action middlewares); replaced the dead `prisma/schema/...` "Database Schemas" block with the real `convex/schema.ts` + `convex/_generated/ai/guidelines.md` pointers
CHORE: Rename `pnpm start-app` to `pnpm start-all` (script `scripts/start-app.sh` -> `scripts/start-all.sh`) so the canonical "boot Convex + web in one terminal" command has a clearer name. Updated `package.json`, `.gitignore`, `.claude/launch.json`, and `CLAUDE.md` to match
FIX: Strip ANSI escape codes (and convert `\r` -> `\n`) when writing `.logs/web.txt` and `.logs/convex.txt` in `scripts/start-all.sh`. Previously the log files contained raw `^[[32m...^[[39m` sequences from vite/convex's colored output, which made them unreadable for AI agents tailing them. Implemented as a single `perl -ne` pipeline per child that writes the cleaned line to the log file (with `$| = 1` autoflush on both filehandles) and prints the original colored line with a `[convex]`/`[web]` prefix to the terminal. Avoids `tee >(...)` (which block-buffers the process-substitution branch and delays file writes) and avoids macOS BSD awk's bug where `-v var="/path"` corrupts string values starting with `/`
FEATURE: Add `.agents/rules/start-commands.md` and `.agents/rules/read-logs.md` documenting the canonical `pnpm start-all` flow, every other partial dev command, the `.logs/` format, and the tail-first debug workflow. Slim down the corresponding section in `CLAUDE.md` to point at these rules
CHORE: Make `.agents/` the source of truth for AI tooling. Removed `.agents/` from `.gitignore` so the folder is tracked. Moved `.claude/agents/`, `.claude/rules/`, `.claude/docs/`, and the `publish-to-production` skill into `.agents/`, then replaced `.claude/{agents,rules,skills}` with whole-folder symlinks pointing to the matching `.agents/` directories. Deleted `.claude/commands/` (replaced by skills), `.claude/hooks/` (and removed its now-dead `PostToolUse` reference from `.claude/settings.json`), `.claude/notes/`, `.claude/tasks/`, and `.claude/worktrees/`
FIX: Stop dropdown menu items from wrapping to two lines when the trigger is narrow (`src/components/ui/dropdown-menu.tsx`). `DropdownMenuContent` was using `w-(--anchor-width)`, which forced the popup to match the trigger's width — so a 32px icon button produced a 32px-wide menu where labels like "Copy member ID" and "Delete member" wrapped. Replaced with `w-max min-w-(--anchor-width) max-w-[min(theme(width.72),var(--available-width))]` so the popup sizes to its content on a single line and only wraps when content would exceed the 72-wide cap (or the available viewport space)
FIX: Split the org settings details page (`src/routes/orgs/$orgSlug/(navigation)/settings/(details)/org-details-form.tsx`) into two independent forms (`OrgLogoForm` and `OrgNameForm`), each with its own `useForm`/`Form` and submit mutation. Previously both "Save Changes" buttons subscribed to the same form's `isSubmitting`, so updating only the name (or only the logo) showed a loading spinner on both buttons. Now the loader appears only on the section actually being saved

## 2026-05-06

REFACTOR: Eliminate the global route-transition fallback in `src/router.tsx`. The previous setup rendered a `max-w-screen-lg` two-card skeleton via `defaultPendingComponent` and forced it to stay visible for at least 300ms (`defaultPendingMinMs: 300`), which caused a visible "layout glitch" when navigating to `/account` or `/admin/*` before the route's own sidebar `pendingComponent` took over. Now `defaultPendingComponent: () => null` so any route without its own skeleton shows nothing, and `defaultPendingMinMs: 0` so the route-specific pending UIs never linger artificially. Removed the unused `Skeleton`/`Loader` imports along with the helper component
FIX: Prevent "Make Admin" from wrapping to two lines in the admin users table action menu (`src/routes/admin/users/_components/users-columns.tsx`) by setting `min-w-40` on the `DropdownMenuContent`
FIX: Align Sign out button and Settings content in `/account` layout (`src/routes/(logged-in)/account/route.tsx`). Added `m-auto` to the header inner div and the content wrapper (matching the org-navigation pattern in `org-navigation.tsx`) so the header and content share the same `max-w-7xl` centered container, instead of the header being left-aligned while the Layout was centered
REFACTOR: Modernize the account danger zone UI (`src/routes/(logged-in)/account/danger/page.tsx`) to match the brand's settings card pattern. Removed the oversized `AlertTriangle` title accent and custom `text-xl`/`text-base` overrides on `CardTitle`/`CardDescription`, replaced the `bg-card` nested boxes with the shared `flex items-center gap-3 rounded-lg border p-3` row + `bg-muted size-9 rounded-md` icon-tile pattern used in `security-page.tsx` and `edit-profile-form.tsx`, swapped raw `<p>` tags for `Typography variant="small"`/`muted`, and tightened the footer to a `size="sm"` destructive `LoadingButton` with a `justify-end` layout (no more `border-t pt-4` and `size="lg"`). The dialog also got the explicit `variant: "destructive"` flag so it inherits the right tone

## 2026-05-05

FIX: OAuth-only users can now set an account password without hitting "Credential account not found". Replaced `authClient.changePassword({ currentPassword: "" })` in `src/routes/(logged-in)/account/security/new-password-page.tsx` with a new server-side `setPassword` mutation in `convex/auth/mutations.ts` that calls `auth.api.setPassword`, which is the Better Auth endpoint for creating an initial credential account
FEATURE: Add "Manage plan" button on the current-plan card (`src/routes/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/plan/index.tsx`) that opens the Stripe Customer Portal via `openStripePortalAction`. Only shown when the org has an active subscription; falls back to the disabled "Current plan" pill on Free
FIX: Use the explicit `orgSlug` from action input instead of re-resolving through `getRequiredCurrentOrg()` for the permission check inside `openStripePortalAction` and `cancelOrgSubscriptionAction` (`src/routes/orgs/$orgSlug/(navigation)/settings/billing/billing.action.ts`). The previous `hasPermission({ subscription: ["manage"] })` call internally re-ran `getRequiredCurrentOrg()` with no slug, which failed URL sniffing on `/_serverFn/...` and threw a redirect to `/auth/signin`. Replaced with an inline check against the already-resolved `org.memberRoles` from the middleware context (`r === "owner" || r === "admin"`)
FIX: `getCurrentOrg` (`src/lib/organizations/get-org.ts`) now fetches the org's custom `stripeCustomerId` via `api.auth.queries.getOrganizationById` (which reads the betterAuth adapter directly) instead of trying to coerce it off the Better Auth `getFullOrganization` response, which never returns custom org fields. Without this, `org.stripeCustomerId` was always `null` on the client/middleware-context side, breaking Manage plan / cancel even when the column was set in DB
FEATURE: Wire Stripe webhooks directly into Convex (no more local tunnel needed). Added `processWebhook` internalAction in `convex/stripe.ts` that verifies the Stripe signature with `stripe.webhooks.constructEvent` and routes `checkout.session.completed`/`customer.subscription.updated`/`customer.subscription.deleted` to the new internal mutations `subscriptions.mutations.upsertFromWebhook` and `subscriptions.mutations.updateFromWebhook` (writes to the `subscriptions` table by `stripeSubscriptionId` index). Registered HTTP route `POST /stripe/webhook` in `convex/http.ts` (httpAction proxies to the action). Provisioned the live webhook endpoint via Stripe API (`scripts/setup-stripe-webhook.mjs` - idempotent, points to `https://canny-cormorant-824.convex.site/stripe/webhook` for the dev deployment) and stored the returned signing secret as `STRIPE_WEBHOOK_SECRET` in Convex env. Verified end-to-end with dev-browser: paid €0/14-day-trial NowStack PRO via Stripe Checkout (test card 4242), Stripe delivered `checkout.session.completed` to Convex (pending_webhooks=0), the action persisted the subscription (`plan: "pro"`, `status: "trialing"`, `stripeSubscriptionId: sub_1TTd7iJka9P3UpYeA9rdNkPf`), and the billing UI immediately switched the org from "Free" to "Pro - Trial" with the right limits showing
FIX: Auto-create a Stripe customer the first time an org upgrades. `upgradeOrgAction` (`src/features/plans/plans.action.ts`) now creates a Stripe customer (using the org owner's email + org name + `metadata.organizationId`) and persists it on the org via the new `setOrgStripeCustomerId` Convex mutation (`convex/auth/mutations.ts`, calls `components.betterAuth.adapter.updateOne` on the `organization` table) when `org.stripeCustomerId` is null, instead of throwing "No Stripe customer ID found". Verified the full upgrade flow end-to-end with dev-browser: clicking "Upgrade" on `/orgs/test/settings/billing/plan` creates the customer and redirects to Stripe Checkout (`checkout.stripe.com`) showing "NowStack PRO - 14 days free trial - then €43.61/month" with `melvynmal@gmail.com` pre-filled

## 2026-05-04

FIX: Resolve org from explicit `orgSlug` in all org-scoped server functions instead of sniffing the request URL. `orgActionMiddleware` (`src/lib/actions/safe-actions.ts`) now declares an `inputValidator` requiring `orgSlug: string` (with `.passthrough()` so per-handler validators still see their own fields) and calls `getRequiredCurrentOrg({ slug: data.orgSlug })`. Previously, `getOrgSlugFromRequest` parsed the URL pathname, but TanStack Start server functions are POSTed to `/_serverFn/...` so the regex `/^\/orgs\/([^/]+)/` never matched, every upgrade/portal/cancel call failed with "You need to be part of an organization to access this resource." Updated all callers to pass `orgSlug`: `pricing-card.tsx`, `pricing-section.tsx`, `plan-card-action.tsx`, `cancel-form.tsx`, `billing-actions.tsx`, `edit-billing-button.tsx` (now uses `useCurrentOrg()`)
CHORE: Replace `ReactQueryDevtools` with the unified `TanStackDevtools` panel hosting `TanStackRouterDevtoolsPanel` (`src/-providers.tsx`). Installed `@tanstack/react-devtools` + `@tanstack/react-router-devtools`, removed `@tanstack/react-query-devtools`. Router devtools is more useful for this app (route matches, loaders, params) than the query panel
REFACTOR: Migrate org command palette search from REST (`/api/orgs/$orgId/command`) to a reactive Convex query (`api.auth.queries.searchOrgCommand`). The `useQuery` in `src/routes/orgs/$orgSlug/(navigation)/_navigation/org-command.tsx` now uses `convex/react` instead of TanStack Query + `upfetch`, so member search auto-updates when membership changes. Deleted `src/routes/api/orgs/$orgId/command.ts` and `src/types/command.ts` (type is now inferred from the Convex query)
REFACTOR: Restyle social sign-in buttons (`src/routes/auth/signin/provider-button.tsx`) to use the shared `outline` button variant and a monochrome `currentColor` Google logo (`src/components/nowts/logo.tsx`) for a cleaner, minimalistic look that matches the theme. The "Last used" badge (powered by `authClient.getLastUsedLoginMethod()`) also switched to the `outline` variant with a `bg-background` so it stays readable against the card
FEATURE: Add `publish-to-production` local skill at `.claude/skills/publish-to-production/`. Maximally autonomous prod deployment workflow: provisions Convex prod, mirrors env vars from `.env`/`.env.local`, links/configures the Vercel project (writes `vercel.json` with `npx convex deploy --cmd 'pnpm build' --cmd-url-env-var-name VITE_CONVEX_URL`), syncs Vercel prod env vars, walks the user through generating + installing `CONVEX_DEPLOY_KEY`, triggers the first deploy, and handles postdeploy (Stripe webhook via `stripe webhook_endpoints create`, OAuth callback URLs, Resend domain). 5 steps + canonical `references/env-mapping.md` listing where each env var lives (Convex prod vs Vercel prod vs Vercel build) and which differ from dev
CHORE: Switch transactional sender and build the display name dynamically as `${SiteConfig.team.name} from ${SiteConfig.title}` in both `src/lib/mail/send-email.ts` and `convex/email.ts` (added `convex/site-config.ts` mirror since Convex cannot import from `src/`). Updated `EMAIL_FROM` env var in Convex dev and prod.
FEATURE: Skip auto-org-creation in `databaseHooks.user.create.after` (`convex/auth/config.ts`) when the new user's email has a pending invitation. The hook now does a `findMany` on the `invitation` table filtered by `email + status="pending"` and early-returns if any rows exist, so an invited user lands with exactly one organization (the inviter's) instead of two (auto-created personal + invited)
FEATURE: Add `organizationId_status`, `email_organizationId_status`, and `email_status` indexes to the `invitation` table (`convex/betterAuth/schema.ts`). Fixes the "Querying without an index on table 'invitation'" warnings logged by Better Auth's `findMany` calls in `crud-invites`, and supports the new pending-invitation lookup during signup
FEATURE: Beautiful HTML invitation email (`convex/auth/config.ts` -> `renderInvitationEmail`). Replaces the plaintext "Hello,\n\n[Click here]" body with an inline-styled card layout (org initial avatar tile, "You're invited to join {org}" headline, inviter + role line, primary CTA button, fallback URL copy block, neutral muted footer). Uses the rich callback signature `{ id, email, role, organization, inviter }` from Better Auth so the email shows the inviter's name and the org name in subject + body
FEATURE: Rewrite the accept-invitation flow (`src/routes/orgs/accept-invitation/$id/index.tsx`). Replaces the silent auto-accept loader with five proper UI states: `InvalidInvitation`, `InvitationStateNotice` (already-accepted/declined/expired with auto-redirect when an org slug is known), `WrongAccountNotice`, `SignInToAccept` (org card + embedded `SignInProviders` with email pre-filled and `callbackUrl` looping back to the invite URL), and `AcceptInvitationCard` (Accept + Decline buttons calling `api.auth.mutations.acceptInvitation` / `rejectInvitation`, then `navigate` to `/orgs/$orgSlug` using the slug returned from the mutation)
FEATURE: Add `getInvitationDetails` public Convex query (`convex/auth/queries.ts`). Reads invitation, organization, and inviter from the betterAuth tables without requiring a session (so the invite landing page can fetch context before sign-in). Wraps `findOne` in `.catch(() => null)` so malformed IDs return null instead of crashing the route
FEATURE: Add `rejectInvitation` Convex mutation (`convex/auth/mutations.ts`) calling `auth.api.rejectInvitation`. `acceptInvitation` now also looks up the joined organization's slug and returns it as `organizationSlug` so the client can redirect to `/orgs/<slug>` without a follow-up query
FEATURE: Plumb `email` prop through `SignInProviders` -> `SignInCredentialsAndEmailOTP` -> `SignInWithEmailOTP` / `SignInPasswordForm` so the accept-invitation page can pre-fill the OTP / password form with the invited address
FEATURE: Treat `default` as a placeholder slug in `/orgs/$orgSlug/*`. Added a `beforeLoad` to `src/routes/orgs/$orgSlug/route.tsx` that, when `params.orgSlug === "default"`, calls a `resolveDefaultOrgSlug` server function which looks up the user's organizations via `api.auth.queries.listOrganizations` and redirects to the same path with `default` replaced by the first available slug (preserving `/settings/members`, etc). Falls back to `/auth/signin` if not signed in and `/orgs/new` if the user has no orgs
FIX: Render a friendlier auth-error UI in `DefaultErrorComponent` (`src/router.tsx`). When the route error message contains `unauthorized`, show a lock icon, "You need to be signed in" heading, and a Sign in button instead of the generic "Something went wrong" with the raw `[CONVEX Q(...)] APIError: Unauthorized` text
FIX: Add missing `createdAt: v.number()` field to the `invitation` table in `convex/betterAuth/schema.ts`. Better Auth v1.5.6 always writes `createdAt` when creating an invitation, but the schema validator did not declare it, so every `POST /api/auth/organization/invite-member` failed with `ArgumentValidationError: Value does not match validator. Path: .input`. The frontend showed a generic failure and no invitation was ever persisted. Confirmed via `.logs/convex.txt` which contained the validator error with the rejected payload `{createdAt: ..., email: "melvynmal2@gmail.com", ..., role: "member", status: "pending"}`. All other tables in the schema already had `createdAt`; only `invitation` was missing it
FIX: Send invitation/auth emails via `ctx.scheduler.runAfter(0, internal.email.sendEmail, ...)` instead of a module-level `pendingEmails` queue (`convex/auth/config.ts`). Previously `sendInvitationEmail` / `sendResetPassword` / `sendVerificationEmail` / `sendChangeEmailVerification` / `sendDeleteAccountVerification` / `sendVerificationOTP` pushed to a module-scoped array that was only flushed by a custom `inviteMember` mutation - but the frontend uses `authClient.organization.inviteMember()` which routes through Better Auth's HTTP handler (`authComponent.registerRoutes` in `convex/http.ts`), bypassing the flush entirely. In production Convex, the array was silently dropped and no email ever reached Resend. Removed the dead `flushEmails` internal mutation and simplified the custom `inviteMember` mutation in `convex/auth/mutations.ts`
FIX: Replace `Avatar` with `Image` for the app logo on the sign-in page (`src/routes/auth/signin/index.tsx`) so the icon is no longer rendered as a circle
FIX: Set explicit `base: "/"` in `vite.config.ts` so production HTML on Vercel references assets at `/assets/...` instead of `/vercel/path0/assets/...`. The Vercel build was leaking the runner cwd into Vite's base, which propagated through TanStack Start's `joinURL(viteConfig.base, fileName)` in the manifest builder, breaking the stylesheet link and every modulepreload (CSS file existed at `/assets/...` but the HTML pointed elsewhere, leaving the site unstyled).
FEATURE: Prerender all `/docs/*` pages to static HTML at build time. `vite.config.ts` now reads `content/docs/` synchronously, builds a `pages` array (one entry per .mdx + the `/docs` index), and passes it to `tanstackStart({ prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false }, pages })`. The route loader (filesystem read + Shiki highlight) runs once at build time per doc instead of on every request. Confirmed: `pnpm build` writes 14 static `.output/public/docs/**/index.html` files (e.g. `safe-actions/index.html` is 165 KB with title, description, and pre-highlighted code baked in). Auth/admin/account routes are explicitly excluded so they keep their per-request SSR behavior.
CHORE: Add unit tests covering `cn`, `getInitials`, `formatDate`, `getCallbackUrl`, `fileToBase64`, `getPlanLimits`/`getPlanFeatures`, `RESERVED_SLUGS`, `ApplicationError`/`ActionError`/`ZodRouteError`, `useDebouncedValue`, `useCopyToClipboard`, `useIsMobile`, `useIsClient`, `useIsMac`, and `mapSubscription` (jumps suite from 88 to 165 passing tests)
FIX: Repair failing dialog manager and intercept-dialog tests after the `Esc`/`↵` Kbd hints were added to the dialog footer (button labels now match by regex) and after `InterceptDialog` switched from `router.back` to `router.history.back`
FIX: Remove redundant `<Separator />` before every `<CardFooter>` across the app - `CardFooter` already includes `border-t`, so the extra separator caused a visible double border. Cleaned up in billing overview, admin org/user pages, account profile/security/new-password forms, and org settings details
CHORE: Remove the `/test-headers` brainstorm page (`src/routes/test-headers.tsx`) now that the "Linear Compact" variant has been adopted as the real content header
REFACTOR: Stop blocking the org navigation layout (`src/routes/orgs/$orgSlug/(navigation)/route.tsx`) on both `getCurrentOrganization` and `listOrganizations`. Render the sidebar shell + `<Outlet />` immediately so child routes start fetching in parallel. `OrgNavigation` and `OrgSidebar` now accept undefined `userOrgs` / `memberRoles` and show a small `Skeleton` in place of `OrgsSelect` while the org list loads
FIX: Restyle docs `ContentSearch` dialog (`src/features/layout/content-search.tsx`) to match the in-app `OrgCommand` design - custom `Dialog` with `rounded-xl`, `shadow-2xl ring-4`, command items with `data-[selected=true]:border-input` styling, and a `Go to Page` footer bar
FEATURE: Adopt the "Linear Compact" header style on all `(layout)` content pages (docs, blog, changelog, about, contact). Reworked `src/features/layout/content-header.tsx` to a 48px-tall sticky bar with a logo + vertical separator + plain text nav (active route in `text-foreground font-medium`, others in `text-muted-foreground`), and added a `⌘K` search trigger in `src/features/layout/content-search.tsx` that opens a `CommandDialog` with page navigation (uses `useHotkeys("mod+k")`). `src/features/layout/content-nav.tsx` simplified to inline text links. Docs sidebar offsets in `src/routes/(layout)/docs/_components/docs-sidebar.tsx` updated from `top-16` / `h-[calc(100vh-4rem)]` to `top-12` / `h-[calc(100vh-3rem)]` (and the mobile sub-header from `top-16 h-14` to `top-12 h-12`) to match the new header height
FEATURE: Redesign landing page footer (`src/features/layout/footer.tsx`) in Thumbfa.st style - logo + tagline + social pills on the left, three compact link columns (Product, Account, Legal), and a giant `font-elegant` site name watermark across the bottom that fades from `[#fafafa]/8` to transparent for a modern, premium feel
FEATURE: Add `/test-headers` brainstorm page (`src/routes/test-headers.tsx`) showcasing 10 distinct header + footer variations stacked side-by-side (floating pill, minimalist inline, glass card, brutal mono, sidebar-integrated, linear compact, stacked two-row, underlined tabs, search-first, hero with sticky bar) so the docs page chrome can be picked visually before redesigning `/docs`
FEATURE: Syntax-highlight code blocks across the docs - both the API examples in the right-hand sidebar and the fenced ` ```lang ... ``` ` blocks inside MDX content (`src/routes/(layout)/docs/$.tsx`, `src/routes/(layout)/docs/_components/docs-api-examples.tsx`). The loader pre-renders snippets with Shiki dual themes (`github-light` / `github-dark`) and inlines the HTML before passing to `markdown-to-jsx`, since that renderer does not support rehype plugins. The original markdown is still preserved on the loader response for the "copy page" action. Padding/radius for the highlighted blocks restored via `.docs-shiki` rules in `src/globals.css` since `not-typography` strips the default `pre` styling
FIX: Match org selector border/radius to search input in sidebar (`border-input rounded-lg`) so the two stacked elements share a consistent style in `src/routes/orgs/$orgSlug/(navigation)/_navigation/orgs-select.tsx`
FIX: Remove redundant `<Separator />` before each `<CardFooter>` on the `/orgs/:slug/demo` dialog page (`src/routes/orgs/$orgSlug/(navigation)/demo/demo-dialog-page.tsx`) - `CardFooter` already has `border-t`, so the extra separator caused a visible double border above the footer text
FIX: Widen org command dialog (`sm:max-w-xl`) and remove redundant border/bg styling on `command-input-wrapper` in `src/routes/orgs/$orgSlug/(navigation)/_navigation/org-command.tsx` — the new `CommandInput` already wraps the input in a bordered `InputGroup`, so the extra wrapper styling caused a visible "search inside a search" double-border
FIX: Align Theme item icon spacing in user dropdown (`mr-4` -> `mr-2`) to match other menu items in `src/features/auth/user-dropdown.tsx`
FIX: Guard `config[label]` access in `ChartTooltipContent` (`src/components/ui/chart.tsx`) - hovering the dashboard subscribers chart on `/orgs/:slug` threw "Cannot read properties of undefined (reading 'label')" because Recharts passes X-axis tick values (e.g. "January") that are not keys of `chartConfig`
FIX: Apply `dark` class to `SignInDialog` content so the dialog matches the landing page's forced-dark theme even when the user's resolved theme is light (the dialog portals to `<body>`, escaping the landing page's `dark` wrapper)
FEATURE: Add `contentClassName` prop on `UserDropdown` / `LoggedInButton` / `AuthButtonClient` and pass `dark` from `LandingHeader` so the user dropdown menu (and Theme submenu) inherit the landing page's dark theme without affecting other contexts where the dropdown should follow the user's actual theme
FIX: Remove `async` keyword from `getChildrenFromAsChild` in `src/components/ui/base-ui-compat.tsx` - it returned a Promise that React 19 tried to render as an async client component, throwing "An unknown Component is an async Client Component" inside every Button/Tabs/Popover/Tooltip/Sheet/Sidebar/Item, breaking landing → /auth/signin and dropdown navigation

## 2026-04-26

FIX: Restore dark mode by removing duplicate `:root` block at the bottom of `src/globals.css` that was overriding `.dark` theme variables
FIX: Re-add `InlineTooltip` export to `src/components/ui/tooltip.tsx` (adapted to the new base-ui Tooltip API)
CHORE: Run prettier on the entire project
REFACTOR: Migrate org members route to the idiomatic Convex + TanStack Start pattern with `convexQuery()` helper - one shared `orgQuery(orgSlug)` factory used by both the route `loader` (`ensureQueryData`) and `useSuspenseQuery` in the component, eliminating skeleton flashes on tab switches and sibling navigation
REFACTOR: Simplify org members settings tabs to use shadcn TabsList pill style (clear active state) without icons or counts
FIX: Align landing header with hero card edges (max-w-6xl px-6 instead of max-w-7xl px-4 lg:px-8)
FIX: Enlarge "See what's coming next" CTA card to max-w-6xl to match hero card width
FEATURE: Add `pnpm start-app -p <port>` to boot Convex + TanStack Start together with logs streamed to `.logs/web.txt` and `.logs/convex.txt` (truncated each start) and document log-debug workflow in CLAUDE.md / AGENTS.md

## 2026-04-12

FIX: Downgrade better-auth to 1.5.6 for @convex-dev/better-auth@0.11.4 compatibility (1.6.x sends unsupported `mode` field in queries)
CHORE: Upgrade all dependencies to latest versions (TypeScript 6, Vite 8.0.8, Vitest 4.1, shadcn 4.2, TailwindCSS 4.2.2, etc.)
FIX: Pin ESLint to 9.x for eslint-plugin-react compatibility
FIX: Replace removed lucide-react Github brand icon with inline SVG component
FIX: Fix recharts ChartTooltipContent type errors after upgrade (Partial tooltip props)
FIX: Fix no-useless-assignment lint error in stripe webhook and send-email
REFACTOR: Migrate Convex email sending from raw Resend API fetch to @convex-dev/resend component (queued, durable, with retries)

## 2026-04-01

FIX: Remove fake invoices and synthetic usage data from org billing pages in favor of honest empty states
FIX: Restore org dashboard navigation routes after placeholder files replaced the real org pages
FIX: Redirect social sign-in to /orgs by default for consistent post-login routing

## 2026-03-31

FIX: Fix overrideLimits and metadata types to use serializable types instead of `unknown` for TanStack Start compatibility
FIX: Wire up admin feedback action to actual getFeedbackList instead of returning empty stub
FIX: Fix miscellaneous TypeScript errors - replace @unpic/react Image fill prop with native img tags, fix ZodError .errors to .issues, add periodStart/periodEnd to Subscription type, add Request type annotations to API routes, fix auth-type import, suppress missing opengraph-image modules
REFACTOR: Clean code pass - remove 15+ `any` types across proxy-utils, get-org, admin-charts-data, admin-users, admin-organizations
REFACTOR: Replace magic numbers with named constants in MRR calculation (MONTHS_PER_YEAR, WEEKS_PER_MONTH, DAYS_PER_MONTH)
REFACTOR: Fix wrong Convex import paths (@/../convex/ to @convex/) in admin-charts-data and admin-organizations
REFACTOR: Type event handler in use-warn-if-unsaved-changes (any to Event)
REFACTOR: Simplify proxy-utils - remove redundant member checks since listOrganizations is already session-scoped
REFACTOR: Fix org list component to use actual API return types instead of accessing undefined properties via any
FIX: Fix TypeScript errors - cache polyfill, subscription periodStart/periodEnd, API route handler signature, dialog input type, route type assertions
FIX: Fix TypeScript errors across Link components - change `to` to `href` on anchor tags, remove invalid `prefetch` prop, convert template literal routes to `to`+`params` pattern, fix router API calls
REFACTOR: Extract duplicated fileToBase64 utility from admin user and org pages into shared @/lib/file-to-base64
FIX: Join user data in feedbacks getById query and fix TanStack Router Link typing on feedback detail page
FIX: Remove all (api as any) casts - use properly typed Convex api references and regenerate types
FEATURE: Add specific skeleton pendingComponent for signin page matching exact page layout
REFACTOR: Reorganize entire convex/ directory into domain folders with queries/mutations separation
REFACTOR: Split convex/auth.ts (545 lines) into auth/config, auth/queries, auth/mutations
REFACTOR: Split convex/integrations.ts into separate email.ts and stripe.ts
REFACTOR: Split convex/subscriptions.ts into subscriptions/queries and subscriptions/mutations
REFACTOR: Split convex/feedbacks.ts into feedbacks/queries and feedbacks/mutations
FIX: Remove extra spacer div causing large gap above landing page header
FIX: Fix GitHub login button not showing - fetch available social providers from Convex instead of local env vars
CHORE: Normalize all convex imports to use @convex/\* path alias

## 2026-03-30

FIX: Remove vercel-build script that conflicted with Nitro build on Vercel deployment
FIX: Fix LinkStripeCustomer missing data wrapper causing "expected object" error
FEATURE: Add avatar/name card-based editing to admin org detail profile tab
FEATURE: Add avatar upload card to admin user detail page
FEATURE: Add admin/user role badge and banned badge to admin user detail page
FEATURE: Make tabs URL-based (?tab=) on admin user and org detail pages
FIX: Fix admin org detail 404 - implement orgDetailLoader with Convex getOrganizationById query
FIX: Fix admin user detail showing no organizations - use Convex component adapter findMany for memberships
FIX: Fix org list spacing to match users list page
FIX: Update admin page skeletons to match rendered layouts (stats cards, charts, user detail tabs, org detail tabs)
FIX: Fix admin user detail page - implement getUserById Convex query and wire up loader
FIX: Fix admin organizations page - safe access on \_count.members, correct API calls
FIX: Fix admin pages by adding listUsers and createUser Convex queries, fix sessions access crash
FEATURE: Force landing page to always use dark mode regardless of user theme preference
FIX: Fix spacing on Create Account Password card - footer and separator were outside card bounds
REFACTOR: Restructure account page into separate Dub-style cards (Name, Email, Avatar, User ID) with individual save actions
FEATURE: Add Security link to account sidebar navigation
UPDATE: Replace generic SaaS placeholders on billing plan page with testimonial-specific features (Testimonial Forms, Video Storage, Custom Branding, Embed Widgets, etc.)
UPDATE: Modernize dialog manager UI to match thumbfa.st style (bordered ring, footer bar with Esc/Enter hints)
FEATURE: Add settings gear icon to org selector dropdown with current org on top and separator
FIX: Fix changelog dismiss - use localStorage instead of broken server actions, fix sidebar footer spacing
FEATURE: Add Demo page with dialog manager showcase (confirm, input, custom variants)
FIX: Add realistic fake data to all billing pages (usage chart, invoices, plan status colors)
CHORE: Remove /account/email page and newsletter Resend audience logic (keep transactional emails)
FIX: Replace empty form placeholders with contextual hints (slug, org name)
FIX: Make billing hasSubscription dynamic instead of hardcoded false
FIX: Fetch real invitations from better-auth instead of empty array
FIX: Replace fake usage chart data with honest zero values
FIX: Add proper empty states for payment methods, invoices, and upcoming invoice cards

## 2026-03-29

REFACTOR: Switch file uploads from Vercel Blob to Cloudflare R2 (S3 SDK) with nowts.mlvcdn.com custom domain
FIX: Fix image upload serialization error by converting File to base64 before sending to TanStack Start server functions
FIX: Add toast feedback on org settings save and fix uploadOrgImageAction missing orgSlug parameter
FIX: Fix "Invalid origin" error when saving org settings by adding localhost wildcard to Better Auth trustedOrigins
FIX: Fix Vite CSS ENOENT error caused by stale .augment directory reference - clear Vite cache and exclude AI tool directories from Tailwind scanning
FIX: Fix ugly loading placeholders on org pages - add sidebar layout skeleton, dashboard-specific and settings-specific pending components

## 2026-03-28

FEATURE: Redesign account settings profile card with sectioned layout - avatar + name hero, separated email info, clean action footer
FIX: Fix account page layout - align header with org navigation pattern, fix sign-out button (SubmitButton outside form), use fetchAuthMutation for signOut
REFACTOR: Full migration from Prisma/PostgreSQL/Redis to Convex backend
FEATURE: Add Convex backend with Better Auth integration (convex/auth.ts, convex/schema.ts, convex/http.ts)
FEATURE: Add Convex subscriptions and feedbacks tables with CRUD operations
FEATURE: Add Convex integrations for email (Resend) and payments (Stripe)
REFACTOR: Wire TanStack Start with Convex - ConvexQueryClient, ConvexBetterAuthProvider, SSR token handling
REFACTOR: Migrate auth handler from Prisma-based betterAuth to Convex-backed auth-server.ts
REFACTOR: Add convexClient plugin to auth-client.ts
REFACTOR: Update router.tsx with ConvexQueryClient and ConvexProvider
REFACTOR: Update \_\_root.tsx with ConvexBetterAuthProvider and getToken SSR
REFACTOR: Migrate all server actions to use Convex instead of Prisma
REFACTOR: Migrate all API routes to use Convex instead of Prisma
REFACTOR: Migrate organization helpers to use Convex queries
REFACTOR: Replace Prisma type imports with local type definitions
CHORE: Remove Prisma, Redis, PG dependencies and all related files
CHORE: Update package.json scripts for Convex (postinstall, vercel-build)
CHORE: Update vite.config.ts - remove Prisma/Redis externals, add Convex noExternal

## 2026-03-27

FIX: Fix all 8 failing test files (31 tests) - migrate from next/navigation to @tanstack/react-router, rewrite tests for new API middleware and server functions
REFACTOR: Rename zod-route.ts to api-middleware.ts and update all imports across codebase
CHORE: Install missing nprogress dependency
CHORE: Update all documentation, rules, VSCode snippets, and skill references from Next.js patterns to TanStack Start patterns
CHORE: Update security-check skill references from Next.js zod-route patterns to TanStack Start API patterns (createAPIFileRoute, handleApiError, authMiddleware, orgMiddleware, adminMiddleware)
REFACTOR: Redesign blog pages - Upstash-style minimal 2-column card grid, centered heading with category badges, fix routing ([slug] -> $slug for TanStack Router), fix category filter page
FIX: Fix docs pages for TanStack Start - add docs index page, fix property access (attributes.title/description), add TOC extraction, API examples sidebar, and fix anchor/external link attributes (to -> href)
CHORE: Remove all Next.js remnants from app/ directory (loading.tsx, error.tsx, not-found.tsx, global-error.tsx, @modal/, duplicate index.tsx/route.tsx/API files) and .conductor/LIGHT-TS backup
REFACTOR: Add gradient hero card with blue-to-dark gradient, noise texture overlay, and polished browser chrome (SaveIt.now style)
REFACTOR: Redesign admin user detail page layout - PersonalInfo card (avatar, name fields, email) with right sidebar containing user ID, email, join date, and status badges separated by dividers
REFACTOR: Redesign admin organization detail page with Clerk-style two-column layout (tabs, sidebar metadata)
REFACTOR: Admin sidebar header - replace blue "A" with Shield icon and project name subtitle
FEATURE: Add provider actions (Set Password, Revoke All Sessions) to admin user providers via Better Auth admin API
REFACTOR: Replace auth providers Table with compact Item components in admin user detail
REFACTOR: Redesign user details card as two-column layout (profile left, metadata sidebar right)
REFACTOR: Make account profile form more compact - avatar beside name/email, badge inline with email label
FEATURE: Add Instrument Serif font (font-elegant) and dark landing-page class with noise texture overlay
REFACTOR: Modernize entire landing page with SaveIt.now/Lumail dark editorial design (dark bg, font-elegant headings, noise texture)
REFACTOR: Rewrite pricing section in Lumail style (dark plan cards, highlighted popular plan, feature checklist, no toggle)
REFACTOR: Override CSS variables inside .landing-page for proper dark shadcn component rendering
REFACTOR: Replace bento grid with clean icon+text benefits grid (SaveIt WhySaveIt style)
REFACTOR: Simplify hero section - remove gradient backgrounds, add browser window chrome for screenshot
REFACTOR: Simplify landing header - minimal fixed bar with backdrop-blur, direct nav links
REFACTOR: Redesign stats section as card grid layout
REFACTOR: Redesign FAQ section from accordion to clean grid layout
REFACTOR: Redesign pain section as modern old/new way grid comparison
REFACTOR: Simplify all CTA sections - remove background images and SVG gradients
REFACTOR: Modernize footer with direct link nav (no Button wrappers)
REFACTOR: Clean up feature section with minimal typography
REFACTOR: Simplify review components - lighter card style, inline bold parsing
REFACTOR: Update pricing section - remove gradient background, add section numbering style
FEATURE: Add real Terms of Service content to legal/terms page
FEATURE: Add real Privacy Policy content to legal/privacy page
REFACTOR: Streamline landing page composition - remove SectionDividers and unused sections
REFACTOR: Replace all custom Tailwind colors with shadcn theme tokens in admin pages (primary, destructive, muted)
REFACTOR: Redesign admin user detail page with Clerk-style two-column layout (tabs, sidebar metadata)
FEATURE: Add filter popover to admin users page with Role and Status filters
FEATURE: Replace admin users columns picker with cleaner DropdownMenuCheckboxItem component
REFACTOR: Update getAdminUsers server function to support role and status filter parameters
REFACTOR: Redesign admin organization detail page with Clerk-style two-column layout (tabs, sidebar info, responsive design)
REFACTOR: Redesign admin users page with Clerk-style UI (tabs, search, column toggles, modern table)
REFACTOR: Redesign admin organizations page with Clerk-style UI (org logos, modern table)
FEATURE: Add client-side data fetching for admin pages via API routes + TanStack Query
FEATURE: Add Create User dialog with Create User / Invite User tabs
FEATURE: Add admin users API route (GET /api/admin/users) with search and pagination
FEATURE: Add admin user creation API route (POST /api/admin/users/create)
FEATURE: Add admin organizations API route (GET /api/admin/organizations) with search and pagination

## 2026-03-22

REFACTOR: Migrate from Next.js to TanStack Start
REFACTOR: Move routes from app/ to src/routes/ (TanStack default)
REFACTOR: Replace next-safe-action with createServerFn + createMiddleware
REFACTOR: Replace next-zod-route with createAPIFileRoute + handleApiError
REFACTOR: Convert all API routes to createAPIFileRoute pattern
REFACTOR: Convert all server actions to createServerFn pattern
REFACTOR: Replace better-auth nextCookies() with tanstackStartCookies()
REFACTOR: Replace next/headers with getRequest() from @tanstack/react-start/server
REFACTOR: Replace next/link with @tanstack/react-router Link
REFACTOR: Replace next/image with @unpic/react or native img
REFACTOR: Replace next/navigation hooks with @tanstack/react-router equivalents
REFACTOR: Replace next/dynamic with React.lazy + Suspense
REFACTOR: Replace @t3-oss/env-nextjs with @t3-oss/env-core
REFACTOR: Replace @tailwindcss/postcss with @tailwindcss/vite
REFACTOR: Rename NEXT*PUBLIC*\_ env vars to VITE\_\_
REFACTOR: Switch Prisma generator from prisma-client-js to prisma-client (ESM)
REFACTOR: Create vite.config.ts, src/router.tsx, src/vite-env.d.ts
REFACTOR: Create \_\_root.tsx replacing Next.js root layout.tsx
REFACTOR: Convert sitemap.tsx and manifest.ts to API routes
CHORE: Remove Next.js, PostCSS, next-safe-action, next-zod-route, nuqs, nprogress
CHORE: Add @tanstack/react-router, @tanstack/react-start, @tanstack/zod-adapter, vite, vite-tsconfig-paths
CHORE: Add @fontsource-variable/inter, @fontsource-variable/space-grotesk, @fontsource/geist-mono

## 2026-03-05

CHORE: Upgrade all 58 dependencies to latest versions
FIX: Update better-auth 1.5.x API - rename organizationCreation to organizationHooks, afterCreate to afterCreateOrganization
FIX: Update better-auth 1.5.x API - rename sendChangeEmailVerification to sendChangeEmailConfirmation
FIX: Update better-auth 1.5.x API - rename permission to permissions in hasPermission calls
FIX: Update TanStack Store subscribe return type for proper useEffect cleanup
CHORE: Add @better-auth/prisma-adapter as direct dependency (required by better-auth 1.5.x)
CHORE: Keep ESLint at 9.x (plugins don't support ESLint 10 yet)

## 2026-02-16

FEATURE: Add /api/status route with optional random number query parameter
FEATURE: Add /api/status health check route
FEATURE: Add middleware redirect from /admin/interdit to /home

## 2026-01-24

FEATURE: Add "Dismiss all" button to changelog sidebar stack for dismissing multiple changelogs at once

## 2026-01-22

FEATURE: Add changelog system documentation in content/docs/changelog.mdx
FEATURE: Add add-documentation skill with SKILL.md and reference for creating documentation in content/docs/
FEATURE: Add documentation template and create-doc.sh script (mandatory for creating new docs)

## 2026-01-21

FIX: Free plan users now redirect to Stripe checkout instead of billing portal when upgrading

## 2026-01-19

FEATURE: Add x-org-slug header support for /api/orgs/\* routes in middleware

## 2026-01-18

CHORE: Add Prisma security and performance rules (orgId filtering, select over include, codebase patterns)
FEATURE: Add domain question to init-project workflow for Resend email configuration (with/without domain support)

## 2026-01-13

CHORE: Remove 14 unused files including admin components, docs components, and utility files
CHORE: Remove 5 unused dependencies (@ai-sdk/openai, ai, @types/react-syntax-highlighter, radix-ui, ts-node) saving ~3MB
REFACTOR: Remove duplicated FileMetadata type from avatar-upload.tsx, import from use-file-upload.ts instead
REFACTOR: Replace session-based organization context with URL slug-based routing using middleware headers for multi-tab support
FIX: Update hasPermission to pass explicit organizationId for Better Auth compatibility
REFACTOR: Move legal and docs links from floating footer to minimal sidebar navigation above Settings button with text-xs

## 2026-01-02

REFACTOR: Add cacheLife("max") to docs, changelog, and posts pages for 30-day cache instead of 15-minute default
REFACTOR: Improve mobile nav user button to show avatar + name/email with dropdown instead of just avatar
FEATURE: Add responsive mobile navigation for documentation with sticky header and sheet sidebar
FIX: Fix documentation page horizontal overflow when description text is too long
FEATURE: Add /add-documentation slash command for creating and updating docs in content/docs/
REFACTOR: Add useDebugPanelAction and useDebugPanelInfo hooks for cleaner debug panel registration with automatic cleanup
FIX: Improve changelog dialog responsiveness on mobile with smaller padding and text sizes

## 2025-12-28

REFACTOR: Replace admin back button with breadcrumb navigation (matching org page style)

## 2025-12-27

REFACTOR: Merge billing info into single card with next payment date, amount, and payment method
FEATURE: Add "Create customer" button to auto-create Stripe customer for organizations
FEATURE: Add inline title editing with org avatar on admin organization detail page
FEATURE: Add coupon code support for admin subscription management (enables 100% off plans without payment method)
REFACTOR: Admin user organizations list uses badges for role and plan instead of text with dots
REFACTOR: Admin user organizations list uses proper ItemGroup pattern with separators and unified border
REFACTOR: Modernize admin subscription UI with plan cards, monthly/yearly toggle, and status indicators
REFACTOR: Feedback detail page uses Item component instead of Card for consistent styling
REFACTOR: Post detail page now matches changelog detail style - max-w-2xl layout, aspect-video image, badges with icons, prose content
REFACTOR: Simplify admin charts with Stripe-style design - hero numbers, no grid, cleaner layout
REFACTOR: Use dot style badges for status indicators in admin user sessions and providers tables
FEATURE: Add MRR growth and user growth charts to admin dashboard with Stripe data
REFACTOR: Remove 15 PostCard variants, keep single clean compact design
REFACTOR: Consolidate image upload components into unified ImageDropzone with avatar/square variants
REFACTOR: Unify sidebar trigger button style across all navigation components
REFACTOR: Add size="lg" to all admin dashboard pages for consistent layout width
CHORE: Add v2.1.0 changelog entry and update image paths
REFACTOR: Changelog timeline with vertical line on left, date labels, and compact cards
FEATURE: Add active state highlighting to content header navigation
FIX: Remove pulsing animation from changelog timeline first item
REFACTOR: Modernize changelog UI with docs-style header, footer, and blog post layout
REFACTOR: Changelog detail page now uses aspect-video image, cleaner badges, and prose styling
REFACTOR: Changelog list page uses card-based layout with hover effects and latest badge

## 2025-12-26

FEATURE: Changelog page timeline view with vertical timeline, version badges, and hover effects
CHORE: Add unit tests for changelog-manager and changelog actions
CHORE: Add E2E tests for changelog dialog flow
FIX: InterceptDialog uses router.refresh() after router.back() to reset parallel route slot state
FIX: InterceptDialog only calls router.back() when closing, not on every state change
FEATURE: Add "Reset Changelog" debug action to restore dismissed changelogs
FEATURE: Debug Panel with draggable/resizable UI, session info, and dynamic action buttons (dev only)
FEATURE: Public changelog system with CardStack animation and timeline UI
FEATURE: Changelog CardStack widget in organization sidebar
FEATURE: Intercepting routes for changelog dialog from any page
FEATURE: Claude Code slash command for creating changelog entries
FEATURE: Add reply button with textarea dialog on feedback detail page
FEATURE: Clickable user Item on feedback detail page navigates to user profile
REFACTOR: Replace feedback table with Item components for cleaner UI

## 2025-12-15

FIX: Remove insecure trusted origins wildcard configuration in auth
FIX: Use hard redirects for impersonation to update profile button immediately
FIX: Breadcrumb path selection slice issue
FIX: Typo in prisma:generate script
FIX: ESLint and TypeScript errors across codebase
FIX: Vitest config ESM conversion
FIX: generateStaticParams for posts in production (Next.js 16 compatibility)

FEATURE: Major performance improvements with refactored application architecture
FEATURE: TanStack Form migration replacing React Hook Form across all forms
FEATURE: Redis caching for improved performance
FEATURE: OTP-based password reset flow
FEATURE: Complete OTP sign-in flow implementation
FEATURE: Responsive provider buttons (full width when single provider)
FEATURE: Global PageProps type for standardized page component typing

REFACTOR: Middleware utilities extraction with admin route protection

CHORE: Update Better-Auth to version 1.3.27
CHORE: Update VSCode snippets and workflow configuration
CHORE: Add environment variables guide
CHORE: Improve type safety in chart and tooltip components
CHORE: Remove unused shadcn-prose dependency

## 2025-08-23

FEATURE: GridBackground component for customizable visual design
FEATURE: Admin feedback system with filters, tables, and detailed views
FEATURE: Documentation system with dynamic content and sidebar navigation
FEATURE: Last used provider tracking for enhanced sign-in experience
FEATURE: Contact and about pages

CHORE: Update Next.js to 15.5.0
CHORE: Update React to 19.1.1
CHORE: Update AI SDK to v5
CHORE: Update all Radix UI component packages
CHORE: Update testing dependencies and build tools
CHORE: Claude Code integration with new agents, commands, and formatting hooks
CHORE: Improve API file organization and documentation structure

## 2025-08-13

FEATURE: Complete admin dashboard with sidebar layout and routing
FEATURE: Admin-only authentication guards with role checking
FEATURE: User management interface with search, pagination, and role filtering
FEATURE: User detail pages with session management and impersonation
FEATURE: Organization management interface with member management
FEATURE: Subscription management with plan changes and billing controls
FEATURE: Payment history with Stripe integration for admin oversight
FEATURE: AutomaticPagination reusable component

REFACTOR: Move billing ownership from User to Organization level
REFACTOR: Migrate stripeCustomerId from User model to Organization model
REFACTOR: Update webhook handlers for organization-based billing
REFACTOR: Replace Better-Auth subscription methods with custom server actions
REFACTOR: Billing page with Card components and Typography

FIX: Remove all `any` type usage in Stripe webhook handlers
FIX: Type compatibility issues across billing system
FIX: Card hover effects replaced with clean styling
FIX: Organization/user names now clickable instead of separate View buttons

## 2025-07-14

FEATURE: Playwright workflow migrated to local CI testing with PostgreSQL service
FEATURE: Comprehensive logging throughout all E2E tests

REFACTOR: Migrate Prisma configuration from package.json to prisma.config.ts
REFACTOR: Rename RESEND_EMAIL_FROM to EMAIL_FROM

FIX: Delete account test case sensitivity issue
FIX: Button state validation and error handling in tests
FIX: External API dependency error catching for build
FIX: DATABASE_URL_UNPOOLED configuration for Prisma
FIX: OAuth secrets renamed (GITHUB to OAUTH_GITHUB)

CHORE: Add all required GitHub secrets for CI testing
CHORE: Enhance Playwright reporter configuration for CI visibility

## 2025-06-01

FEATURE: Orgs-list page to view organization list
FEATURE: Adapter system for email and image upload

FIX: API Error "No active organization"

CHORE: Upgrade libraries to latest versions

## 2025-05-03

FEATURE: NowStack deployed app tracker
FEATURE: Functional database seed

## 2025-04-17

FEATURE: Resend contact support

REFACTOR: Prisma with output directory
REFACTOR: Replace redirect method
REFACTOR: Update getOrg logic to avoid bugs

FIX: Navigation styles
FIX: Hydration error

CHORE: Upgrade to Next.js 15.3.0

## 2025-04-06

FEATURE: Better-Auth organization plugin
FEATURE: Better-Auth Stripe plugin
FEATURE: Better-Auth permissions
FEATURE: Middleware authentication handling

REFACTOR: Replace AuthJS with Better-Auth
REFACTOR: Upgrade to Tailwind V4
REFACTOR: Layout and pages upgrade

## 2024-09-12

FEATURE: NEXT_PUBLIC_EMAIL_CONTACT env variable
FEATURE: RESEND_EMAIL_FROM env variable

## 2024-09-08

FEATURE: Add slug to organizations
REFACTOR: Update URL with slug instead of id

## 2024-09-01

FEATURE: NowStack version 2 with organizations
