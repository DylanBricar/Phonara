"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { components, internal } from "@convex/_generated/api";
import { internalAction, type ActionCtx } from "@convex/_generated/server";
import { orgAction } from "@convex/auth/functions";
import { requireOrganizationById } from "@convex/auth/helpers";
import {
  getPaidBillingPlan,
  getPlanStripePriceId,
} from "@convex/billing/plans";
import {
  throwConfigurationError,
  throwNotFound,
  throwValidationError,
} from "@convex/utils/errors";

let _stripe: Stripe | undefined;
const getStripe = (): Stripe => {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
};

const getSiteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

const getOrganizationRow = async (ctx: ActionCtx, organizationId: string) => {
  const organization = await ctx.runQuery(
    components.betterAuth.data.getOrganizationById,
    { organizationId },
  );

  if (!organization) {
    throwNotFound("Organization not found");
  }

  return organization;
};

type SubscriptionDiscountInfo = {
  mode: "stripe";
  couponId?: string;
  couponName?: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: string;
};

const getSubscriptionDiscount = (
  subscription: Stripe.Subscription,
): SubscriptionDiscountInfo | null => {
  const discount = subscription.discounts[0];
  if (!discount || typeof discount === "string") return null;

  const coupon = discount.source.coupon;
  if (!coupon || typeof coupon === "string") return null;

  return {
    mode: "stripe",
    couponId: coupon.id,
    ...(coupon.name ? { couponName: coupon.name } : {}),
    ...(coupon.percent_off !== null ? { percentOff: coupon.percent_off } : {}),
    ...(coupon.amount_off !== null ? { amountOff: coupon.amount_off } : {}),
    ...(coupon.currency ? { currency: coupon.currency } : {}),
    duration: coupon.duration,
  };
};

export const createCustomer = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    metadata: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email: args.email,
      name: args.name,
      metadata: args.metadata,
    });

    return customer.id;
  },
});

export const ensureOrganizationCustomer = internalAction({
  args: {
    organizationId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await getOrganizationRow(ctx, args.organizationId);
    const existingCustomerId =
      (organization.stripeCustomerId as string | null) ?? null;
    if (existingCustomerId) {
      return { customerId: existingCustomerId, created: false };
    }

    const customer = await getStripe().customers.create({
      email: args.email,
      name: args.name ?? String(organization.name ?? ""),
      metadata: { organizationId: args.organizationId },
    });

    await ctx.runMutation(components.betterAuth.data.patchOrganization, {
      organizationId: args.organizationId,
      update: { stripeCustomerId: customer.id },
    });

    return { customerId: customer.id, created: true };
  },
});

export const createCheckout = internalAction({
  args: {
    customerId: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    trialDays: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      customer: args.customerId,
      mode: "subscription",
      line_items: [{ price: args.priceId, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      ...(args.trialDays
        ? { subscription_data: { trial_period_days: args.trialDays } }
        : {}),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    });

    return session.url;
  },
});

export const createBillingPortal = internalAction({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });

    return session.url;
  },
});

export const createOrganizationCheckout = orgAction({
  roles: ["owner", "admin"],
  args: {
    plan: v.string(),
    annual: v.optional(v.boolean()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const plan = getPaidBillingPlan(args.plan);
    if (!plan) {
      throwValidationError(`Plan "${args.plan}" not found`);
    }

    const priceId = getPlanStripePriceId(plan, args.annual);
    if (!priceId) {
      throwConfigurationError(`Price ID not found for plan "${args.plan}"`);
    }

    const organization = await requireOrganizationById(
      ctx,
      args.organizationId,
    );
    let customerId = (organization.stripeCustomerId as string | null) ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.orgAuth.session.user.email,
        name: organization.name,
        metadata: { organizationId: args.organizationId },
      });
      customerId = customer.id;
      await ctx.runMutation(components.betterAuth.data.patchOrganization, {
        organizationId: args.organizationId,
        update: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${getSiteUrl()}${args.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}${args.cancelUrl}`,
      metadata: { organizationId: args.organizationId, plan: args.plan },
      subscription_data: {
        metadata: { organizationId: args.organizationId, plan: args.plan },
        trial_period_days: plan.trialDays ?? undefined,
      },
    });

    if (!session.url) {
      throwConfigurationError("Failed to create checkout session");
    }

    return { url: session.url };
  },
});

export const createOrganizationBillingPortal = orgAction({
  roles: ["owner", "admin"],
  args: {
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const organization = await requireOrganizationById(
      ctx,
      args.organizationId,
    );
    const stripeCustomerId =
      (organization.stripeCustomerId as string | null) ?? null;

    if (!stripeCustomerId) {
      throwNotFound("No stripe customer id found");
    }

    const stripeBilling = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getSiteUrl()}${args.returnUrl}`,
    });

    if (!stripeBilling.url) {
      throwConfigurationError("Failed to create stripe billing portal session");
    }

    return { url: stripeBilling.url };
  },
});

