import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/features/form/submit-button";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { openExternalUrl } from "@/lib/navigation/open-external-url";
import { AUTH_PLANS, getPlanFeatures } from "@/lib/auth/stripe/auth-plans";
import { SUBSCRIPTION_STATUS_CONFIG as STATUS_CONFIG } from "@/lib/billing/subscription-status";
import { createNoIndexHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SimplePricingCard } from "../_components/simple-pricing-card";
import { PlanCardAction } from "./_components/plan-card-action";
import { Check } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { toastClientError } from "@/lib/errors/client-error-message";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/plan/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Plans",
      description: `Manage the ${SiteConfig.title} organization plan.`,
      path: `/orgs/${params.orgSlug}/settings/billing/plan`,
      section: "Orgs",
    }),
  component: PlanPage,
  pendingComponent: PlanSkeleton,
});

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm lg:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-36" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function PlanPage() {
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

  const currentPlanName = subscription?.plan ?? "free";
  const status = subscription?.status ?? null;

  const statusConfig = status
    ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    : null;

  const currentPlan =
    AUTH_PLANS.find((p) => p.name === currentPlanName) ?? AUTH_PLANS[0];
  const currentPrice = currentPlan.price;

  const otherPlans = AUTH_PLANS.filter(
    (plan) => !plan.isHidden && plan.name !== currentPlanName,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 lg:flex-row">
        <CardHeader className="h-full flex-1 items-start">
          <div className="flex items-center gap-2">
            <CardTitle>
              {currentPlan.name
                ? currentPlan.name.charAt(0).toUpperCase() +
                  currentPlan.name.slice(1)
                : "Current Plan"}
            </CardTitle>
            {statusConfig && (
              <Badge variant="outline" className="gap-1.5">
                <span
                  className={cn("size-1.5 rounded-full", statusConfig.color)}
                  aria-hidden="true"
                ></span>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          {subscription ? (
            <ManagePlanButton />
          ) : (
            <Button disabled>Current plan</Button>
          )}
        </CardHeader>
        <CardContent className="flex-2">
          <ul className="grid grid-cols-1 md:grid-cols-2">
            {getPlanFeatures(currentPlan).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="text-primary size-5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {otherPlans.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <Typography variant="h3" className="font-semibold">
              Available Plans
            </Typography>
            <Typography variant="muted" className="mt-1">
              Manage your subscription
            </Typography>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {otherPlans.map((plan) => {
              const isUpgrade = plan.price > currentPrice;
              const isDowngrade = plan.price < currentPrice;
              const features = getPlanFeatures(plan);
              const ctaLabel = isUpgrade
                ? "Upgrade"
                : isDowngrade
                  ? "Downgrade"
                  : "Change Plan";

              return (
                <SimplePricingCard
                  key={plan.name}
                  title={plan.name}
                  price={`$${plan.price}`}
                  period="month"
                  features={features}
                  action={
                    <PlanCardAction
                      label={ctaLabel}
                      currentPlan={currentPlanName}
                      targetPlan={plan.name}
                    />
                  }
                  className={
                    plan.isPopular ? "border-primary shadow-md" : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ManagePlanButton() {
  const activeOrg = useCurrentOrg();
  const createBillingPortal = useAction(
    api.stripe.actions.createOrganizationBillingPortal,
  );
  const mutation = useQueryMutation({
    mutationFn: async () => {
      if (!activeOrg) throw new Error("No active organization");
      return createBillingPortal({
        organizationSlug: activeOrg.slug,
        returnUrl: `/orgs/${activeOrg.slug}/settings/billing`,
      });
    },
    onSuccess: (result) => {
      if (result.url) openExternalUrl(result.url);
    },
    onError: (error) => {
      toastClientError(error, "Failed to open billing portal");
    },
  });

  return (
    <LoadingButton
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
    >
      Manage plan
    </LoadingButton>
  );
}
