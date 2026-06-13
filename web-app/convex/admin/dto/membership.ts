import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export function toAdminMembershipDto(
  membership: AuthDoc<"member">,
  organization?: AuthDoc<"organization">,
) {
  return {
    id: String(membership._id),
    organizationId: membership.organizationId,
    role: membership.role,
    organization: {
      id: membership.organizationId,
      name: organization?.name ?? "Unknown",
      logo: organization?.logo ?? null,
    },
  };
}

export type AdminMembershipDto = ReturnType<typeof toAdminMembershipDto>;
