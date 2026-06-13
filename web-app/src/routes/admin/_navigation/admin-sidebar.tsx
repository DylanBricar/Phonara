import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarNavigationMenu } from "@/components/ui/sidebar-utils";
import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import { SiteConfig } from "@/site-config";
import { ChevronDown, Building2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { getAdminNavigation } from "./admin-navigation.links";

export function AdminSidebar() {
  const links: NavigationGroup[] = getAdminNavigation();

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-sm font-semibold">Admin</span>
          <span className="text-muted-foreground text-sm">
            {SiteConfig.title}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {links.map((link) => (
          <ItemCollapsing
            defaultOpenStartPath={link.defaultOpenStartPath}
            key={link.title}
          >
            <SidebarGroup key={link.title}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  {link.title}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarNavigationMenu link={link} />
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </ItemCollapsing>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <SidebarMenuButton asChild variant="outline" className="h-10 border">
          <Link to="/orgs">
            <Building2 className="size-4" />
            <span>Organization</span>
          </Link>
        </SidebarMenuButton>
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

const ItemCollapsing = (
  props: PropsWithChildren<{ defaultOpenStartPath?: string }>,
) => {
  const { pathname } = useLocation();

  const isOpen = props.defaultOpenStartPath
    ? pathname.startsWith(props.defaultOpenStartPath)
    : true;

  const [open, setOpen] = useState(isOpen);

  return (
    <Collapsible
      defaultOpen={isOpen}
      onOpenChange={setOpen}
      open={open || isOpen}
      className="group/collapsible"
    >
      {props.children}
    </Collapsible>
  );
};
