import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export function toAdminSessionDto(session: AuthDoc<"session">) {
  return {
    id: String(session._id),
    userId: session.userId,
    userAgent: session.userAgent ?? null,
    ipAddress: session.ipAddress ?? null,
    impersonatedBy: session.impersonatedBy ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
  };
}

export type AdminSessionDto = ReturnType<typeof toAdminSessionDto>;
