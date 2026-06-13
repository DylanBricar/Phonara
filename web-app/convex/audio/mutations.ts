import { mutation } from "@convex/_generated/server";
import { requireAuth } from "@convex/auth/config";
import { v } from "convex/values";

const transcriptSegment = v.object({
  start: v.number(),
  end: v.number(),
  text: v.string(),
});

const visibility = v.union(
  v.literal("private"),
  v.literal("unlisted"),
  v.literal("public"),
);

const createPublicId = () =>
  crypto.randomUUID().replaceAll("-", "").slice(0, 18);

export const generateAudioUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createAudioFile = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.optional(v.string()),
    originalFileName: v.string(),
    mimeType: v.string(),
    durationMs: v.optional(v.number()),
    transcriptText: v.string(),
    transcriptSegments: v.array(transcriptSegment),
    visibility,
  },
  handler: async (ctx, args) => {
    const { session } = await requireAuth(ctx);
    const now = Date.now();
    const publicId = createPublicId();

    await ctx.db.insert("audioFiles", {
      userId: session.user.id,
      publicId,
      title: args.title,
      originalFileName: args.originalFileName,
      mimeType: args.mimeType,
      durationMs: args.durationMs,
      storageId: args.storageId,
      transcriptText: args.transcriptText,
      transcriptSegments: args.transcriptSegments,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
    });

    return {
      publicId,
      url: `/listen/audio/${publicId}`,
    };
  },
});
