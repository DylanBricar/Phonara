import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Changelog } from "@/features/changelog/changelog-manager";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import type { AuthOrganization } from "@/lib/auth/auth-type";
import type { PropsWithChildren } from "react";
import { FeedbackButton } from "./feedback-button";
import OrgBreadcrumb from "./org-breadcrumb";
import { OrgSidebar } from "./org-sidebar";

type OrgNavigationProps = PropsWithChildren<{
  slug: string;
  memberRoles: AuthRole[] | undefined;
  userOrganizations: AuthOrganization[] | undefined;
  changelogs: Changelog[];
}>;

export function OrgNavigation({
  children,
  slug,
  memberRoles,
  userOrganizations,
  changelogs,
}: OrgNavigationProps) {
  return (
    <SidebarProvider>
      <OrgSidebar
        slug={slug}
        roles={memberRoles}
        userOrgs={userOrganizations}
        changelogs={changelogs}
      />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger
                variant="outline"
                className="size-8 cursor-pointer"
              />
              <OrgBreadcrumb />
            </div>
            <FeedbackButton />
          </div>
        </header>
        <div className="m-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
