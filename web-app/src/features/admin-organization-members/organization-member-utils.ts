import {
  getRoleLabel,
  RolesKeys,
  type AuthRole,
} from "@/lib/auth/auth-permissions";
import type { OrganizationInvitation } from "./organization-member-types";

export function isAuthRole(role: string): role is AuthRole {
  return RolesKeys.includes(role as AuthRole);
}

export function getInvitationRoleLabel(role: string | null) {
  if (!role) return "Member";
  return isAuthRole(role) ? getRoleLabel(role) : role;
}

export function getInvitationStatus(
  invitation: OrganizationInvitation,
  now: number,
) {
  if (invitation.status === "pending" && invitation.expiresAt < now) {
    return "expired";
  }
  return invitation.status;
}

export function getInvitationStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
