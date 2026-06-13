import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InviteMemberForm,
  type InviteMemberValues,
} from "@/features/organization-members/invite-member-form";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { AssignableRolesKeys } from "@/lib/auth/auth-permissions";
import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

type OrganizationInviteMemberFormProps = {
  onInviteSent?: () => void;
};

export const OrganizationInviteMemberForm = ({
  onInviteSent,
}: OrganizationInviteMemberFormProps) => {
  const [open, setOpen] = useState(false);
  const activeOrg = useCurrentOrg();
  const inviteMember = useConvexMutation(api.auth.mutations.inviteMember);

  const handleInviteMember = async (values: InviteMemberValues) => {
    if (!activeOrg) {
      toast.error("No active organization");
      return;
    }

    if (values.role === "owner") {
      toast.error("Owner invitations are reserved for platform admins");
      return;
    }

    try {
      await inviteMember({
        organizationId: activeOrg.id,
        email: values.email,
        role: values.role,
      });
      toast.success("Invitation sent");
      setOpen(false);
      onInviteSent?.();
    } catch (error) {
      toastClientError(error, "Failed to invite member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <Button type="button">Invite</Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="p-6">
          <div className="mt-4 flex justify-center">
            <Avatar className="size-16">
              {activeOrg?.image ? (
                <AvatarImage src={activeOrg.image} alt={activeOrg.name} />
              ) : null}
              <AvatarFallback>
                {activeOrg?.name.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle className="text-center">Invite Teammates</DialogTitle>

          <DialogDescription className="text-center">
            Invite members to collaborate in your organization
          </DialogDescription>
        </DialogHeader>

        <div className="border-t p-6">
          <InviteMemberForm
            className="flex flex-col gap-8"
            fieldsLayout="inline"
            roles={AssignableRolesKeys}
            onSubmit={handleInviteMember}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
