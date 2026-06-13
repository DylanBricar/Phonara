import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, UserX2 } from "lucide-react";
import { toast } from "sonner";
import { AccountCardSkeleton } from "../_components/account-card-skeleton";

export const Route = createFileRoute("/(logged-in)/account/danger/")({
  head: () => ({ meta: [{ title: "Delete Account" }] }),
  component: DeleteProfilePage,
  pendingComponent: () => <AccountCardSkeleton contentLines={2} />,
});

function DeleteProfilePage() {
  const deleteAccountMutation = useQueryMutation({
    mutationFn: async () => {
      return unwrapSafePromise(
        authClient.deleteUser({
          callbackURL: "/goodbye",
        }),
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-muted flex size-9 items-center justify-center rounded-md">
              <UserX2 className="size-4" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <Typography variant="small">Personal Data</Typography>
              <Typography variant="muted">
                All your personal information and settings will be permanently
                erased.
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-muted flex size-9 items-center justify-center rounded-md">
              <Building2 className="size-4" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <Typography variant="small">Organization Data</Typography>
              <Typography variant="muted">
                If you&apos;re an organization owner, all organization data will
                be deleted and subscriptions cancelled.
              </Typography>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <LoadingButton
          size="sm"
          variant="destructive"
          loading={deleteAccountMutation.isPending}
          onClick={() => {
            dialogManager.confirm({
              title: "Delete your account?",
              description: "Are you sure you want to delete your profile?",
              variant: "destructive",
              confirmText: "Delete",
              action: {
                label: "Delete",
                variant: "destructive",
                onClick: async () => {
                  await deleteAccountMutation.mutateAsync();
                  toast.success("Your deletion has been asked.", {
                    description:
                      "Please check your email for further instructions.",
                  });
                },
              },
            });
          }}
        >
          Delete account
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}
