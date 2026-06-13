import { SiteConfig } from "@convex/utils/siteConfig";

export type MarkdownEmailContent = {
  preview: string;
  markdown: string;
  badgeLabel: string;
  badgeImageUrl?: string | null;
  badgeVariant?: "brand" | "dark";
};

export const buildMemberRemovedEmail = (params: {
  orgName: string;
  orgLogo?: string | null;
  userName: string;
  appUrl: string;
}): MarkdownEmailContent => {
  const greetingName = params.userName.trim() ? params.userName : "there";
  return {
    preview: `You've been removed from ${params.orgName}`,
    badgeLabel: params.orgName,
    badgeImageUrl: params.orgLogo ?? undefined,
    badgeVariant: "dark",
    markdown: `
      # You've been removed from ${params.orgName}

      Hi ${greetingName},

      You no longer have access to **${params.orgName}**. If you think this was a mistake, please reach out to an organization admin.

      You can still keep using ${SiteConfig.title} with your own organization.

      [View your organizations](${params.appUrl}/orgs/list)
    `,
  };
};

export const buildInvitationEmail = (params: {
  inviteLink: string;
  orgName: string;
  orgLogo?: string | null;
  inviterName: string;
  role: string;
}): MarkdownEmailContent => {
  return {
    preview: `${params.inviterName} invited you to join ${params.orgName}`,
    badgeLabel: params.orgName,
    badgeImageUrl: params.orgLogo ?? undefined,
    markdown: `
      # You're invited to join ${params.orgName}

      **${params.inviterName}** invited you to join **${params.orgName}** as **${params.role}**.

      [Accept invitation](${params.inviteLink} "button")

      Or copy and paste this link into your browser: [${params.inviteLink}](${params.inviteLink})
    `,
  };
};

export const buildSignInOtpEmail = (params: {
  otp: string;
}): MarkdownEmailContent => {
  return {
    preview: `Your ${SiteConfig.title} sign-in code is ${params.otp}`,
    badgeLabel: SiteConfig.title,
    markdown: `
      # Your sign-in code for ${SiteConfig.title}

      Enter this code on the sign-in page to securely continue to your workspace.

      \`\`\`
      ${params.otp}
      \`\`\`

      If you did not request this code, you can safely ignore this email.
    `,
  };
};

export const buildAccountActionEmail = (params: {
  preview: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}): MarkdownEmailContent => {
  return {
    preview: params.preview,
    badgeLabel: SiteConfig.title,
    markdown: `
      # ${params.title}

      ${params.description}

      [${params.actionLabel}](${params.actionUrl})

      If you did not request this, you can safely ignore this email.
    `,
  };
};
