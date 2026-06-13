import { v } from "convex/values";
import { components } from "@convex/_generated/api";
import { query } from "@convex/_generated/server";
import {
  findOrganizationById,
  MAX_USER_MEMBERSHIPS,
  getOrganizationMembers,
} from "@convex/auth/helpers";
import { isActiveSubscriptionStatus } from "@convex/billing/plans";
import {
  authComponent,
  createAuth,
  getSocialProviders,
  requireAuth,
} from "./config";
import { orgQuery } from "./functions";

function hasRequiredRoles(memberRoles: string[], requiredRoles?: string[]) {
  if (!requiredRoles?.length) {
    return true;
  }

  if (memberRoles.includes("owner")) {
    return true;
  }

  return requiredRoles.every((role) => memberRoles.includes(role));
}

export const getCurrentOrganization = orgQuery({
  args: {
    organizationSlug: v.string(),
    permission: v.optional(v.record(v.string(), v.array(v.string()))),
    roles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return null;
    }

    const organization = await auth.api.getFullOrganization({
      headers,
      query: { organizationSlug: args.organizationSlug },
    });

    if (!organization) {
      return null;
    }

    const memberRoles = organization.members
      .filter((member) => member.userId === session.user.id)
      .map((member) => member.role);

    if (!hasRequiredRoles(memberRoles, args.roles)) {
      return null;
    }

    if (args.permission) {
      const permissionResult = await auth.api.hasPermission({
        headers,
        body: {
          permissions: args.permission,
          organizationId: organization.id,
        },
      } as unknown as Parameters<typeof auth.api.hasPermission>[0]);

      if (!permissionResult.success) {
        return null;
      }
    }

    const [canInviteMemberResult, subscriptions] = await Promise.all([
      auth.api.hasPermission({
        headers,
        body: {
          permissions: { member: ["create"] },
          organizationId: organization.id,
        },
      } as unknown as Parameters<typeof auth.api.hasPermission>[0]),
      ctx.db
        .query("subscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization.id),
        )
        .take(10),
    ]);

    const activeSubscription =
      subscriptions.find((subscription) =>
        isActiveSubscriptionStatus(subscription.status),
      ) ?? null;

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo ?? null,
      createdAt: Number(new Date(organization.createdAt).getTime()),
      memberRoles,
      canInviteMember: canInviteMemberResult.success,
      members: organization.members.map((member) => ({
        id: member.id,
        role: member.role,
        userId: member.userId,
        createdAt: Number(new Date(member.createdAt).getTime()),
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image ?? null,
        },
      })),
      invitations: organization.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        organizationId: invitation.organizationId,
        expiresAt: Number(new Date(invitation.expiresAt).getTime()),
        inviterId: invitation.inviterId,
        createdAt: Number(new Date(invitation.createdAt).getTime()),
      })),
      subscription: activeSubscription
        ? {
            id: activeSubscription._id,
            referenceId: organization.id,
            organizationId: organization.id,
            plan: activeSubscription.plan,
            status: activeSubscription.status ?? null,
            periodStart: activeSubscription.periodStart ?? null,
            periodEnd: activeSubscription.periodEnd ?? null,
            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd ?? null,
            seats: activeSubscription.seats ?? null,
            stripeSubscriptionId:
              activeSubscription.stripeSubscriptionId ?? null,
            stripeCustomerId: activeSubscription.stripeCustomerId ?? null,
            discount: activeSubscription.discount ?? null,
            overrideLimits: activeSubscription.overrideLimits ?? null,
            createdAt: activeSubscription.createdAt,
            updatedAt: activeSubscription.updatedAt,
          }
        : null,
    };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

export const getAvailableSocialProviders = query({
  args: {},
  handler: async () => {
    const providers = getSocialProviders();
    return Object.keys(providers ?? {});
  },
});

export const getSession = query({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.getSession({ headers });
  },
});

