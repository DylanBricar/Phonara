import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import { orgApiAction, type ApiResult } from "@convex/apiKeys/functions";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string | null;
};

type MemberSummary = {
  id: string;
  role: string;
  createdAt: number;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type MembersPayload = {
  members: MemberSummary[];
};

type MemberPayload = {
  member: MemberSummary;
};

type OrganizationPayload = {
  organization: OrganizationSummary;
};

export const getOrganization = orgApiAction({
  args: {},
  handler: async (ctx, args): Promise<ApiResult<OrganizationPayload>> => {
    const result: OrganizationPayload = await ctx.runQuery(
      internal.apiKeys.queries.getOrganizationForOrgApi,
      { organizationId: args.organizationId },
    );

    return { ok: true, status: 200, ...result };
  },
});

export const listOrganizationMembers = orgApiAction({
  args: {},
  handler: async (ctx, args): Promise<ApiResult<MembersPayload>> => {
    const result: MembersPayload = await ctx.runQuery(
      internal.apiKeys.queries.listMembersForOrgApi,
      { organizationId: args.organizationId },
    );

    return { ok: true, status: 200, ...result };
  },
});

export const getOrganizationMember = orgApiAction({
  args: { memberId: v.string() },
  handler: async (ctx, args): Promise<ApiResult<MemberPayload>> => {
    const result: MemberPayload | null = await ctx.runQuery(
      internal.apiKeys.queries.getMemberForOrgApi,
      {
        organizationId: args.organizationId,
        memberId: args.memberId,
      },
    );

    if (!result) {
      return { ok: false, status: 404, message: "Member not found" };
    }

    return { ok: true, status: 200, ...result };
  },
});
