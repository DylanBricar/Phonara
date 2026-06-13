import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  audioFiles: defineTable({
    userId: v.string(),
    publicId: v.string(),
    title: v.optional(v.string()),
    originalFileName: v.string(),
    mimeType: v.string(),
    durationMs: v.optional(v.number()),
    storageId: v.id("_storage"),
    transcriptText: v.string(),
    transcriptSegments: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
        text: v.string(),
      }),
    ),
    visibility: v.union(
      v.literal("private"),
      v.literal("unlisted"),
      v.literal("public"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_storage", ["storageId"]),

  deviceLoginSessions: defineTable({
    code: v.string(),
    userId: v.string(),
    deviceId: v.optional(v.string()),
    redirectUri: v.optional(v.string()),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_user", ["userId"]),

  desktopDevices: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    lastSeenAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_device", ["deviceId"]),

  desktopTokens: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"])
    .index("by_device", ["deviceId"]),

  subscriptions: defineTable({
    organizationId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    seats: v.optional(v.number()),
    discount: v.optional(
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
    ),
    overrideLimits: v.optional(
      v.union(
        v.null(),
        v.object({
          projects: v.optional(v.number()),
          storage: v.optional(v.number()),
          members: v.optional(v.number()),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_stripe_id", ["stripeSubscriptionId"])
    .index("by_status", ["status"])
    .index("by_plan", ["plan"])
    .index("by_status_and_plan", ["status", "plan"]),

  feedbacks: defineTable({
    review: v.number(),
    message: v.string(),
    email: v.optional(v.string()),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"])
    .searchIndex("by_message", { searchField: "message" }),
});
