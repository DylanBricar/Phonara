import { Resend } from "@convex-dev/resend";
import { components } from "@convex/_generated/api";
import { v } from "convex/values";
import { internalMutation } from "@convex/_generated/server";
import { SiteConfig } from "@convex/utils/siteConfig";

const buildFromAddress = (emailFrom: string) => {
  const trimmed = emailFrom.trim();
  if (trimmed.includes("<") && trimmed.includes(">")) return trimmed;
  return `${SiteConfig.team.name} from ${SiteConfig.title} <${trimmed}>`;
};

const emailFrom = buildFromAddress(
  process.env.EMAIL_FROM ?? SiteConfig.company.contactEmail,
);

export const resend = new Resend(components.resend, {
  testMode: false,
});

export const sendEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: args.from ?? emailFrom,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.replyTo ? { replyTo: [args.replyTo] } : {}),
    });
  },
});
