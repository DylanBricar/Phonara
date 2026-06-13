import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../auth/config";

export const create = mutation({
  args: {
    review: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { session } = await requireAuth(ctx);
    const now = Date.now();
    return ctx.db.insert("feedbacks", {
      review: args.review,
      message: args.message,
      email: session.user.email,
      userId: session.user.id,
      createdAt: now,
      updatedAt: now,
    });
  },
});
