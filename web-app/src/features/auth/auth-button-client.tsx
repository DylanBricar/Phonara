import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { useSession } from "@/lib/auth-client";
import { LoggedInButton, SignInButton } from "./sign-in-button";

export const AuthButtonClient = ({
  variant = "compact",
  contentClassName,
  hideTheme,
}: {
  variant?: "compact" | "full";
  contentClassName?: string;
  hideTheme?: boolean;
}) => {
  const isClient = useIsClient();
  const session = useSession();

  if (!isClient || session.isPending) {
    return variant === "full" ? (
      <Skeleton className="h-12 w-full rounded-lg" />
    ) : (
      <Skeleton className="size-9 rounded-full" />
    );
  }

  if (session.data?.user) {
    const user = session.data.user;
    return (
      <LoggedInButton
        user={user}
        variant={variant}
        contentClassName={contentClassName}
        hideTheme={hideTheme}
      />
    );
  }

  return <SignInButton />;
};
