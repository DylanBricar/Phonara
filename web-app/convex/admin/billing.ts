"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { api, components } from "@convex/_generated/api";
import { adminAction } from "@convex/auth/functions";
import {
  FREE_PLAN_NAME,
  getPaidBillingPlan,
  getPlanStripePriceId,
} from "@convex/billing/plans";
import {
  throwConfigurationError,
  throwNotFound,
  throwValidationError,
} from "@convex/utils/errors";

let _stripe: Stripe | undefined;
const getStripe = () => {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
};

const getPlanAndPriceId = (
  planName: string,
  isYearly?: boolean,
  options?: { allowMissingPrice?: boolean },
) => {
  const plan = getPaidBillingPlan(planName);
  if (!plan) {
    throwValidationError("Invalid plan");
  }

  const priceId = getPlanStripePriceId(plan, isYearly);
  if (!priceId) {
    if (options?.allowMissingPrice) {
      return { plan, priceId: null };
    }

    throwConfigurationError(
      "Plan does not have a price ID for the selected billing frequency",
    );
  }
  return { plan, priceId };
};

const ADMIN_FREE_COUPON_ID = "nowstack_admin_100_off";

type AdminDiscountMode = "admin_free" | "custom";

type SubscriptionDiscountInfo = {
  mode: AdminDiscountMode;
  couponId?: string;
  couponName?: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: string;
};

const discountModeValidator = v.optional(
  v.union(v.literal("admin_free"), v.literal("custom")),
);

const ensureAdminFreeCoupon = async (stripe: Stripe) => {
  try {
    const coupon = await stripe.coupons.retrieve(ADMIN_FREE_COUPON_ID);
    if (coupon.percent_off === 100 && coupon.duration === "forever") {
      return coupon.id;
    }

    throwValidationError(
      "Admin free coupon already exists with different settings",
    );
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      const coupon = await stripe.coupons.create({
        id: ADMIN_FREE_COUPON_ID,
        name: "Admin free access (100% off)",
        percent_off: 100,
        duration: "forever",
        metadata: {
          managedBy: "nowstack-admin",
          purpose: "admin-free-subscription",
        },
      });

      return coupon.id;
    }

    throw error;
  }
};

const toDiscountInfo = (
  mode: AdminDiscountMode,
  coupon: Stripe.Coupon,
): SubscriptionDiscountInfo => ({
  mode,
  couponId: coupon.id,
  ...(coupon.name ? { couponName: coupon.name } : {}),
  ...(coupon.percent_off !== null ? { percentOff: coupon.percent_off } : {}),
  ...(coupon.amount_off !== null ? { amountOff: coupon.amount_off } : {}),
  ...(coupon.currency ? { currency: coupon.currency } : {}),
  duration: coupon.duration,
});

const resolveDiscount = async (
  stripe: Stripe,
  args: {
    discountMode?: AdminDiscountMode;
    couponCode?: string;
  },
): Promise<
  | {
      discounts: Stripe.SubscriptionCreateParams.Discount[];
      discount: SubscriptionDiscountInfo;
    }
  | undefined
> => {
  if (args.discountMode === "admin_free") {
    const couponId = await ensureAdminFreeCoupon(stripe);
    const coupon = await stripe.coupons.retrieve(couponId);
    return {
      discounts: [{ coupon: coupon.id }],
      discount: toDiscountInfo("admin_free", coupon),
    };
  }

  const couponCode = args.couponCode?.trim();
  if (couponCode) {
    const coupon = await stripe.coupons.retrieve(couponCode);
    return {
      discounts: [{ coupon: coupon.id }],
      discount: toDiscountInfo("custom", coupon),
    };
  }

  return undefined;
};

const getLocalBillingPeriod = (isYearly?: boolean) => {
  const start = Date.now();
  const end = new Date(start);
  if (isYearly) {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return {
    periodStart: start,
    periodEnd: end.getTime(),
  };
};

export const updateSubscriptionPlan = adminAction({
  args: {
    organizationId: v.string(),
    planName: v.string(),
    isYearly: v.optional(v.boolean()),
    discountMode: discountModeValidator,
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );

    if (!subscription) {
      if (args.planName === FREE_PLAN_NAME) return;
      throwNotFound("No subscription found");
    }

    if (args.planName === FREE_PLAN_NAME) {
      if (subscription.stripeSubscriptionId) {
        await getStripe().subscriptions.cancel(
          subscription.stripeSubscriptionId,
        );
      }

      await ctx.runMutation(api.admin.subscriptions.patchById, {
        id: subscription._id,
        plan: "free",
        status: "canceled",
        stripeSubscriptionId: undefined,
        discount: null,
      });
      return;
    }

    const isAdminFreeDiscount = args.discountMode === "admin_free";
    const { priceId } = getPlanAndPriceId(args.planName, args.isYearly, {
      allowMissingPrice: isAdminFreeDiscount,
    });
    const stripe = getStripe();
    const discount = await resolveDiscount(stripe, args);

    if (!priceId || !subscription.stripeSubscriptionId) {
      if (!isAdminFreeDiscount) {
        throwNotFound("No Stripe subscription found");
      }

      await ctx.runMutation(api.admin.subscriptions.patchById, {
        id: subscription._id,
        plan: args.planName,
        status: "active",
        stripeSubscriptionId: undefined,
        cancelAtPeriodEnd: false,
        discount: discount?.discount,
        ...getLocalBillingPeriod(args.isYearly),
      });
      return;
    }

    if (!subscription.stripeSubscriptionId) {
      throwNotFound("No Stripe subscription found");
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: "always_invoice",
      ...(discount ? { discounts: discount.discounts } : {}),
    });

    await ctx.runMutation(api.admin.subscriptions.patchById, {
      id: subscription._id,
      plan: args.planName,
      ...(discount ? { discount: discount.discount } : {}),
    });
  },
});

