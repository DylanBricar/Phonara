import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { apiKey } from "@better-auth/api-key";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils";
import betterAuthSchema from "../betterAuth/schema";
import {
  admin,
  emailOTP,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { APIError, betterAuth } from "better-auth";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import authConfig from "../auth.config";
import { throwUnauthorized } from "@convex/utils/errors";
import { SiteConfig } from "@convex/utils/siteConfig";
import {
  buildAccountActionEmail,
  buildInvitationEmail,
  buildSignInOtpEmail,
  type MarkdownEmailContent,
} from "./emailTemplates";
import { ac, roles } from "./permissions";

export const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
export const authCookiePrefix =
  process.env.BETTER_AUTH_COOKIE_PREFIX?.trim() || SiteConfig.appId;

const getSiteHost = () => {
  try {
    return new URL(siteUrl).host;
  } catch {
    return null;
  }
};

const getAllowedHosts = () => {
  const configuredHosts = (
    process.env.BETTER_AUTH_ALLOWED_HOSTS ??
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    process.env.TRUSTED_ORIGINS ??
    ""
  )
    .split(",")
    .map((value) => normalizeOrigin(value.trim()))
    .map((origin) => (origin ? new URL(origin).host : null))
    .filter((host): host is string => Boolean(host));

  return Array.from(
    new Set(
      [
        "localhost:*",
        "127.0.0.1:*",
        "[::1]:*",
        "*.vercel.app",
        getSiteHost(),
        ...configuredHosts,
      ].filter((host): host is string => Boolean(host)),
    ),
  );
};

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const getTrustedOrigins = () => {
  const configuredOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    process.env.TRUSTED_ORIGINS ??
    "";
  const origins = [siteUrl, ...configuredOrigins.split(",")]
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set(origins));
};

const isLocalOrigin = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
};

const assertAssignableOrganizationRole = (role: string) => {
  if (role.split(",").some((value) => value.trim() === "owner")) {
    throw APIError.fromStatus("BAD_REQUEST", {
      message: "Owner role cannot be assigned to another member",
    });
  }
};

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  {
    local: { schema: betterAuthSchema },
    verbose: false,
  },
);

type EmailParams = {
  to: string;
  subject: string;
} & MarkdownEmailContent;

const scheduleEmail = async (
  ctx: GenericCtx<DataModel>,
  params: EmailParams,
) => {
  const mctx = requireRunMutationCtx(ctx);
  return mctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, {
    ...params,
  });
};

const scheduleStripeCustomer = async (
  ctx: GenericCtx<DataModel>,
  params: {
    organizationId: string;
    email: string;
    name?: string;
  },
) => {
  const mctx = requireRunMutationCtx(ctx);
  return mctx.scheduler.runAfter(
    0,
    internal.stripe.actions.ensureOrganizationCustomer,
    params,
  );
};

type SocialProvidersType = Parameters<typeof betterAuth>[0]["socialProviders"];

