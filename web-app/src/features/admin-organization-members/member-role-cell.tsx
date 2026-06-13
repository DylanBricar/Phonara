import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { RoleSelectParts } from "@/features/organization-members/role-select-parts";
import { RolesKeys, type AuthRole } from "@/lib/auth/auth-permissions";
import type { OrganizationMember } from "./organization-member-types";
import { isAuthRole } from "./organization-member-utils";

export function MemberRoleCell({
  disabled,
  member,
  onRoleChange,
}: {
  disabled: boolean;
  member: OrganizationMember;
  onRoleChange: (memberId: string, role: AuthRole) => void;
}) {
  if (!isAuthRole(member.role)) {
    return <Badge variant="outline">{member.role}</Badge>;
  }

  return (
    <Select
      value={member.role}
      disabled={disabled}
      onValueChange={(value) => {
        if (!value || !isAuthRole(value) || value === member.role) return;
        onRoleChange(member.id, value);
      }}
    >
      <RoleSelectParts roles={RolesKeys} triggerClassName="w-[120px]" />
    </Select>
  );
}