export const cancelSubscription = adminAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );

    if (!subscription?.stripeSubscriptionId) {
      throwNotFound("No active subscription found");
    }

    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await ctx.runMutation(api.admin.subscriptions.patchById, {
      id: subscription._id,
      cancelAtPeriodEnd: true,
    });
  },
});

export const reactivateSubscription = adminAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );

    if (!subscription?.stripeSubscriptionId) {
      throwNotFound("No subscription found");
    }

    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await ctx.runMutation(api.admin.subscriptions.patchById, {
      id: subscription._id,
      cancelAtPeriodEnd: false,
    });
  },
});

export const createSubscription = adminAction({
  args: {
    organizationId: v.string(),
    planName: v.string(),
    isYearly: v.optional(v.boolean()),
    discountMode: discountModeValidator,
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.planName === FREE_PLAN_NAME) {
      throwValidationError("Invalid plan for subscription creation");
    }
    const isAdminFreeDiscount = args.discountMode === "admin_free";
    const { plan, priceId } = getPlanAndPriceId(args.planName, args.isYearly, {
      allowMissingPrice: isAdminFreeDiscount,
    });
    const stripe = getStripe();
    const discount = await resolveDiscount(stripe, args);

    const organization = await ctx.runQuery(
      api.admin.queries.getOrganizationById,
      {
        organizationId: args.organizationId,
      },
    );
    if (!organization) throwNotFound("Organization not found");

    const existingSubscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );
    if (existingSubscription) {
      throwValidationError("Organization already has a subscription");
    }

    let stripeCustomerId = organization.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: organization.members[0]?.user.email,
        name: organization.name,
        metadata: { organizationId: args.organizationId },
      });
      stripeCustomerId = customer.id;
      await ctx.runMutation(components.betterAuth.data.patchOrganization, {
        organizationId: args.organizationId,
        update: { stripeCustomerId },
      });
    }

    if (!priceId) {
      await ctx.runMutation(api.admin.subscriptions.upsert, {
        organizationId: args.organizationId,
        plan: args.planName,
        stripeCustomerId,
        status: "active",
        cancelAtPeriodEnd: false,
        discount: discount?.discount,
        ...getLocalBillingPeriod(args.isYearly),
      });
      return;
    }

    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      trial_period_days: discount ? undefined : plan.trialDays,
      metadata: { organizationId: args.organizationId, plan: args.planName },
      ...(discount ? { discounts: discount.discounts } : {}),
    });

    await ctx.runMutation(api.admin.subscriptions.upsert, {
      organizationId: args.organizationId,
      plan: args.planName,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      periodStart: stripeSubscription.items.data[0].current_period_start * 1000,
      periodEnd: stripeSubscription.items.data[0].current_period_end * 1000,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      ...(discount ? { discount: discount.discount } : {}),
    });
  },
});

export const createStripeCustomer = adminAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.runQuery(
      api.admin.queries.getOrganizationById,
      {
        organizationId: args.organizationId,
      },
    );
    if (!organization) throwNotFound("Organization not found");

    const subscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );

    if (organization.stripeCustomerId) {
      const existingCustomer = await getStripe()
        .customers.retrieve(organization.stripeCustomerId)
        .catch(() => null);

      if (existingCustomer && !existingCustomer.deleted) {
        throwValidationError(
          "Organization already has a valid Stripe customer",
        );
      }

      if (
        subscription?.stripeSubscriptionId &&
        subscription.status !== "canceled"
      ) {
        throwValidationError(
          "Cannot replace customer with active subscription. Cancel subscription first.",
        );
      }
    }

    const customer = await getStripe().customers.create({
      email: organization.members[0]?.user.email,
      name: organization.name,
      metadata: { organizationId: organization.id },
    });

    await ctx.runMutation(components.betterAuth.data.patchOrganization, {
      organizationId: organization.id,
      update: { stripeCustomerId: customer.id },
    });

    if (subscription) {
      await ctx.runMutation(api.admin.subscriptions.patchById, {
        id: subscription._id,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: undefined,
      });
    }

    return { customerId: customer.id };
  },
});

export const updateOverrideLimits = adminAction({
  args: {
    organizationId: v.string(),
    overrideLimits: v.optional(
      v.object({
        projects: v.optional(v.number()),
        storage: v.optional(v.number()),
        members: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      api.admin.subscriptions.getByOrganization,
      { organizationId: args.organizationId },
    );

    if (!subscription) throwNotFound("No subscription found");

    await ctx.runMutation(api.admin.subscriptions.patchById, {
      id: subscription._id,
      overrideLimits: args.overrideLimits
        ? JSON.parse(JSON.stringify(args.overrideLimits))
        : null,
    });
  },
});
