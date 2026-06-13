import { Skeleton } from "@/components/ui/skeleton";
import { CancelSubscriptionForm } from "./cancel-form";
import { createNoIndexHead } from "@/lib/seo";
import { useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/cancel/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Cancel Subscription",
      description: `Cancel a ${SiteConfig.title} organization subscription.`,
      path: `/orgs/${params.orgSlug}/settings/billing/cancel`,
      section: "Orgs",
    }),
  component: CancelPage,
  pendingComponent: CancelSkeleton,
});

function CancelSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="flex flex-col gap-1.5 px-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3 px-6">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
      <div className="border-t pt-6">
        <div className="flex items-center justify-end px-6">
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function CancelPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getFullOrganization, {
    organizationSlug: orgSlug,
  });

  if (org === undefined) return null;
  if (!org) return null;

  return <CancelSubscriptionForm orgId={org.id} orgSlug={org.slug} />;
}
