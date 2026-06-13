import { mutationGeneric, queryGeneric, type IndexRange } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { throwValidationError } from "@convex/utils/errors";

const MAX_AUTH_ROWS = 500;

type ChainedIndexRange = {
  eq: (field: string, value: string) => unknown;
};

const chainEq = (
  range: unknown,
  field: string,
  value: string,
): IndexRange => (range as ChainedIndexRange).eq(field, value) as IndexRange;


const sortByCreatedAt = <T extends { createdAt: number }>(
  rows: T[],
  direction: "asc" | "desc",
) =>
  rows
    .slice()
    .sort((a, b) =>
      direction === "asc"
        ? Number(a.createdAt) - Number(b.createdAt)
        : Number(b.createdAt) - Number(a.createdAt),
    );

const includesSearch = (value: unknown, search: string) =>
  String(value ?? "").toLowerCase().includes(search.toLowerCase());

const boundedLimit = (limit: number) =>
  Math.max(1, Math.min(Math.trunc(limit), MAX_AUTH_ROWS));

export const getOrganizationById = queryGeneric({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("organization", args.organizationId);
    return id ? ctx.db.get(id) : null;
  },
});

export const getOrganizationBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const listOrganizationsByIds = queryGeneric({
  args: { organizationIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.organizationIds.map(async (organizationId) => {
        const id = ctx.db.normalizeId("organization", organizationId);
        return id ? ctx.db.get(id) : null;
      }),
    );

    return rows.flatMap((row) => (row ? [row] : []));
  },
});

export const listOrganizationsForAdmin = queryGeneric({
  args: {
    limit: v.number(),
    sort: v.union(v.literal("asc"), v.literal("desc")),
    search: v.optional(v.string()),
    includeIds: v.optional(v.array(v.string())),
    excludeIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const rows = await ctx.db
      .query("organization")
      .withIndex("createdAt")
      .order(args.sort)
      .take(limit);

    const search = args.search?.trim();
    const includeIds = args.includeIds ? new Set(args.includeIds) : null;
    const excludeIds = args.excludeIds ? new Set(args.excludeIds) : null;

    return rows.filter((row) => {
      if (includeIds && !includeIds.has(row._id)) return false;
      if (excludeIds?.has(row._id)) return false;
      if (!search) return true;
      return includesSearch(row.name, search) || includesSearch(row.slug, search);
    });
  },
});

export const patchOrganization = mutationGeneric({
  args: {
    organizationId: v.string(),
    update: v.object({
      name: v.optional(v.string()),
      slug: v.optional(v.union(v.string(), v.null())),
      logo: v.optional(v.union(v.string(), v.null())),
      stripeCustomerId: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("organization", args.organizationId);
    if (!id) return null;

    const update: Partial<Doc<"organization">> = {};
    if (args.update.name !== undefined) update.name = args.update.name;
    if (args.update.slug !== undefined) update.slug = args.update.slug;
    if (args.update.logo !== undefined) update.logo = args.update.logo;
    if (args.update.stripeCustomerId !== undefined) {
      update.stripeCustomerId = args.update.stripeCustomerId;
    }

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(id, update);
    }

    return ctx.db.get(id);
  },
});

export const getUserById = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("user", args.userId);
    return id ? ctx.db.get(id) : null;
  },
});

export const getUserByEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const listUsersByIds = queryGeneric({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.userIds.map(async (userId) => {
        const id = ctx.db.normalizeId("user", userId);
        return id ? ctx.db.get(id) : null;
      }),
    );

    return rows.flatMap((row) => (row ? [row] : []));
  },
});

export const listUsersForAdmin = queryGeneric({
  args: {
    limit: v.number(),
    sort: v.union(v.literal("asc"), v.literal("desc")),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"))),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const rows = await ctx.db
      .query("user")
      .withIndex("createdAt")
      .order(args.sort)
      .take(limit);

    const search = args.search?.trim();
    const users = rows.filter((row) => {
      if (args.role && row.role !== args.role) return false;
      if (args.status === "banned" && row.banned !== true) return false;
      if (args.status === "active" && row.banned === true) return false;
      if (!search) return true;
      return includesSearch(row.email, search) || includesSearch(row.name, search);
    });

    return sortByCreatedAt(users, args.sort);
  },
});

export const getSessionById = queryGeneric({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("session", args.sessionId);
    return id ? ctx.db.get(id) : null;
  },
});

export const listSessionsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("session")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const listAccountsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("account")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const getMemberById = queryGeneric({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    return id ? ctx.db.get(id) : null;
  },
});

