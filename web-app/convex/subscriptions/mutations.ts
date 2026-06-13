import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

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

export const upsertFromWebhook = internalMutation({
  args: {
    organizationId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    discount: discountValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFromWebhook = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.optional(v.string()),
    plan: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    discount: discountValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();
    if (!existing) return null;
    const { stripeSubscriptionId: _ignore, ...updates } = args;
    await ctx.db.patch(existing._id, { ...updates, updatedAt: Date.now() });
    return existing._id;
  },
});
