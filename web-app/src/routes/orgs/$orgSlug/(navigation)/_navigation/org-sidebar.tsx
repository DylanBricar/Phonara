import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarNavigationMenu } from "@/components/ui/sidebar-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangelogDebugActions } from "@/features/changelog/changelog-debug-actions";
import type { Changelog } from "@/features/changelog/changelog-manager";
import { ChangelogSidebarStack } from "@/features/changelog/changelog-sidebar-stack";
import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import type { AuthOrganization } from "@/lib/auth/auth-type";
import { ArrowLeft, Settings } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { lazy, useMemo } from "react";
import { getOrganizationNavigation } from "./org-navigation.links";

import { OrgsSelect } from "./orgs-select";
import { UpgradeCard } from "./upgrade-org-card";

const OrgCommand = lazy(async () =>
  import("./org-command").then((mod) => ({ default: mod.OrgCommand })),
);

export function OrgSidebar({
  slug,
  userOrgs,
  roles,
  changelogs,
}: {
  slug: string;
  roles: AuthRole[] | undefined;
  userOrgs: AuthOrganization[] | undefined;
  changelogs: Changelog[];
}) {
  const { pathname } = useLocation();
  const allLinks: NavigationGroup[] = getOrganizationNavigation(slug, roles);

  const isSettingsPage = pathname.includes("/settings");

  const links = useMemo(() => {
    if (isSettingsPage) {
      return allLinks.filter((group) => group.title === "Organization");
    }
    return allLinks.filter((group) => group.title === "Menu");
  }, [allLinks, isSettingsPage]);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-col gap-2">
        {isSettingsPage ? (
          <Button variant="ghost" className="justify-start" asChild>
            <Link to="/orgs/$orgSlug" params={{ orgSlug: slug }}>
              <ArrowLeft className="size-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        ) : (
          <>
            {userOrgs ? (
              <OrgsSelect orgs={userOrgs} currentOrgSlug={slug} />
            ) : (
              <Skeleton className="h-10 w-full rounded-lg" />
            )}
            <OrgCommand />
          </>
        )}
      </SidebarHeader>
      <SidebarContent className="border-card">
        {links.map((link) => (
          <SidebarGroup key={link.title}>
            <SidebarGroupLabel>{link.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarNavigationMenu link={link} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        {!isSettingsPage && (
          <>
            {changelogs.length > 0 && (
              <ChangelogSidebarStack changelogs={changelogs} />
            )}
            <ChangelogDebugActions />
            <UpgradeCard />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to="/docs"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Docs
                </Link>
                {changelogs.length === 0 && (
                  <Link
                    to="/changelog"
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                  >
                    Changelog
                  </Link>
                )}
                <Link
                  to="/legal/terms"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Terms
                </Link>
              </div>
              <Button variant="ghost" asChild size="icon" className="size-7">
                <Link to="/orgs/$orgSlug/settings" params={{ orgSlug: slug }}>
                  <Settings className="size-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
