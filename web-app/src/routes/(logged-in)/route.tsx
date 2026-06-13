import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/(logged-in)")({
  head: () =>
    createNoIndexHead({
      title: "Account",
      description: `Authenticated ${SiteConfig.title} account workspace.`,
      path: "/account",
    }),
  component: LoggedInLayout,
  pendingComponent: LoggedInLayoutSkeleton,
});

function LoggedInLayout() {
  const session = useSession();

  if (session.isPending) return <LoggedInLayoutSkeleton />;
  if (!session.data?.user) return <Navigate to="/auth/signin" replace />;

  return <Outlet />;
}

function LoggedInLayoutSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="size-8 rounded-md" />
    </div>
  );
}
