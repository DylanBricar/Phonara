import { v } from "convex/values";
import { components } from "@convex/_generated/api";
import type { QueryCtx } from "@convex/_generated/server";
import { adminQuery } from "@convex/auth/functions";
import { throwValidationError } from "@convex/utils/errors";

type FeedbackUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
};

async function hydrateFeedbackUser(
  ctx: QueryCtx,
  userId: string,
): Promise<FeedbackUser | null> {
  const rawUser = await ctx.runQuery(components.betterAuth.data.getUserById, {
    userId,
  });

  if (!rawUser) return null;

  return {
    id: String(rawUser._id),
    name: String(rawUser.name ?? "Unknown"),
    email: String(rawUser.email ?? ""),
    image: (rawUser.image as string | null) ?? null,
    role: (rawUser.role as string | null) ?? null,
  };
}

export const getFeedbackById = adminQuery({
  args: { id: v.id("feedbacks") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback) return null;

    const user = feedback.userId
      ? await hydrateFeedbackUser(ctx, feedback.userId)
      : null;

    return {
      ...feedback,
      id: feedback._id,
      user,
    };
  },
});

export const listFeedback = adminQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      !Number.isFinite(args.pageSize) ||
      args.pageSize < 1 ||
      args.pageSize > 100
    ) {
      throwValidationError("pageSize must be between 1 and 100");
    }

    const trimmedSearch = args.search?.trim();
    const baseQuery = trimmedSearch
      ? ctx.db
          .query("feedbacks")
          .withSearchIndex("by_message", (q) =>
            q.search("message", trimmedSearch),
          )
      : ctx.db.query("feedbacks").withIndex("by_created").order("desc");

    const result = await baseQuery.paginate({
      cursor: args.cursor ?? null,
      numItems: args.pageSize,
    });

    const feedbackWithUsers = await Promise.all(
      result.page.map(async (feedback) => {
        const user = feedback.userId
          ? await hydrateFeedbackUser(ctx, feedback.userId)
          : null;

        return { ...feedback, user };
      }),
    );

    return { ...result, page: feedbackWithUsers };
  },
});
