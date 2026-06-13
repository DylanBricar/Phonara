import {
  NowStackDialogContent,
  NowStackDialogHeader,
} from "@/components/nowts/dialog-nowstack";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NewOrganizationForm } from "@/routes/orgs/new/new-org-form";
import { useLocation, useRouter, useSearch } from "@tanstack/react-router";

export function CreateOrganizationDialog() {
  const search = useSearch({ strict: false }) as { modal?: string };
  const location = useLocation();
  const router = useRouter();
  const isOpen = search.modal === "create-organization";

  const closeDialog = () => {
    if (location.maskedLocation) {
      router.history.back();
      return;
    }

    void router.navigate({
      to: ".",
      search: (previous) => ({ ...previous, modal: undefined }),
      replace: true,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <NowStackDialogContent className="sm:max-w-lg">
        <NowStackDialogHeader>
          <DialogTitle className="text-base">Create organization</DialogTitle>
          <DialogDescription className="text-sm">
            Add a new workspace for your team, billing, and settings.
          </DialogDescription>
        </NowStackDialogHeader>
        <NewOrganizationForm variant="dialog" />
      </NowStackDialogContent>
    </Dialog>
  );
}
