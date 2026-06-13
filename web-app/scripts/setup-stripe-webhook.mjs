#!/usr/bin/env node
// Idempotent Stripe webhook setup.
// - Reads VITE_CONVEX_SITE_URL from .env.local (fallback: .env).
// - Reads STRIPE_SECRET_KEY from .env (fallback: .env.local, Convex env).
// - Ensures Stripe has a webhook endpoint at <convex-site-url>/stripe/webhook
//   subscribed to checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted.
// - Ensures Convex env has STRIPE_WEBHOOK_SECRET. Stripe only returns the
//   signing secret at creation time, so if the endpoint exists but the secret
//   is missing from Convex env, the endpoint is deleted and recreated.
//
// Exit codes:
//   0 - success or no-op (also when STRIPE_SECRET_KEY is missing)
//   1 - hard failure
//
// Flags:
//   --quiet  Only log on changes / errors.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUIET = process.argv.includes("--quiet");

const log = (...a) => {
  if (!QUIET) console.log("[stripe-webhook]", ...a);
};
const summary = (...a) => console.log("[stripe-webhook]", ...a);
const warn = (...a) => console.warn("[stripe-webhook]", ...a);
const fail = (msg) => {
  console.error("[stripe-webhook] ERROR:", msg);
  process.exit(1);
};

function parseDotEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  const text = readFileSync(file, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    val = val.replace(/\s+#.*$/, "").trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function convexEnvGet(key) {
  try {
    const out = execFileSync("npx", ["convex", "env", "get", key], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function convexEnvSet(key, value) {
  execFileSync("npx", ["convex", "env", "set", key, value], {
    cwd: ROOT,
    stdio: QUIET ? ["ignore", "ignore", "pipe"] : "inherit",
  });
}

const dotenv = parseDotEnv(path.join(ROOT, ".env"));
const dotenvLocal = parseDotEnv(path.join(ROOT, ".env.local"));
const merged = { ...dotenv, ...dotenvLocal };

const stripeSecret =
  merged.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET_KEY ||
  convexEnvGet("STRIPE_SECRET_KEY");

if (!stripeSecret) {
  summary("STRIPE_SECRET_KEY not set, skipping webhook setup");
  process.exit(0);
}

const convexSiteUrl =
  merged.VITE_CONVEX_SITE_URL || process.env.VITE_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  warn(
    "VITE_CONVEX_SITE_URL not found in .env / .env.local; run `pnpm convex:dev` once to populate it",
  );
  process.exit(0);
}

const webhookUrl = `${convexSiteUrl.replace(/\/+$/, "")}/stripe/webhook`;
const enabledEvents = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

let Stripe;
try {
  ({ default: Stripe } = await import("stripe"));
} catch (err) {
  fail(`failed to load stripe sdk: ${err.message}`);
}

const stripe = new Stripe(stripeSecret);

let existing;
try {
  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  existing = list.data.find((w) => w.url === webhookUrl) ?? null;
} catch (err) {
  fail(`stripe API call failed (check STRIPE_SECRET_KEY): ${err.message}`);
}

const convexHasSecret = Boolean(convexEnvGet("STRIPE_WEBHOOK_SECRET"));

async function createAndStore() {
  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: enabledEvents,
    description: "NowStack (Convex) — auto-managed by start-all",
  });
  convexEnvSet("STRIPE_WEBHOOK_SECRET", created.secret);
  summary(`created Stripe webhook ${created.id} -> ${webhookUrl}`);
  summary("wrote STRIPE_WEBHOOK_SECRET to Convex env");
}

if (!existing) {
  summary(`no Stripe webhook for ${webhookUrl}; creating...`);
  await createAndStore();
  process.exit(0);
}

if (!convexHasSecret) {
  warn(
    `Stripe webhook ${existing.id} exists but Convex env STRIPE_WEBHOOK_SECRET is missing.`,
  );
  warn(
    "Stripe does not return the signing secret on read; deleting + recreating to obtain a fresh secret.",
  );
  try {
    await stripe.webhookEndpoints.del(existing.id);
  } catch (err) {
    fail(`failed to delete existing webhook ${existing.id}: ${err.message}`);
  }
  await createAndStore();
  process.exit(0);
}

const sameEvents =
  existing.enabled_events.length === enabledEvents.length &&
  enabledEvents.every((e) => existing.enabled_events.includes(e));

if (!sameEvents) {
  summary(`updating event list on webhook ${existing.id}`);
  await stripe.webhookEndpoints.update(existing.id, {
    enabled_events: enabledEvents,
  });
}

summary(`Stripe webhook OK -> ${webhookUrl} (${existing.id})`);
