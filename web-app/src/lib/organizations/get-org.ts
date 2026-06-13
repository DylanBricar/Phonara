import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import type { AuthPermission, AuthRole } from "../auth/auth-permissions";
import { getPlanLimits } from "../auth/stripe/auth-plans";
import { getSession } from "../auth/auth-user";
import { logger } from "../logger";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { getOrgActiveSubscription } from "./get-org-subscription";
import { isInRoles } from "./is-in-roles";

const getOrgSlugFromRequest = (): string | null => {
  const request = getRequest();

  // Try header first (for API routes that set it)
  const headerSlug = request.headers.get("x-org-slug");
  if (headerSlug) return headerSlug;

  // Extract from URL path: /orgs/{slug}/...
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/orgs\/([^/]+)/);
  return match ? match[1] : null;
};

type OrgParams = {
  roles?: AuthRole[];
  permissions?: AuthPermission;
  slug?: string;
};

type OrgData = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  stripeCustomerId: string | null;
  members: {
    createdAt: number;
    id: string;
    role: string;
    updatedAt: number;
    userId: string;
    user: {
      email: string;
      name: string;
      id: string;
      image: string | null;
    };
  }[];
  invitations: {
    id: string;
    email: string;
    role: string | null;
    status: string;
    organizationId: string;
    expiresAt: number;
    inviterId: string;
    createdAt: number;
  }[];
};

const getOrg = async (explicitSlug?: string): Promise<OrgData | null> => {
  const user = await getSession();

  if (!user) {
    return null;
  }

  const orgSlug = explicitSlug ?? getOrgSlugFromRequest();

  if (!orgSlug) {
    logger.warn("No organization slug found in headers");
    return null;
  }

  try {
    const authOrg = await fetchAuthQuery(api.auth.queries.getFullOrganization, {
      organizationSlug: orgSlug,
    });

    if (!authOrg) {
      logger.warn(`Organization not found for slug: ${orgSlug}`);
      return null;
    }

    return {
      id: authOrg.id,
      name: authOrg.name,
      slug: authOrg.slug,
      logo: authOrg.logo ?? null,
      metadata:
        (authOrg.metadata as Record<
          string,
          string | number | boolean | null
        > | null) ?? null,
      createdAt: new Date(authOrg.createdAt).getTime(),
      stripeCustomerId: authOrg.stripeCustomerId ?? null,
      members: authOrg.members.map((m) => {
        const memberUpdatedAt = (m as { updatedAt?: Date | number | string })
          .updatedAt;
        return {
          createdAt: new Date(m.createdAt).getTime(),
          id: m.id,
          role: m.role,
          updatedAt: new Date(memberUpdatedAt ?? m.createdAt).getTime(),
          userId: m.userId,
          user: {
            email: m.user.email,
            name: m.user.name,
            id: m.user.id,
            image: m.user.image ?? null,
          },
        };
      }),
      invitations: authOrg.invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: (inv.role as string | null) ?? null,
        status: inv.status,
        organizationId: inv.organizationId,
        expiresAt: new Date(inv.expiresAt).getTime(),
        inviterId: inv.inviterId,
        createdAt: new Date(inv.createdAt).getTime(),
      })),
    };
  } catch (err) {
    logger.error("Error fetching organization", err);
    return null;
  }
};

export const getCurrentOrg = async (params?: OrgParams) => {
  const user = await getSession();

  if (!user) {
    return null;
  }

  const org = await getOrg(params?.slug);

  if (!org) {
    return null;
  }

  const memberRoles = org.members
    .filter((member) => member.userId === user.user.id)
    .map((member) => member.role as AuthRole);

  if (memberRoles.length === 0 || !isInRoles(memberRoles, params?.roles)) {
    return null;
  }

  if (params?.permissions) {
    const hasPermissionResult = await fetchAuthQuery(
      api.auth.queries.hasPermission,
      {
        permission: params.permissions,
        organizationId: org.id,
      },
    );

    if (!hasPermissionResult.success) {
      return null;
    }
  }

  const [currentSubscription, owner] = await Promise.all([
    getOrgActiveSubscription(org.id),
    Promise.resolve(org.members.find((member) => member.role === "owner")),
  ]);

  const limits = currentSubscription?.limits ?? getPlanLimits();

  return {
    ...org,
    slug: org.slug ?? "",
    user: user.user,
    email: (owner?.user.email ?? null) as string | null,
    memberRoles,
    subscription: currentSubscription ?? null,
    limits,
  };
};

export type CurrentOrgPayload = NonNullable<
  Awaited<ReturnType<typeof getCurrentOrg>>
>;

export const getRequiredCurrentOrg = async (params?: OrgParams) => {
  const result = await getCurrentOrg(params);

  if (!result) {
    throw redirect({ to: "/auth/signin" });
  }

  return result;
};
