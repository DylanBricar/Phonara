import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export function toAdminUserDto(user: AuthDoc<"user">) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role ?? null,
    banned: Boolean(user.banned),
    banReason: user.banReason ?? null,
    banExpires: user.banExpires ?? null,
  };
}

export type AdminUserDto = ReturnType<typeof toAdminUserDto>;
