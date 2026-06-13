import { Button } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { api } from "@convex/_generated/api";
import { Trash2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "sonner";
import { getClientErrorMessage } from "@/lib/errors/client-error-message";

export const OrganizationDeleteDialog = ({
  org,
}: {
  org: { id: string; slug: string };
}) => {
  const router = useRouter();
  const deleteOrganization = useConvexMutation(
    api.auth.mutations.deleteOrganization,
  );

  const handleDeleteOrganization = async () => {
    try {
      await deleteOrganization({
        organizationId: org.id,
      });
      toast.success("Organization deleted", {
        description: "Your organization has been deleted",
      });
      void router.navigate({ to: "/orgs" });
    } catch (error) {
      toast.error("Error deleting organization", {
        description: getClientErrorMessage(error, "Failed to delete organization"),
      });
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={() => {
        dialogManager.confirm({
          title: "Delete Organization",
          description: "Are you sure you want to delete your organization?",
          confirmText: org.slug,
          action: {
            label: "Delete",
            onClick: async () => {
              await handleDeleteOrganization();
            },
          },
        });
      }}
    >
      <Trash2 className="mr-2" size={16} />
      Delete Organization
    </Button>
  );
};
