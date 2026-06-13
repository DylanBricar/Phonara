import { Skeleton } from "@/components/ui/skeleton";
import { BillingTabsNav } from "../_components/billing-tabs-nav";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/(tabs)",
)({
  component: BillingTabsLayout,
  pendingComponent: BillingTabsSkeleton,
});

function BillingTabsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function BillingTabsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <BillingTabsNav />

      <Outlet />
    </div>
  );
}
