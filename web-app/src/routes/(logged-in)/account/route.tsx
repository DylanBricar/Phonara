import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LoadingButton } from "@/features/form/submit-button";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { signOut } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { AccountSidebar } from "./account-sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { toastClientError } from "@/lib/errors/client-error-message";

export const Route = createFileRoute("/(logged-in)/account")({
  component: AccountLayout,
  pendingComponent: AccountLayoutSkeleton,
});

function AccountLayoutSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <Skeleton className="h-10 w-full rounded-lg" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-16" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-12" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Skeleton className="h-9 w-full rounded-md" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Skeleton className="h-8 w-28" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AccountLayout() {
  const userOrganizations = useQuery(api.auth.queries.listOrganizations, {});

  const signOutMutation = useQueryMutation({
    mutationFn: async () => unwrapSafePromise(signOut()),
    onSuccess: () => {
      window.location.assign("/auth/signin");
    },
    onError: (error) => {
      toastClientError(error, "Failed to sign out");
    },
  });

  if (userOrganizations === undefined) return <AccountLayoutSkeleton />;

  return (
    <SidebarProvider>
      <AccountSidebar userOrgs={userOrganizations} />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <LoadingButton
              variant="outline"
              size="sm"
              loading={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              Sign out
            </LoadingButton>
          </div>
        </header>
        <div className="m-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 pt-0">
          <Layout size="lg" className="m-0 mt-0 max-w-none px-0">
            <LayoutHeader>
              <LayoutTitle>Settings</LayoutTitle>
            </LayoutHeader>
            <LayoutContent>
              <Outlet />
            </LayoutContent>
          </Layout>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
