import { AppLogoMark } from "@/components/nowts/app-logo-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteConfig } from "@/site-config";
import { useLocation, useRouter, useSearch } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { SignInProviders } from "@/routes/auth/signin/sign-in-providers";

export function SignInDialog() {
  const search = useSearch({ strict: false }) as { modal?: string };
  const location = useLocation();
  const router = useRouter();
  const isOpen = search.modal === "signin";
  const providers = useQuery(
    api.auth.queries.getAvailableSocialProviders,
    isOpen ? {} : "skip",
  );

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
      <DialogContent className="dark sm:max-w-md lg:max-w-lg lg:p-8">
        <DialogHeader className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <AppLogoMark />
            <DialogTitle className="text-lg">{SiteConfig.title}</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            Please sign in to your account to continue.
          </DialogDescription>
        </DialogHeader>
        {providers ? (
          <SignInProviders providers={providers} callbackUrl="/orgs" />
        ) : (
          <SignInDialogSkeleton />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SignInDialogSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="mx-auto h-3 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-6" />
        <Skeleton className="h-px flex-1" />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
