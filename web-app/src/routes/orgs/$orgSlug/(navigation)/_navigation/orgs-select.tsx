import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateOrganizationLink } from "@/features/organization/create-organization-link";
import type { AuthOrganization } from "@/lib/auth/auth-type";
import { Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";

type OrganizationsSelectProps = {
  currentOrgSlug?: string;
  children?: ReactNode;
  orgs: AuthOrganization[];
};

export const OrgsSelect = (props: OrganizationsSelectProps) => {
  const org = props.orgs.find((org) => org.slug === props.currentOrgSlug);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="org-selector"
              variant="default"
              size="lg"
              className="border-input dark:bg-input/30 rounded-lg border"
            >
              {org ? (
                <span className="inline-flex w-full items-center gap-2">
                  <Avatar className="size-6 object-contain">
                    <AvatarFallback>
                      {org.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                    {org.logo ? <AvatarImage src={org.logo} /> : null}
                  </Avatar>
                  <span className="line-clamp-1 text-left">{org.name}</span>
                </span>
              ) : (
                <span>Open organization</span>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
            {org && (
              <>
                <DropdownMenuItem asChild>
                  <a
                    href={`/orgs/${org.slug}`}
                    className="group/item inline-flex w-full items-center gap-2"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback>
                        {org.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                      {org.logo ? <AvatarImage src={org.logo} /> : null}
                    </Avatar>
                    <span className="line-clamp-1 flex-1 text-left">
                      {org.name}
                    </span>
                    <a
                      href={`/orgs/${org.slug}/settings`}
                      className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 opacity-0 transition-opacity group-hover/item:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Settings className="size-4" />
                    </a>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {props.orgs
              .filter((o) => o.slug !== props.currentOrgSlug)
              .map((o) => {
                if (typeof window === "undefined") return null;

                const href = `/orgs/${o.slug}`;

                return (
                  <DropdownMenuItem key={o.slug} asChild>
                    <a
                      href={href}
                      className="group/item inline-flex w-full items-center gap-2"
                    >
                      <Avatar className="size-6">
                        <AvatarFallback>
                          {o.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                        {o.logo ? <AvatarImage src={o.logo} /> : null}
                      </Avatar>
                      <span className="line-clamp-1 flex-1 text-left">
                        {o.name}
                      </span>
                      <a
                        href={`/orgs/${o.slug}/settings`}
                        className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 opacity-0 transition-opacity group-hover/item:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="size-4" />
                      </a>
                    </a>
                  </DropdownMenuItem>
                );
              })}
            <DropdownMenuItem asChild>
              <CreateOrganizationLink>
                <Plus className="mr-2 size-4" />
                <span className="line-clamp-1 text-left">
                  Add a new organization
                </span>
              </CreateOrganizationLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
