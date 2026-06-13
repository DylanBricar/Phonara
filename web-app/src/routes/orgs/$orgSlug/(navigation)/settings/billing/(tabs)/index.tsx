import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import {
  AUTH_PLANS,
  LIMITS_CONFIG,
  type OverrideLimits,
  type PlanLimit,
  getPlanLimits,
} from "@/lib/auth/stripe/auth-plans";
import { SUBSCRIPTION_STATUS_CONFIG as STATUS_CONFIG } from "@/lib/billing/subscription-status";
import { dayjs } from "@/lib/dayjs";
import { createNoIndexHead } from "@/lib/seo";
import { useQuery } from "convex/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Billing",
      description: `Manage ${SiteConfig.title} organization billing.`,
      path: `/orgs/${params.orgSlug}/settings/billing`,
      section: "Orgs",
    }),
  component: BillingOverviewPage,
  pendingComponent: BillingOverviewSkeleton,
});

function BillingOverviewSkeleton() {
  return (
    <div className="bg-card flex flex-col rounded-xl border shadow-sm">
      <div className="flex flex-col gap-1.5 p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4 p-6 pt-0">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
      <div className="border-t p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingOverviewPage() {
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

  const planName = subscription?.plan ?? "free";
  const planLimits = getPlanLimits(
    planName,
    (subscription?.overrideLimits as OverrideLimits | null) ?? null,
  );
  const currentPlanIndex = AUTH_PLANS.findIndex(
    (plan) => plan.name === planName,
  );
  const hasUpgrades = currentPlanIndex < AUTH_PLANS.length - 1;
  const displayName = planName.charAt(0).toUpperCase() + planName.slice(1);
  const status = subscription?.status ?? null;
  const statusConfig = status
    ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    : null;
  const trialEndsAt =
    status === "trialing" && subscription?.periodEnd
      ? dayjs(subscription.periodEnd)
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{displayName} Plan</CardTitle>
          {statusConfig ? (
            <Badge variant="outline" className="gap-1.5">
              <span
                className={`${statusConfig.color} size-1.5 rounded-full`}
                aria-hidden="true"
              />
              {statusConfig.label}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Your workspace is currently using the{" "}
          <span className="text-foreground font-medium">{displayName}</span>{" "}
          plan.
          {trialEndsAt ? (
            <>
              {" "}
              Your trial ends on{" "}
              <span className="text-foreground font-medium">
                {trialEndsAt.format("LL")}
              </span>{" "}
              ({trialEndsAt.fromNow()}).
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Object.entries(planLimits).map(([key, value]) => {
          const limitKey = key as keyof PlanLimit;
          const config = LIMITS_CONFIG[limitKey];
          const Icon = config.icon;

          return (
            <Item key={key} className="p-0">
              <ItemContent>
                <div className="flex items-center gap-2">
                  <Icon className="text-muted-foreground size-4" />
                  <ItemTitle>{config.getLabel(value)}</ItemTitle>
                </div>
                <ItemDescription className="text-xs">
                  {config.description}
                </ItemDescription>
              </ItemContent>
              {hasUpgrades ? (
                <ItemActions>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/orgs/$orgSlug/settings/billing/plan"
                      params={{ orgSlug }}
                    >
                      Upgrade
                    </Link>
                  </Button>
                </ItemActions>
              ) : null}
            </Item>
          );
        })}
      </CardContent>
      <CardFooter className="justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <Typography variant="muted">
          Review your limits, usage, invoices, and available upgrades from here.
        </Typography>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              to="/orgs/$orgSlug/settings/billing/payment"
              params={{ orgSlug }}
            >
              Invoices
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link
              to="/orgs/$orgSlug/settings/billing/plan"
              params={{ orgSlug }}
            >
              Manage Plan
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
