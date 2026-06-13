import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export function toAdminOrganizationDto(organization: AuthDoc<"organization">) {
  return {
    id: String(organization._id),
    name: organization.name,
    slug: organization.slug ?? "",
    logo: organization.logo ?? null,
    createdAt: organization.createdAt,
    stripeCustomerId: organization.stripeCustomerId ?? null,
  };
}

export type AdminOrganizationDto = ReturnType<typeof toAdminOrganizationDto>;
