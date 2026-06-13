import { components } from "@convex/_generated/api";
import type { QueryCtx } from "@convex/_generated/server";
import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";
import { MAX_USER_MEMBERSHIPS } from "@convex/auth/helpers";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PAID_PLAN_NAMES,
} from "@convex/billing/plans";
import { toAdminMembershipDto } from "@convex/admin/dto/membership";
import { toAdminUserDto } from "@convex/admin/dto/user";

export const MAX_ADMIN_LIST_USERS = 500;
export const MAX_ADMIN_LIST_ORGANIZATIONS = 500;
export const MAX_ADMIN_LIST_SUBSCRIPTIONS = 500;

export async function findUserById(ctx: QueryCtx, userId: string) {
  const rawUser = (await ctx.runQuery(components.betterAuth.data.getUserById, {
    userId,
  })) as AuthDoc<"user"> | null;

  if (!rawUser) return null;

  return toAdminUserDto(rawUser);
}

export async function loadOrganizationSubscription(
  ctx: QueryCtx,
  organizationId: string,
) {
  return ctx.db
    .query("subscriptions")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();
}

export async function loadPaidSubscriptions(ctx: QueryCtx) {
  const subscriptionGroups = await Promise.all(
    PAID_PLAN_NAMES.flatMap((plan) =>
      ACTIVE_SUBSCRIPTION_STATUSES.map(async (status) =>
        ctx.db
          .query("subscriptions")
          .withIndex("by_status_and_plan", (q) =>
            q.eq("status", status).eq("plan", plan),
          )
          .take(MAX_ADMIN_LIST_SUBSCRIPTIONS),
      ),
    ),
  );

  return subscriptionGroups.flat();
}

export async function loadUserWithMemberships(ctx: QueryCtx, userId: string) {
  const membershipsResult = await ctx.runQuery(
    components.betterAuth.data.listMembersByUser,
    { userId, limit: MAX_USER_MEMBERSHIPS },
  );

  const memberships = (membershipsResult ?? []) as AuthDoc<"member">[];

  if (memberships.length === 0) {
    return [];
  }

  const organizationIds = memberships.map((membership) =>
    String(membership.organizationId),
  );
  const orgsResult = await ctx.runQuery(
    components.betterAuth.data.listOrganizationsByIds,
    { organizationIds },
  );

  const orgs = (orgsResult ?? []) as AuthDoc<"organization">[];
  const orgById = new Map(orgs.map((org) => [String(org._id), org]));

  return memberships.map((membership) => {
    const org = orgById.get(String(membership.organizationId));
    return toAdminMembershipDto(membership, org);
  });
}
