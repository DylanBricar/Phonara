import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import { authComponent, createAuth } from "@convex/auth/config";
import { mutation } from "@convex/_generated/server";
import { throwConfigurationError } from "@convex/utils/errors";
import { SiteConfig } from "@convex/utils/siteConfig";

const contactEmail =
  process.env.EMAIL_CONTACT ??
  process.env.VITE_EMAIL_CONTACT ??
  process.env.NEXT_PUBLIC_EMAIL_CONTACT ??
  SiteConfig.company.contactEmail;

const requireContactEmail = () => {
  const email = contactEmail.trim();
  if (!email) {
    throwConfigurationError("Contact email is not configured");
  }
  return email;
};

export const sendSupportRequest = mutation({
  args: {
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, {
      to: requireContactEmail(),
      subject: `Support needed from ${args.email} - ${args.subject}`,
      preview: `Support request from ${args.email}`,
      markdown: `
        # Support request

        **From:** ${args.email}

        **Subject:** ${args.subject}

        ${args.message}
      `,
      badgeLabel: "Support",
      replyTo: args.email,
    });

    return { message: "Your message has been sent to support." };
  },
});

export const sendFeedback = mutation({
  args: {
    email: v.optional(v.string()),
    review: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const session = await auth.api.getSession({ headers });
    const email = session?.user.email ?? args.email?.trim() ?? "";
    const review = Number(args.review) || 0;
    const now = Date.now();

    await ctx.db.insert("feedbacks", {
      review,
      message: args.message,
      ...(email ? { email } : {}),
      ...(session?.user.id ? { userId: session.user.id } : {}),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, {
      to: requireContactEmail(),
      subject: `New feedback from ${email || "anonymous"}`,
      preview: `New feedback from ${email || "anonymous"}`,
      markdown: `
        # New feedback

        **From:** ${email || "anonymous"}

        **Review:** ${review}/5

        ${args.message}
      `,
      badgeLabel: "Feedback",
      ...(email ? { replyTo: email } : {}),
    });

    return { message: "Your feedback has been sent to support." };
  },
});
