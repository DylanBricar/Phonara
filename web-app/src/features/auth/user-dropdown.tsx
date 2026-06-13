import { Typography } from "@/components/nowts/typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Monitor,
  Moon,
  Settings,
  Shield,
  SunMedium,
  SunMoon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { UserDropdownLogout } from "./user-dropdown-logout";
import { UserDropdownStopImpersonating } from "./user-dropdown-stop-impersonating";

type UserDropdownProps = PropsWithChildren<{
  contentClassName?: string;
  hideTheme?: boolean;
}>;

export const UserDropdown = ({
  children,
  contentClassName,
  hideTheme = false,
}: UserDropdownProps) => {
  const session = useSession();
  const theme = useTheme();

  if (!session.data?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className={cn("w-56", contentClassName)}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            {session.data.user.name ? (
              <div className="flex min-w-0 flex-col gap-1">
                <Typography
                  variant="small"
                  className="cursor-text truncate leading-snug select-all"
                >
                  {session.data.user.name || session.data.user.email}
                </Typography>
                <Typography
                  variant="muted"
                  className="cursor-text truncate leading-snug select-all"
                >
                  {session.data.user.email}
                </Typography>
              </div>
            ) : (
              <Typography
                variant="small"
                className="cursor-text truncate leading-snug select-all"
              >
                {session.data.user.email}
              </Typography>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/orgs">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account">
            <Settings className="mr-2 size-4" />
            Account
          </Link>
        </DropdownMenuItem>
        {session.data.user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield className="mr-2 size-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        {hideTheme ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SunMoon className="mr-2 size-4" />
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className={contentClassName}>
                  <DropdownMenuItem onClick={() => theme.setTheme("dark")}>
                    <SunMedium className="mr-2 size-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => theme.setTheme("light")}>
                    <Moon className="mr-2 size-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => theme.setTheme("system")}>
                    <Monitor className="mr-2 size-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <UserDropdownLogout />
          {session.data.session.impersonatedBy ? (
            <UserDropdownStopImpersonating />
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
