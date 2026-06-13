import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SidebarMenuButtonProps } from "@/components/ui/sidebar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

const findBestMatch = (pathname: string, hrefs: string[]): string | null => {
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, current) =>
    current.length > best.length ? current : best,
  );
};

const SidebarMenuButtonLinkWithActive = ({
  href,
  isActive,
  children,
  ...props
}: SidebarMenuButtonProps & { href: string; isActive: boolean }) => {
  return (
    <SidebarMenuButton {...props} asChild isActive={isActive}>
      <Link to={href as "/"}>{children}</Link>
    </SidebarMenuButton>
  );
};

export const SidebarMenuButtonLink = ({
  href,
  children,
  ...props
}: SidebarMenuButtonProps & { href: string }) => {
  const { pathname } = useLocation();

  return (
    <SidebarMenuButton {...props} asChild isActive={pathname === href}>
      <Link to={href as "/"}>{children}</Link>
    </SidebarMenuButton>
  );
};

export const SidebarSubButtonLink = ({
  href,
  children,
  ...props
}: ComponentProps<typeof SidebarMenuSubButton> & { href: string }) => {
  const { pathname } = useLocation();

  return (
    <SidebarMenuSubButton {...props} asChild isActive={pathname === href}>
      <Link to={href as "/"}>{children}</Link>
    </SidebarMenuSubButton>
  );
};

export const SidebarNavigationMenu = (props: { link: NavigationGroup }) => {
  const { link } = props;
  const { pathname } = useLocation();

  const allHrefs = link.links.flatMap((item) =>
    item.links
      ? [item.href, ...item.links.map((sub) => sub.href)]
      : [item.href],
  );
  const bestMatch = findBestMatch(pathname, allHrefs);

  return (
    <SidebarMenu>
      {link.links.map((item) => {
        if (item.links) {
          return (
            <Collapsible
              defaultOpen
              key={item.label}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <SidebarMenuButtonLinkWithActive
                  href={item.href}
                  isActive={bestMatch === item.href}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                  <CollapsibleTrigger className="ml-auto">
                    <ChevronRight className="text-muted-foreground ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarMenuButtonLinkWithActive>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.links.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.label}>
                        <SidebarSubButtonLink href={subItem.href}>
                          <subItem.Icon />
                          <span>{subItem.label}</span>
                        </SidebarSubButtonLink>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButtonLinkWithActive
              href={item.href}
              isActive={bestMatch === item.href}
            >
              <item.Icon />
              <span>{item.label}</span>
            </SidebarMenuButtonLinkWithActive>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
