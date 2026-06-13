import { v } from "convex/values";
import { components, internal } from "@convex/_generated/api";
import { adminMutation } from "@convex/auth/functions";
import { siteUrl } from "@convex/auth/config";
import {
  buildInvitationEmail,
  buildMemberRemovedEmail,
} from "@convex/auth/emailTemplates";
import { throwNotFound, throwValidationError } from "@convex/utils/errors";

const INVITATION_EXPIRES_IN_MS = 1000 * 60 * 60 * 48;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const organizationRoleValidator = v.union(
  v.literal("member"),
  v.literal("admin"),
  v.literal("owner"),
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const createUser = adminMutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = ctx.adminAuth;
    return auth.api.createUser({
      headers,
      body: {
        email: args.email,
        password: args.password,
        name: args.name,
        role: args.role as "admin" | "user",
      },
    });
  },
});

export const setUserPassword = adminMutation({
  args: {
    userId: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = ctx.adminAuth;
    return auth.api.setUserPassword({
      headers,
      body: {
        userId: args.userId,
        newPassword: args.newPassword,
      },
    });
  },
});

export const revokeUserSession = adminMutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = ctx.adminAuth;
    const session = await ctx.runQuery(components.betterAuth.data.getSessionById, {
      sessionId: args.sessionId,
    });

    if (!session?.token) {
      throwNotFound("Session not found");
    }

    return auth.api.revokeUserSession({
      headers,
      body: {
        sessionToken: String(session.token),
      },
    });
  },
});

export const revokeUserSessions = adminMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = ctx.adminAuth;
    return auth.api.revokeUserSessions({
      headers,
      body: {
        userId: args.userId,
      },
    });
  },
});

export const updateOrganization = adminMutation({
  args: {
    organizationId: v.string(),
    data: v.object({
      name: v.optional(v.string()),
      logo: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation(components.betterAuth.data.patchOrganization, {
      organizationId: args.organizationId,
      update: args.data,
    });
  },
});

export const inviteOrganizationMember = adminMutation({
  args: {
    organizationId: v.string(),
    email: v.string(),
    role: organizationRoleValidator,
  },
  handler: async (ctx, args) => {
    const { auth, headers } = ctx.adminAuth;
    const session = await auth.api.getSession({ headers });
    const adminUser = session?.user;

    if (!adminUser) {
      throwValidationError("Admin session not found");
    }

    const email = normalizeEmail(args.email);
    if (!EMAIL_PATTERN.test(email)) {
      throwValidationError("Enter a valid email address");
    }

    const organization = await ctx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: args.organizationId },
    );

    if (!organization) {
      throwNotFound("Organization not found");
    }

    const now = Date.now();
    const invitation = await ctx.runMutation(
      components.betterAuth.data.createInvitationForAdmin,
      {
        organizationId: args.organizationId,
        email,
        role: args.role,
        inviterId: adminUser.id,
        expiresAt: now + INVITATION_EXPIRES_IN_MS,
        createdAt: now,
      },
    );

    if (!invitation) {
      throwValidationError("Failed to create invitation");
    }

    await ctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, {
      to: email,
      subject: `You are invited to join ${String(organization.name)}`,
      ...buildInvitationEmail({
        inviteLink: `${siteUrl}/orgs/accept-invitation/${invitation.id}`,
        orgName: String(organization.name),
        orgLogo: organization.logo ? String(organization.logo) : null,
        inviterName: adminUser.name || adminUser.email,
        role: args.role,
      }),
    });

    return invitation;
  },
});

export const updateOrganizationMemberRole = adminMutation({
  args: {
    organizationId: v.string(),
    memberId: v.string(),
    role: organizationRoleValidator,
  },
  handler: async (ctx, args) => {
    const member = await ctx.runMutation(
      components.betterAuth.data.patchMemberRoleForAdmin,
      {
        organizationId: args.organizationId,
        memberId: args.memberId,
        role: args.role,
      },
    );

    if (!member) {
      throwNotFound("Member not found");
    }

    return { member };
  },
});

export const removeOrganizationMember = adminMutation({
  args: {
    organizationId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const [member, organization] = await Promise.all([
      ctx.runQuery(components.betterAuth.data.getMemberById, {
        memberId: args.memberId,
      }),
      ctx.runQuery(components.betterAuth.data.getOrganizationById, {
        organizationId: args.organizationId,
      }),
    ]);

    if (member?.organizationId !== args.organizationId) {
      throwNotFound("Member not found");
    }

    if (!organization) {
      throwNotFound("Organization not found");
    }

    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: String(member.userId),
    });

    const removedMember = await ctx.runMutation(
      components.betterAuth.data.deleteMemberForAdmin,
      {
        organizationId: args.organizationId,
        memberId: args.memberId,
      },
    );

    if (!removedMember) {
      throwNotFound("Member not found");
    }

    if (user?.email) {
      await ctx.scheduler.runAfter(
        0,
        internal.email.actions.sendMarkdownEmail,
        {
          to: String(user.email),
          subject: `You have been removed from ${String(organization.name)}`,
          ...buildMemberRemovedEmail({
            orgName: String(organization.name),
            orgLogo: organization.logo ? String(organization.logo) : null,
            userName: user.name ? String(user.name) : "",
            appUrl: siteUrl,
          }),
        },
      );
    }

    return { member: removedMember };
  },
});

export const replyFeedback = adminMutation({
  args: {
    feedbackId: v.id("feedbacks"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback?.email) {
      throwValidationError("No email address found for this feedback");
    }

    await ctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, {
      to: feedback.email,
      subject: "Re: Your Feedback",
      preview: "Response to your feedback",
      markdown: args.message,
      badgeLabel: "Support",
    });

    return { success: true };
  },
});
