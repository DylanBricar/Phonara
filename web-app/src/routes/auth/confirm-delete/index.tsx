import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { getClientErrorMessage } from "@/lib/errors/client-error-message";
import { unwrapSafePromise } from "@/lib/promises";
import { SiteConfig } from "@/site-config";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth/confirm-delete/")({
  validateSearch: z.object({
    token: z.string().optional(),
    callbackUrl: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Confirm Account Deletion | ${SiteConfig.title}` },
      {
        name: "description",
        content:
          "Confirm that you want to permanently delete your account and all associated data.",
      },
    ],
  }),
  component: ConfirmDeleteRoute,
  pendingComponent: ConfirmDeleteSkeleton,
});

function ConfirmDeleteSkeleton() {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader>
        <div className="flex justify-center">
          <Skeleton className="size-16 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="mt-4">
        <div className="flex w-full gap-4">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmDeleteRoute() {
  const { token, callbackUrl } = Route.useSearch();

  return (
    <Suspense fallback={null}>
      <ConfirmDeletePage token={token} callbackUrl={callbackUrl} />
    </Suspense>
  );
}

function ConfirmDeletePage({
  token,
  callbackUrl = "/auth/goodbye",
}: {
  token?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDeleteMutation = useQueryMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Invalid token");
      }
      return unwrapSafePromise(
        authClient.deleteUser({
          token,
        }),
      );
    },
    onError: (error) => {
      const message = getClientErrorMessage(
        error,
        "Failed to confirm account deletion",
      );
      setError(message);
      toast.error(message);
    },
    onSuccess: () => {
      void router.navigate({ to: callbackUrl });
    },
  });

  const handleConfirmDelete = () => {
    setIsLoading(true);
    confirmDeleteMutation.mutate();
  };

  const handleCancel = () => {
    void router.navigate({ to: "/account" });
  };

  if (!token) {
    void router.navigate({ to: "/account" });
    return null;
  }

  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader>
        <div className="flex justify-center">
          <Avatar className="size-16">
            <AvatarFallback>
              <Trash2 />
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-center">Confirm Account Deletion</CardTitle>

        <CardDescription className="text-center">
          Are you sure you want to delete your account? This action is permanent
          and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        {error && <div className="mb-4 text-red-500">{error}</div>}
        <div className="flex w-full gap-4">
          <LoadingButton
            loading={isLoading || confirmDeleteMutation.isPending}
            variant="destructive"
            onClick={handleConfirmDelete}
            className="flex-1"
          >
            Yes, Delete My Account
          </LoadingButton>
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
