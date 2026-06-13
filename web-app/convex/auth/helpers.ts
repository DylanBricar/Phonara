import { components } from "@convex/_generated/api";
import type { QueryCtx } from "@convex/_generated/server";
import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";
import { throwNotFound } from "@convex/utils/errors";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";

export const MAX_LIST_MEMBERS = 100;
export const MAX_LIST_INVITATIONS = 100;
export const MAX_USER_MEMBERSHIPS = 50;

type RunQueryCtx = {
  runQuery: <Query extends FunctionReference<"query", "public" | "internal">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Promise<FunctionReturnType<Query>>;
};

export async function findOrganizationById(
  ctx: RunQueryCtx,
  organizationId: string,
) {
  return (await ctx.runQuery(components.betterAuth.data.getOrganizationById, {
    organizationId,
  })) as AuthDoc<"organization"> | null;
}

export async function requireOrganizationById(
  ctx: RunQueryCtx,
  organizationId: string,
) {
  const organization = await findOrganizationById(ctx, organizationId);
  if (!organization) {
    throwNotFound("Organization not found");
  }
  return organization;
}

export async function getOrganizationMembers(
  ctx: QueryCtx,
  organizationId: string,
) {
  const membersResult = await ctx.runQuery(
    components.betterAuth.data.listMembersByOrganization,
    { organizationId, limit: MAX_LIST_MEMBERS },
  );

  const rawMembers = (membersResult ?? []) as AuthDoc<"member">[];

  if (rawMembers.length === 0) {
    return [];
  }

  const userIds = rawMembers.map((member) => String(member.userId));
  const usersResult = await ctx.runQuery(
    components.betterAuth.data.listUsersByIds,
    { userIds },
  );

  const users = (usersResult ?? []) as AuthDoc<"user">[];
  const userById = new Map(users.map((user) => [String(user._id), user]));

  return rawMembers.map((member) => {
    const user = userById.get(String(member.userId));
    return {
      id: String(member._id),
      role: String(member.role),
      createdAt: Number(member.createdAt),
      user: {
        id: String(member.userId),
        name: String(user?.name ?? "Unknown"),
        email: String(user?.email ?? ""),
        image: user?.image ?? null,
      },
    };
  });
}

export async function getOrganizationInvitations(
  ctx: QueryCtx,
  organizationId: string,
) {
  const invitationsResult = await ctx.runQuery(
    components.betterAuth.data.listInvitationsByOrganization,
    { organizationId, limit: MAX_LIST_INVITATIONS },
  );

  const rawInvitations = (invitationsResult ?? []) as AuthDoc<"invitation">[];

  return rawInvitations.map((invitation) => ({
    id: String(invitation._id),
    email: String(invitation.email),
    role: invitation.role ? String(invitation.role) : null,
    status: String(invitation.status),
    organizationId: String(invitation.organizationId),
    inviterId: String(invitation.inviterId),
    expiresAt: Number(invitation.expiresAt),
    createdAt: Number(invitation.createdAt),
  }));
}
