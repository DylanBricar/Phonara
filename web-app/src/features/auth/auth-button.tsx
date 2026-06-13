import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { useSession } from "@/lib/auth-client";
import { LoggedInButton, SignInButton } from "./sign-in-button";

export const AuthButton = () => {
  const isClient = useIsClient();
  const session = useSession();

  if (!isClient || session.isPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (session.data?.user) {
    return <LoggedInButton user={session.data.user} />;
  }

  return <SignInButton />;
};
