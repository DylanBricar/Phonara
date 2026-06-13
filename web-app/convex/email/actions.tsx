"use node";

import { pretty, render } from "@react-email/render";
import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import { internalAction } from "@convex/_generated/server";
import { MarkdownEmail } from "./markdownEmail";

export const sendMarkdownEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    preview: v.string(),
    markdown: v.string(),
    badgeLabel: v.string(),
    badgeImageUrl: v.optional(v.union(v.string(), v.null())),
    badgeVariant: v.optional(v.union(v.literal("brand"), v.literal("dark"))),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const html = await pretty(
      await render(
        <MarkdownEmail
          preview={args.preview}
          markdown={args.markdown}
          badgeLabel={args.badgeLabel}
          badgeImageUrl={args.badgeImageUrl}
          badgeVariant={args.badgeVariant}
        />,
      ),
    );

    await ctx.runMutation(internal.email.mutations.sendEmail, {
      to: args.to,
      subject: args.subject,
      html,
      ...(args.from ? { from: args.from } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
  },
});
