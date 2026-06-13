import { v } from "convex/values";
import { internalQuery } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import { isActiveSubscriptionStatus } from "@convex/billing/plans";

export const getByOrganization = orgQuery({
  args: {},
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
  },
});

export const getActiveByOrganization = orgQuery({
  args: {},
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(10);

    return (
      subscriptions.find((subscription) =>
        isActiveSubscriptionStatus(subscription.status),
      ) ?? null
    );
  },
});

export const getByOrganizationInternal = internalQuery({
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
