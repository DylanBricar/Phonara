import { query } from "@convex/_generated/server";
import { requireAuth } from "@convex/auth/config";
import { v } from "convex/values";

const serializeAudioFile = async (
  ctx: Parameters<Parameters<typeof query>[0]["handler"]>[0],
  file: any,
) => ({
  id: file._id,
  publicId: file.publicId,
  title: file.title ?? file.originalFileName,
  originalFileName: file.originalFileName,
  mimeType: file.mimeType,
  durationMs: file.durationMs ?? null,
  audioUrl: await ctx.storage.getUrl(file.storageId),
  transcriptText: file.transcriptText,
  transcriptSegments: file.transcriptSegments,
  visibility: file.visibility,
  createdAt: file.createdAt,
});

export const getPublicAudioFile = query({
  args: {
    publicId: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("audioFiles")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!file || file.visibility === "private") return null;
    return serializeAudioFile(ctx, file);
  },
});

export const listMyAudioFiles = query({
  args: {},
  handler: async (ctx) => {
    const { session } = await requireAuth(ctx);
    const files = await ctx.db
      .query("audioFiles")
      .withIndex("by_user_created", (q) => q.eq("userId", session.user.id))
      .order("desc")
      .take(50);

    return Promise.all(files.map((file) => serializeAudioFile(ctx, file)));
  },
});