export const getSocialProviders = (): SocialProvidersType => {
  const providers: SocialProvidersType = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return providers;
};

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
  baseURL: {
    allowedHosts: getAllowedHosts(),
    fallback: siteUrl,
    protocol: "auto" as const,
  },
  trustedOrigins: isLocalOrigin(siteUrl)
    ? [siteUrl, "http://localhost:*", "http://127.0.0.1:*", "http://[::1]:*"]
    : getTrustedOrigins(),
  database: authComponent.adapter(ctx),
  session: {
    expiresIn: 60 * 60 * 24 * 20,
    updateAge: 60 * 60 * 24 * 7,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user: { id: string; email: string }) => {
          const hasPendingInvitation = await ctx
            .runQuery(components.betterAuth.data.hasPendingInvitationForEmail, {
              email: user.email,
            })
            .catch(() => false);
          if (hasPendingInvitation) {
            return;
          }

          const emailName = user.email.split("@")[0].slice(0, 8);
          const slug = `${emailName.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;

          const auth = createAuth(ctx);
          try {
            await auth.api.createOrganization({
              body: {
                name: `${emailName}'s org`,
                slug,
                logo: `${siteUrl}/images/org-logo.png`,
                userId: user.id,
              },
            });
          } catch {
            // org creation may fail silently
          }
        },
      },
    },
  },
  advanced: {
    cookiePrefix: authCookiePrefix,
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) {
      await scheduleEmail(ctx, {
        to: user.email,
        subject: "Reset your password",
        ...buildAccountActionEmail({
          preview: `Reset your ${SiteConfig.title} password`,
          title: "Reset your password",
          description: `Use the secure link below to reset your ${SiteConfig.title} password.`,
          actionLabel: "Reset password",
          actionUrl: url,
        }),
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({
        newEmail,
        url,
      }: {
        newEmail: string;
        url: string;
      }) => {
        await scheduleEmail(ctx, {
          to: newEmail,
          subject: "Change email address",
          ...buildAccountActionEmail({
            preview: `Verify your new ${SiteConfig.title} email address`,
            title: "Verify your new email address",
            description: `Use the secure link below to confirm this email address for your ${SiteConfig.title} account.`,
            actionLabel: "Verify email address",
            actionUrl: url,
          }),
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({
        user,
        token,
      }: {
        user: { email: string };
        token: string;
      }) => {
        const url = `${siteUrl}/auth/confirm-delete?token=${token}&callbackUrl=/auth/goodbye`;
        await scheduleEmail(ctx, {
          to: user.email,
          subject: "Delete your account",
          ...buildAccountActionEmail({
            preview: `Confirm ${SiteConfig.title} account deletion`,
            title: "Confirm account deletion",
            description:
              "Use the secure link below to confirm that you want to delete your account.",
            actionLabel: "Delete account",
            actionUrl: url,
          }),
        });
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) => {
      await scheduleEmail(ctx, {
        to: user.email,
        subject: "Verify your email address",
        ...buildAccountActionEmail({
          preview: `Verify your ${SiteConfig.title} email address`,
          title: "Verify your email address",
          description: `Welcome to ${SiteConfig.title}. Use the secure link below to verify your email address and finish setting up your account.`,
          actionLabel: "Verify email",
          actionUrl: url,
        }),
      });
    },
  },
  socialProviders: getSocialProviders(),
  plugins: [
    organization({
      ac,
      roles,
      organizationLimit: 5,
      membershipLimit: 10,
      autoCreateOrganizationOnSignUp: true,
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          await scheduleStripeCustomer(ctx, {
            organizationId: organization.id,
            email: user.email,
            name: organization.name,
          });
        },
        beforeCreateInvitation: async ({ invitation }) => {
          assertAssignableOrganizationRole(invitation.role);
        },
        beforeUpdateMemberRole: async ({ newRole }) => {
          assertAssignableOrganizationRole(newRole);
        },
      },
      async sendInvitationEmail({
        id,
        email,
        role,
        organization,
        inviter,
      }: {
        id: string;
        email: string;
        role: string;
        organization: { name: string; logo?: string | null };
        inviter: { user: { name: string; email: string } };
      }) {
        const inviteLink = `${siteUrl}/orgs/accept-invitation/${id}`;
        const orgName = organization.name;
        const orgLogo = organization.logo ?? null;
        const inviterName = inviter.user.name || inviter.user.email;
        await scheduleEmail(ctx, {
          to: email,
          subject: `You are invited to join ${orgName}`,
          ...buildInvitationEmail({
            inviteLink,
            orgName,
            orgLogo,
            inviterName,
            role,
          }),
        });
      },
    }),
    apiKey({
      references: "organization",
      defaultPrefix: "nsk_",
      requireName: true,
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        timeWindow: 1000 * 60 * 60,
      },
      keyExpiration: {
        defaultExpiresIn: null,
        minExpiresIn: 1,
        maxExpiresIn: 365,
      },
    }),
    emailOTP({
      sendVerificationOTP: async ({
        email,
        otp,
      }: {
        email: string;
        otp: string;
      }) => {
        await scheduleEmail(ctx, {
          to: email,
          subject: `Your code to sign in to ${SiteConfig.title}`,
          ...buildSignInOtpEmail({ otp }),
        });
      },
    }),
    admin({}),
    lastLoginMethod({}),
    // Must be the last plugins
    convex({ authConfig }),
  ],
});

export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const user = session?.user as { role?: string } | undefined;

  if (user?.role !== "admin") {
    throwUnauthorized();
  }

  return { auth, headers };
}

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    throwUnauthorized();
  }

  return { auth, headers, session };
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
