import { Skeleton } from "@/components/ui/skeleton";
import { dayjs } from "@/lib/dayjs";
import {
  getPlanLimits,
  type OverrideLimits,
} from "@/lib/auth/stripe/auth-plans";
import { createNoIndexHead } from "@/lib/seo";
import { UsageChart } from "./_components/usage-chart";
import { useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/usage/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Usage",
      description: `Review ${SiteConfig.title} organization usage.`,
      path: `/orgs/${params.orgSlug}/settings/billing/usage`,
      section: "Orgs",
    }),
  component: UsagePage,
  pendingComponent: UsageSkeleton,
});

function UsageSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-6 rounded-xl border p-6 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    </div>
  );
}

function UsagePage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getFullOrganization, {
    organizationSlug: orgSlug,
  });

  const subscription = useQuery(
    api.subscriptions.queries.getActiveByOrganization,
    org?.id ? { organizationId: org.id } : "skip",
  );

  if (org === undefined || (org && subscription === undefined)) return null;
  if (!org) return null;

  const billingPeriodStart = subscription?.periodStart
    ? dayjs(subscription.periodStart)
    : dayjs().subtract(30, "day");
  const billingPeriodEnd = subscription?.periodEnd
    ? dayjs(subscription.periodEnd)
    : billingPeriodStart.add(30, "day");
  const planLimits = getPlanLimits(
    subscription?.plan ?? "free",
    (subscription?.overrideLimits as OverrideLimits | null) ?? null,
  );

  const metrics = [
    {
      label: "Team members",
      current: org.members.length,
      limit: planLimits.members,
      description: "Tracked live from your workspace membership.",
      isTracked: true,
    },
    {
      label: "Testimonial forms",
      current: 0,
      limit: planLimits.projects,
      description:
        "Limit is enforced now. Live form usage will appear here once forms are stored in Convex.",
      isTracked: false,
    },
    {
      label: "Video storage",
      current: 0,
      limit: planLimits.storage,
      unit: "GB",
      description:
        "Limit is available now. Live storage usage will appear here once uploads are tracked.",
      isTracked: false,
    },
  ];

  return (
    <UsageChart
      metrics={metrics}
      billingPeriodStart={billingPeriodStart.toDate()}
      billingPeriodEnd={billingPeriodEnd.toDate()}
      subscriptionStatus={subscription?.status ?? null}
    />
  );
}
