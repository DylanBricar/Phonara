import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dayjs } from "@/lib/dayjs";
import { EmptyTableRow } from "./empty-table-row";
import type { OrganizationInvitation } from "./organization-member-types";
import {
  getInvitationRoleLabel,
  getInvitationStatus,
  getInvitationStatusLabel,
} from "./organization-member-utils";

function InvitationStatusBadge({
  invitation,
  now,
}: {
  invitation: OrganizationInvitation;
  now: number;
}) {
  const status = getInvitationStatus(invitation, now);

  return (
    <Badge variant={status === "pending" ? "secondary" : "outline"}>
      {getInvitationStatusLabel(status)}
    </Badge>
  );
}

export function InvitationsTable({
  invitations,
  now,
}: {
  invitations: OrganizationInvitation[];
  now: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div>
        <h3 className="text-sm font-medium">Invitations</h3>
        <p className="text-muted-foreground text-sm">
          Pending and historical organization invitations.
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.email}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getInvitationRoleLabel(invitation.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <InvitationStatusBadge invitation={invitation} now={now} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dayjs(invitation.expiresAt).format("MMM D, YYYY")}
                </TableCell>
              </TableRow>
            ))}
            {invitations.length === 0 && (
              <EmptyTableRow colSpan={4}>No invitations found.</EmptyTableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
