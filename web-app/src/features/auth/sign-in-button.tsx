import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { ChevronsUpDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { UserDropdown } from "./user-dropdown";

export const SignInButton = (props: VariantProps<typeof buttonVariants>) => {
  return (
    <Link
      className={buttonVariants({ size: "sm", variant: "outline", ...props })}
      to="."
      search={(prev) => ({ ...prev, modal: "signin" })}
      mask={{ to: "/auth/signin", unmaskOnReload: true }}
    >
      Sign in
    </Link>
  );
};

export const LoggedInButton = ({
  user,
  variant = "compact",
  contentClassName,
  hideTheme,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  variant?: "compact" | "full";
  contentClassName?: string;
  hideTheme?: boolean;
}) => {
  if (variant === "full") {
    return (
      <UserDropdown contentClassName={contentClassName} hideTheme={hideTheme}>
        <Button
          variant="outline"
          className="h-12 w-full justify-start gap-3 px-3"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg">
              {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
            {user.image && <AvatarImage src={user.image} />}
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {user.name ?? user.email}
            </span>
            {user.name && (
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            )}
          </div>
          <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
        </Button>
      </UserDropdown>
    );
  }

  return (
    <UserDropdown contentClassName={contentClassName} hideTheme={hideTheme}>
      <button className="group size-9 rounded-full">
        <Avatar className="mr-2 size-full group-active:scale-95">
          <AvatarFallback className="bg-card">
            {user.email?.slice(0, 1).toUpperCase() ?? "U"}
          </AvatarFallback>
          {user.image && <AvatarImage src={user.image} />}
        </Avatar>
      </button>
    </UserDropdown>
  );
};
