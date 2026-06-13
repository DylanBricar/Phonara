import { v } from "convex/values";
import {
  requireOrganizationById,
  getOrganizationMembers,
} from "@convex/auth/helpers";
import { orgQuery } from "@convex/auth/functions";
import { components } from "@convex/_generated/api";
import { orgApiQuery } from "@convex/apiKeys/functions";
import { toApiKeyDto } from "@convex/apiKeys/dto/apiKey";

export const getOrganizationForOrgApi = orgApiQuery({
  args: {},
  handler: async (ctx, args) => {
    const organization = await requireOrganizationById(ctx, args.organizationId);

    return {
      organization: {
        id: String(organization._id),
        name: String(organization.name),
        slug: (organization.slug as string | null) ?? null,
      },
    };
  },
});

export const listMembersForOrgApi = orgApiQuery({
  args: {},
  handler: async (ctx, args) => {
    const members = await getOrganizationMembers(ctx, args.organizationId);

    return {
      members,
    };
  },
});

export const getMemberForOrgApi = orgApiQuery({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const members = await getOrganizationMembers(ctx, args.organizationId);
    const member = members.find((entry) => entry.id === args.memberId);

    if (!member) return null;

    return {
      member,
    };
  },
});

export const listForOrganization = orgQuery({
  permission: { apiKey: ["read"] },
  args: {},
  handler: async (ctx, args) => {
    const keys = await ctx.runQuery(
      components.betterAuth.data.listApiKeysByOrganization,
      {
        organizationId: args.organizationId,
        limit: 100,
      },
    );

    return keys.map(toApiKeyDto);
  },
});
