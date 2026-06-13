import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/success/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Payment Successful",
      description: `${SiteConfig.title} organization subscription payment succeeded.`,
      path: `/orgs/${params.orgSlug}/settings/billing/success`,
      section: "Orgs",
    }),
  component: () => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-bold">Payment Successful</h1>
      <p className="text-muted-foreground">
        Your subscription has been updated. Thank you for your purchase.
      </p>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  ),
});