export const getSubscription = internalAction({
  args: { subscriptionId: v.string() },
  handler: async (_ctx, args) => {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(args.subscriptionId);
    return {
      id: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: sub.items.data[0]?.current_period_start ?? 0,
      currentPeriodEnd: sub.items.data[0]?.current_period_end ?? 0,
      quantity: sub.items.data[0]?.quantity ?? 1,
      priceId: sub.items.data[0]?.price.id ?? "",
      planMetadata: sub.items.data[0]?.price.metadata ?? {},
    };
  },
});

export const processWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (error) {
      return { ok: false, error: `invalid_signature: ${String(error)}` };
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) return { ok: true };

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["discounts"],
      });
      const organizationId =
        (session.metadata?.organizationId as string | undefined) ??
        (subscription.metadata.organizationId as string | undefined);
      const plan =
        (session.metadata?.plan as string | undefined) ??
        (subscription.metadata.plan as string | undefined) ??
        (subscription.items.data[0]?.price.metadata.plan as string | undefined);
      if (!organizationId || !plan) return { ok: true };
      await ctx.runMutation(
        internal.subscriptions.mutations.upsertFromWebhook,
        {
          organizationId,
          plan,
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          periodStart:
            (subscription.items.data[0]?.current_period_start ?? 0) * 1000,
          periodEnd:
            (subscription.items.data[0]?.current_period_end ?? 0) * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          discount: getSubscriptionDiscount(subscription),
        },
      );
      return { ok: true };
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = await stripe.subscriptions.retrieve(
        event.data.object.id,
        {
          expand: ["discounts"],
        },
      );
      const plan =
        (subscription.metadata.plan as string | undefined) ??
        (subscription.items.data[0]?.price.metadata.plan as string | undefined);
      await ctx.runMutation(
        internal.subscriptions.mutations.updateFromWebhook,
        {
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          plan,
          periodStart:
            (subscription.items.data[0]?.current_period_start ?? 0) * 1000,
          periodEnd:
            (subscription.items.data[0]?.current_period_end ?? 0) * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          discount: getSubscriptionDiscount(subscription),
        },
      );
      return { ok: true };
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await ctx.runMutation(
        internal.subscriptions.mutations.updateFromWebhook,
        {
          stripeSubscriptionId: subscription.id,
          status: "canceled",
        },
      );
      return { ok: true };
    }

    return { ok: true };
  },
});

export const getInvoices = internalAction({
  args: { customerId: v.string(), limit: v.optional(v.number()) },
  handler: async (_ctx, args) => {
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: args.customerId,
      limit: args.limit ?? 50,
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      amount: ((inv.amount_paid as number | null) ?? 0) / 100,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      description: inv.lines.data[0]?.description ?? ("" as string),
    }));
  },
});

export const getOrganizationInvoices = orgAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      internal.subscriptions.queries.getByOrganizationInternal,
      { organizationId: args.organizationId },
    );

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: args.limit ?? 12,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      created: invoice.created,
      status: invoice.status ?? "unknown",
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      invoicePdf: invoice.invoice_pdf ?? null,
    }));
  },
});
