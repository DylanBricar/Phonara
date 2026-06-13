---
paths:
  - "**/stripe*"
  - "**/stripe/**"
  - "**/billing/**"
  - "**/plans/**"
  - "**/*subscription*"
  - "**/subscriptions/**"
---

# Stripe Billing

Entry points:

- **Upgrade / portal / admin billing flows** -> Convex actions call the Stripe SDK.
- **Webhook** -> Convex `httpAction` at `https://<deployment>.convex.site/stripe/webhook` -> `internal.stripe.actions.processWebhook` -> internal subscription mutations.

Stripe webhooks **never** go through a Vercel/TanStack route — that legacy stub was removed. All webhook handling lives in `convex/http.ts` + `convex/stripe/actions.ts`.

## Key files

| File                                            | Purpose                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `convex/billing/plans.ts`                       | Source of truth for plan names, prices, limits, trial days, Stripe env var names, and active subscription statuses |
| `src/lib/auth/stripe/auth-plans.ts`             | UI auth plans derived from `convex/billing/plans.ts`, plus UI-only feature copy                                    |
| `src/lib/organizations/get-org-subscription.ts` | Reads active subscription for an org                                                                               |
| `convex/http.ts`                                | Mounts `POST /stripe/webhook`                                                                                      |
| `convex/stripe/actions.ts`                      | Org billing actions, internal Stripe helpers, webhook processing                                                   |
| `convex/admin/billing.ts`                       | Admin billing actions                                                                                              |
| `convex/subscriptions/queries.ts`               | Org subscription queries                                                                                           |
| `convex/admin/subscriptions.ts`                 | Admin subscription queries/mutations                                                                               |
| `convex/subscriptions/mutations.ts`             | `upsertFromWebhook`, `updateFromWebhook` (internal)                                                                |
| `scripts/setup-stripe-webhook.mjs`              | Idempotent CLI: registers the webhook with Stripe, stores signing secret in Convex env                             |

## `subscriptions` table

Defined in `convex/schema.ts`. Indexes: `by_organization`, `by_stripe_id`, `by_status`. Fields most code touches: `organizationId`, `plan`, `status` (`active` / `trialing` / `past_due` / `canceled`), `stripeCustomerId`, `stripeSubscriptionId`, `periodStart` / `periodEnd` (ms), `cancelAtPeriodEnd`, `seats`, `overrideLimits`.

## Mutation visibility (don't break this)

| Function                                                                      | Access                         | Caller                          |
| ----------------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| `convex/subscriptions.queries.getByOrganization`, `getActiveByOrganization`   | `orgQuery`                     | org UI                          |
| `convex/admin/subscriptions.*`                                                | `adminQuery` / `adminMutation` | admin UI/actions                |
| `convex/admin/billing.*`                                                      | `adminAction`                  | admin UI                        |
| `convex/stripe/actions.createOrganizationCheckout`, `createOrganizationBillingPortal` | `orgAction` owner/admin        | org billing UI                  |
| `upsertFromWebhook`, `updateFromWebhook`                                      | **internal**                   | only `convex/stripe/actions.ts` |

Never expose `*FromWebhook` as public mutations.

## Environment variables

Convex env (`pnpm exec convex env set KEY value`) - used by `convex/stripe/actions.ts`:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (Convex-only - signature verification happens inside the `httpAction`)
- `STRIPE_PRO_PLAN_ID`, `STRIPE_PRO_YEARLY_PLAN_ID`
- `STRIPE_ULTRA_PLAN_ID`, `STRIPE_ULTRA_YEARLY_PLAN_ID`

Vercel env - used by `src/lib/stripe.ts` and the client:

- `STRIPE_SECRET_KEY` (also)
- `VITE_STRIPE_PUBLISHABLE_KEY` (only if embedding Stripe Elements)
- All `STRIPE_*_PLAN_ID` vars (also)

## Adding a new plan

1. Stripe Dashboard: create Product + monthly + annual Prices. Set `plan: "<name>"` in each Price's metadata (the webhook reads it).
2. Add `STRIPE_<NAME>_PLAN_ID` and `STRIPE_<NAME>_YEARLY_PLAN_ID` to Convex env AND Vercel.
3. Add the plan once in `convex/billing/plans.ts` (name, prices, limits, trial days, Stripe env var names). Do not duplicate the plan name elsewhere.
4. Add `ADDITIONAL_FEATURES.<name>` in `src/lib/auth/stripe/auth-plans.ts` only if the plan needs UI-only feature copy. Limits and Stripe price IDs are derived from `convex/billing/plans.ts`.

## Webhook setup

`pnpm start-all` runs `node scripts/setup-stripe-webhook.mjs --quiet` automatically once Convex dev is up. The script is dynamic + idempotent: it derives the URL from `VITE_CONVEX_SITE_URL` (`.env.local`), reads `STRIPE_SECRET_KEY` from `.env`/`.env.local`/Convex env, ensures Stripe has an endpoint at `<convex-site>/stripe/webhook` subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and writes `STRIPE_WEBHOOK_SECRET` into Convex env. If the endpoint exists but the Convex env secret is missing, it deletes + recreates (Stripe doesn't return signing secrets on read). Run it manually with `node scripts/setup-stripe-webhook.mjs` to see verbose output.

## Local webhook testing

`pnpm start-all` already runs `setup-stripe-webhook.mjs` so the dev Convex deployment is wired to Stripe automatically — no separate `stripe listen` step needed for the documented flow. The legacy `pnpm stripe-webhooks` script in `package.json` forwards to `localhost:3000/api/webhooks/stripe`, which **no longer exists**; the script is dead until removed. If you genuinely need to inspect webhook traffic, point the Stripe CLI at the Convex dev URL: `stripe listen --forward-to https://<dev-deployment>.convex.site/stripe/webhook`.
