import {
  InviteMemberForm,
  type InviteMemberValues,
} from "@/features/organization-members/invite-member-form";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { RolesKeys } from "@/lib/auth/auth-permissions";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation } from "convex/react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

function InviteMemberDialogContent({
  formId,
  organizationId,
}: {
  formId: string;
  organizationId: string;
}) {
  const inviteMember = useConvexMutation(
    api.admin.mutations.inviteOrganizationMember,
  );

  const handleSubmit = async (values: InviteMemberValues) => {
    try {
      await inviteMember({
        organizationId,
        email: values.email,
        role: values.role,
      });
      toast.success("Invitation sent");
      dialogManager.closeAll();
    } catch (error) {
      toastClientError(error, "Failed to invite member");
    }
  };

  return (
    <InviteMemberForm
      formId={formId}
      roles={RolesKeys}
      onSubmit={handleSubmit}
      showSubmitButton={false}
    />
  );
}

export function openInviteMemberDialog(organizationId: string) {
  const formId = `admin-invite-member-${organizationId}`;

  dialogManager.custom({
    title: "Invite member",
    description: "Send an invitation to this organization as a platform admin.",
    icon: UserPlus,
    size: "md",
    children: (
      <InviteMemberDialogContent
        formId={formId}
        organizationId={organizationId}
      />
    ),
    action: {
      label: "Send invite",
      form: formId,
    },
  });
}
