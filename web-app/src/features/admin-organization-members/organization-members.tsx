import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation } from "convex/react";
import { Trash, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InvitationsTable } from "./invitations-table";
import { openInviteMemberDialog } from "./invite-member-dialog";
import { MembersTable } from "./members-table";
import type {
  OrganizationInvitation,
  OrganizationMember,
} from "./organization-member-types";

export function OrganizationMembers({
  invitations,
  organizationId,
  members,
}: {
  invitations: OrganizationInvitation[];
  organizationId: string;
  members: OrganizationMember[];
}) {
  const updateMemberRole = useConvexMutation(
    api.admin.mutations.updateOrganizationMemberRole,
  );
  const removeMember = useConvexMutation(
    api.admin.mutations.removeOrganizationMember,
  );
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const handleUpdateMemberRole = async (memberId: string, role: AuthRole) => {
    setUpdatingMemberId(memberId);
    try {
      await updateMemberRole({
        organizationId,
        memberId,
        role,
      });
      toast.success("Member role updated");
    } catch (error) {
      toastClientError(error, "Failed to update member role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = (member: OrganizationMember) => {
    dialogManager.confirm({
      title: "Remove member",
      description: `Remove ${member.user.email} from this organization. Platform admins can remove any member, including owners.`,
      variant: "destructive",
      icon: Trash,
      action: {
        label: "Remove member",
        variant: "destructive",
        onClick: async () => {
          await removeMember({
            organizationId,
            memberId: member.id,
          });
          toast.success("Member removed");
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Users with access to this organization.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            onClick={() => openInviteMemberDialog(organizationId)}
          >
            <UserPlus className="size-4" />
            Invite
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <MembersTable
          members={members}
          onRemove={handleRemoveMember}
          onRoleChange={(memberId, role) => {
            void handleUpdateMemberRole(memberId, role);
          }}
          updatingMemberId={updatingMemberId}
        />
        <InvitationsTable invitations={invitations} now={now} />
      </CardContent>
    </Card>
  );
}
