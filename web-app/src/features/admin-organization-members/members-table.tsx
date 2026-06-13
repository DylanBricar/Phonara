import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import { EmptyTableRow } from "./empty-table-row";
import { MemberActions } from "./member-actions";
import { MemberIdentityLink } from "./member-identity-link";
import { MemberRoleCell } from "./member-role-cell";
import type { OrganizationMember } from "./organization-member-types";

export function MembersTable({
  members,
  onRemove,
  onRoleChange,
  updatingMemberId,
}: {
  members: OrganizationMember[];
  onRemove: (member: OrganizationMember) => void;
  onRoleChange: (memberId: string, role: AuthRole) => void;
  updatingMemberId: string | null;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <MemberIdentityLink member={member} />
              </TableCell>
              <TableCell>
                <MemberRoleCell
                  member={member}
                  disabled={updatingMemberId === member.id}
                  onRoleChange={onRoleChange}
                />
              </TableCell>
              <TableCell>
                <MemberActions member={member} onRemove={onRemove} />
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <EmptyTableRow colSpan={3}>No team members found.</EmptyTableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
