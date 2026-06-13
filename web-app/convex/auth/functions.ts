import { v } from "convex/values";
import {
  customAction,
  customMutation,
  customQuery,
  type Customization,
} from "convex-helpers/server/customFunctions";
import {
  action,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "@convex/_generated/server";
import { requireAdmin } from "@convex/auth/config";
import type { AuthPermission } from "@convex/auth/permissions";
import {
  requireOrganizationAccess,
  requireOrgPermission,
  requireOrgRole,
  type OrgAuth,
  type OrgRole,
} from "@convex/auth/orgAccess";

type OrgAccess = {
  roles?: readonly OrgRole[];
  permission?: AuthPermission;
  allowPlatformAdmin?: boolean;
};

const orgAccessArgs = {
  organizationId: v.optional(v.string()),
  organizationSlug: v.optional(v.string()),
};

type OrgAccessArgs = typeof orgAccessArgs;
type OrgAccessCtx = { orgAuth: OrgAuth };
type OrgAccessResolvedArgs = {
  organizationId: string;
  organizationSlug?: string;
};

const defaultOrgAccess = {
  allowPlatformAdmin: true,
} satisfies OrgAccess;

const resolveOrgAccess = (
  defaults: OrgAccess,
  override: OrgAccess | undefined,
): OrgAccess => ({
  ...defaults,
  ...override,
  roles: override?.roles ?? defaults.roles,
  permission: override?.permission ?? defaults.permission,
});

async function resolveOrgAccessInput(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  args: {
    organizationId?: string;
    organizationSlug?: string;
  },
  defaults: OrgAccess,
  access?: OrgAccess,
) {
  const resolvedAccess = resolveOrgAccess(defaults, access);
  const orgAuth = await requireOrganizationAccess(
    ctx,
    {
      organizationId: args.organizationId,
      organizationSlug: args.organizationSlug,
    },
    {
      allowPlatformAdmin: resolvedAccess.allowPlatformAdmin,
    },
  );

  if (resolvedAccess.roles) {
    requireOrgRole(orgAuth, resolvedAccess.roles);
  }

  if (resolvedAccess.permission) {
    await requireOrgPermission(
      ctx,
      orgAuth,
      orgAuth.organizationId,
      resolvedAccess.permission,
    );
  }

  const resolvedArgs: OrgAccessResolvedArgs = {
    organizationId: orgAuth.organizationId,
  };
  if (args.organizationSlug) {
    resolvedArgs.organizationSlug = args.organizationSlug;
  }

  return {
    ctx: { orgAuth },
    args: resolvedArgs,
  };
}

export function makeOrgQuery(defaults: OrgAccess = defaultOrgAccess) {
  const customization: Customization<
    QueryCtx,
    OrgAccessArgs,
    OrgAccessCtx,
    OrgAccessResolvedArgs,
    OrgAccess
  > = {
    args: orgAccessArgs,
    input: async (ctx, args, access) =>
      resolveOrgAccessInput(ctx, args, defaults, access),
  };

  return customQuery(query, customization);
}

export function makeOrgMutation(defaults: OrgAccess = defaultOrgAccess) {
  const customization: Customization<
    MutationCtx,
    OrgAccessArgs,
    OrgAccessCtx,
    OrgAccessResolvedArgs,
    OrgAccess
  > = {
    args: orgAccessArgs,
    input: async (ctx, args, access) =>
      resolveOrgAccessInput(ctx, args, defaults, access),
  };

  return customMutation(mutation, customization);
}

export const orgQuery = makeOrgQuery();
export const orgMutation = makeOrgMutation();

export function makeOrgAction(defaults: OrgAccess = defaultOrgAccess) {
  const customization: Customization<
    ActionCtx,
    OrgAccessArgs,
    OrgAccessCtx,
    OrgAccessResolvedArgs,
    OrgAccess
  > = {
    args: orgAccessArgs,
    input: async (ctx, args, access) =>
      resolveOrgAccessInput(ctx, args, defaults, access),
  };

  return customAction(action, customization);
}

export const orgAction = makeOrgAction();

export const adminQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({
    ctx: { adminAuth: await requireAdmin(ctx) },
    args: {},
  }),
});

export const adminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => ({
    ctx: { adminAuth: await requireAdmin(ctx) },
    args: {},
  }),
});

export const adminAction = customAction(action, {
  args: {},
  input: async (ctx) => ({
    ctx: { adminAuth: await requireAdmin(ctx) },
    args: {},
  }),
});
