import { v } from "convex/values";
import { adminMutation, adminQuery } from "@convex/auth/functions";

const overrideLimitsValidator = v.optional(
  v.union(
    v.null(),
    v.object({
      projects: v.optional(v.number()),
      storage: v.optional(v.number()),
      members: v.optional(v.number()),
    }),
  ),
);

const discountValidator = v.optional(
  v.union(
    v.null(),
    v.object({
      mode: v.union(
        v.literal("admin_free"),
        v.literal("custom"),
        v.literal("stripe"),
      ),
      couponId: v.optional(v.string()),
      couponName: v.optional(v.string()),
      percentOff: v.optional(v.number()),
      amountOff: v.optional(v.number()),
      currency: v.optional(v.string()),
      duration: v.optional(v.string()),
    }),
  ),
);

export const getByOrganization = adminQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
  },
});

export const getByStripeId = adminQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();
  },
});

export const upsert = adminMutation({
  args: {
    organizationId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    seats: v.optional(v.number()),
    discount: discountValidator,
    overrideLimits: overrideLimitsValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const patchById = adminMutation({
  args: {
    id: v.id("subscriptions"),
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    seats: v.optional(v.number()),
    discount: discountValidator,
    overrideLimits: overrideLimitsValidator,
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});
