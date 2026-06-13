import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export function toAdminAccountDto(account: AuthDoc<"account">) {
  return {
    id: String(account._id),
    accountId: account.accountId,
    providerId: account.providerId,
    userId: account.userId,
    accessTokenExpiresAt: account.accessTokenExpiresAt ?? null,
    refreshTokenExpiresAt: account.refreshTokenExpiresAt ?? null,
    scope: account.scope ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export type AdminAccountDto = ReturnType<typeof toAdminAccountDto>;