export const patchMemberRoleForAdmin = mutationGeneric({
  args: {
    memberId: v.string(),
    organizationId: v.string(),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    if (!id) return null;

    const member = await ctx.db.get(id);
    if (member?.organizationId !== args.organizationId) return null;

    await ctx.db.patch(id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return ctx.db.get(id);
  },
});

export const deleteMemberForAdmin = mutationGeneric({
  args: {
    memberId: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    if (!id) return null;

    const member = await ctx.db.get(id);
    if (member?.organizationId !== args.organizationId) return null;

    await ctx.db.delete(id);
    return member;
  },
});

export const getMemberByOrganizationAndUser = queryGeneric({
  args: { organizationId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        chainEq(
          q.eq("organizationId", args.organizationId),
          "userId",
          args.userId,
        ),
      )
      .unique();
  },
});

export const listMembersByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(boundedLimit(args.limit));
  },
});

export const listMembersByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const getInvitationById = queryGeneric({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("invitation", args.invitationId);
    return id ? ctx.db.get(id) : null;
  },
});

export const listInvitationsByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(boundedLimit(args.limit));
  },
});

export const createInvitationForAdmin = mutationGeneric({
  args: {
    organizationId: v.string(),
    email: v.string(),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
    inviterId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId(
      "organization",
      args.organizationId,
    );
    if (!organizationId) return null;

    const existingUser = await ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMember = await ctx.db
        .query("member")
        .withIndex("organizationId_userId", (q) =>
          chainEq(
            q.eq("organizationId", organizationId),
            "userId",
            existingUser._id,
          ),
        )
        .unique();

      if (existingMember) {
        throwValidationError("User is already a member of this organization");
      }
    }

    const pendingInvitations = await ctx.db
      .query("invitation")
      .withIndex("email_organizationId_status", (q) =>
        chainEq(
          chainEq(q.eq("email", args.email), "organizationId", organizationId),
          "status",
          "pending",
        ),
      )
      .take(10);

    if (
      pendingInvitations.some(
        (invitation) => Number(invitation.expiresAt) > args.createdAt,
      )
    ) {
      throwValidationError("User already has a pending invitation");
    }

    const id = await ctx.db.insert("invitation", {
      organizationId,
      email: args.email,
      role: args.role,
      status: "pending",
      expiresAt: args.expiresAt,
      inviterId: args.inviterId,
      createdAt: args.createdAt,
      teamId: null,
    });

    const invitation = await ctx.db.get(id);
    return invitation
      ? {
          id: String(invitation._id),
          email: invitation.email,
          role: invitation.role ?? null,
          status: invitation.status,
          organizationId: invitation.organizationId,
          expiresAt: invitation.expiresAt,
          inviterId: invitation.inviterId,
          createdAt: invitation.createdAt,
        }
      : null;
  },
});

export const hasPendingInvitationForEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitation")
      .withIndex("email_status", (q) =>
        chainEq(q.eq("email", args.email), "status", "pending"),
      )
      .first();

    return invitation !== null;
  },
});

export const listApiKeysByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("apikey")
      .withIndex("referenceId_createdAt", (q) =>
        q.eq("referenceId", args.organizationId),
      )
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const getApiKeyForOrganization = queryGeneric({
  args: { keyId: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("apikey", args.keyId);
    if (!id) return null;

    const apiKey = await ctx.db.get(id);
    if (apiKey?.referenceId !== args.organizationId) return null;
    return apiKey;
  },
});

export const createApiKey = mutationGeneric({
  args: {
    data: v.object({
      configId: v.string(),
      name: v.optional(v.union(v.null(), v.string())),
      start: v.optional(v.union(v.null(), v.string())),
      referenceId: v.string(),
      prefix: v.optional(v.union(v.null(), v.string())),
      key: v.string(),
      refillInterval: v.optional(v.union(v.null(), v.number())),
      refillAmount: v.optional(v.union(v.null(), v.number())),
      lastRefillAt: v.optional(v.union(v.null(), v.number())),
      enabled: v.boolean(),
      rateLimitEnabled: v.boolean(),
      rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
      rateLimitMax: v.optional(v.union(v.null(), v.number())),
      requestCount: v.number(),
      remaining: v.optional(v.union(v.null(), v.number())),
      lastRequest: v.optional(v.union(v.null(), v.number())),
      expiresAt: v.optional(v.union(v.null(), v.number())),
      createdAt: v.number(),
      updatedAt: v.number(),
      permissions: v.optional(v.union(v.null(), v.string())),
      metadata: v.optional(v.union(v.null(), v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("apikey", args.data);
    return ctx.db.get(id);
  },
});

export const deleteApiKeyForOrganization = mutationGeneric({
  args: { keyId: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("apikey", args.keyId);
    if (!id) return false;

    const apiKey = await ctx.db.get(id);
    if (apiKey?.referenceId !== args.organizationId) return false;

    await ctx.db.delete(id);
    return true;
  },
});