export const getInvitationDetails = query({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx
      .runQuery(components.betterAuth.data.getInvitationById, {
        invitationId: args.invitationId,
      })
      .catch(() => null);
    if (!invitation) return null;

    const organization = await findOrganizationById(
      ctx,
      String(invitation.organizationId),
    );

    let inviter: { name: string } | null = null;
    if (invitation.inviterId) {
      const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
        userId: String(invitation.inviterId),
      });
      if (user) {
        inviter = { name: String(user.name ?? "A teammate") };
      }
    }

    return {
      id: String(invitation._id),
      email: String(invitation.email),
      role: (invitation.role as string | null) ?? "member",
      status: String(invitation.status),
      expiresAt: Number(new Date(invitation.expiresAt).getTime()),
      organization: organization
        ? {
            id: String(organization._id),
            name: String(organization.name),
            slug: (organization.slug as string | null) ?? null,
            logo: (organization.logo as string | null) ?? null,
          }
        : null,
      inviter,
    };
  },
});

export const getFullOrganization = orgQuery({
  args: { organizationSlug: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const organization = await auth.api.getFullOrganization({
      headers,
      query: { organizationSlug: args.organizationSlug },
    });

    if (!organization) return null;

    // Better Auth's getFullOrganization does NOT return custom org fields
    // (e.g. `stripeCustomerId`). Read the component row directly with the
    // same id we just resolved by slug.
    const orgRow = await findOrganizationById(ctx, organization.id);

    return {
      ...organization,
      stripeCustomerId: (orgRow?.stripeCustomerId as string | null) ?? null,
    };
  },
});

export const getOrganizationById = orgQuery({
  args: {},
  handler: async (ctx, args) => {
    const org = await findOrganizationById(ctx, args.organizationId);
    if (!org) return null;

    const members = await getOrganizationMembers(ctx, args.organizationId);

    return {
      id: String(org._id),
      name: String(org.name),
      slug: String(org.slug ?? ""),
      logo: (org.logo as string | null) ?? null,
      createdAt: Number(new Date(org.createdAt).getTime()),
      stripeCustomerId: (org.stripeCustomerId as string | null) ?? null,
      members,
    };
  },
});

export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.listOrganizations({ headers });
  },
});

export const listOrganizationsWithRoles = query({
  args: {},
  handler: async (ctx) => {
    const { session } = await requireAuth(ctx);
    const userId = session.user.id;

    const membershipsResult = await ctx.runQuery(
      components.betterAuth.data.listMembersByUser,
      { userId, limit: MAX_USER_MEMBERSHIPS },
    );

    const memberships = (membershipsResult ?? []) as {
      _id: string;
      organizationId: string;
      role: string;
      createdAt?: number | string;
    }[];

    if (memberships.length === 0) {
      return [];
    }

    const organizationIds = memberships.map(
      (membership) => membership.organizationId,
    );
    const orgsResult = await ctx.runQuery(
      components.betterAuth.data.listOrganizationsByIds,
      { organizationIds },
    );

    const orgs = (orgsResult ?? []) as {
      _id: string;
      name?: string;
      slug?: string;
      logo?: string | null;
    }[];
    const orgById = new Map(orgs.map((org) => [String(org._id), org]));

    const result = memberships.flatMap((membership) => {
      const org = orgById.get(membership.organizationId);
      if (!org?.slug) return [];
      return [
        {
          id: String(org._id),
          name: String(org.name ?? "Untitled organization"),
          slug: String(org.slug),
          logo: org.logo ?? null,
          role: membership.role,
          joinedAt: Number(new Date(membership.createdAt ?? 0).getTime()),
        },
      ];
    });

    result.sort((a, b) => b.joinedAt - a.joinedAt);
    return result;
  },
});

export const hasPermission = orgQuery({
  args: {
    permission: v.record(v.string(), v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.hasPermission({
      headers,
      body: {
        permissions: args.permission,
        organizationId: args.organizationId,
      },
    } as unknown as Parameters<typeof auth.api.hasPermission>[0]);
  },
});

export const listUserAccounts = query({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.listUserAccounts({ headers });
  },
});

export const { getAuthUser } = authComponent.clientApi();
