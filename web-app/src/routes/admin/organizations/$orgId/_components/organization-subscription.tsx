import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import type {
  Subscription,
  SubscriptionDiscount,
} from "@/lib/auth/stripe/auth-plans";
import { isActiveSubscriptionStatus } from "@/lib/billing/subscription-status";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
  stripeCustomerId: string | null;
  email: string | null;
};
import { AUTH_PLANS, LIMITS_CONFIG } from "@/lib/auth/stripe/auth-plans";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/dayjs";
import {
  BadgePercent,
  Check,
  CircleDollarSign,
  ExternalLink,
  ListChecks,
  TicketPercent,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type OrganizationWithSubscription = Organization & {
  subscription: Subscription | null;
};

type BillingCycle = "monthly" | "yearly";
type DiscountMode = "none" | "admin_free" | "custom";
const billingCycleParser = parseAsStringLiteral(["monthly", "yearly"]);

const STATUS_CONFIG = {
  active: { color: "bg-emerald-500", label: "Active" },
  trialing: { color: "bg-amber-500", label: "Trial" },
  past_due: { color: "bg-red-500", label: "Past Due" },
  canceled: { color: "bg-zinc-400", label: "Canceled" },
} as const;

const ADMIN_FREE_COUPON_ID = "nowstack_admin_100_off";

const formatCurrencyFromCents = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);

const formatDiscountValue = (discount: SubscriptionDiscount) => {
  if (typeof discount.percentOff === "number") {
    return `${discount.percentOff}% off`;
  }

  if (typeof discount.amountOff === "number") {
    return `${formatCurrencyFromCents(discount.amountOff, discount.currency)} off`;
  }

  return "Coupon applied";
};

const formatDiscountDuration = (duration: string | undefined) => {
  if (duration === "forever") return "Forever";
  if (duration === "once") return "Once";
  if (duration === "repeating") return "Repeating";
  return "Active discount";
};

export function OrganizationSubscription({
  organization,
  subscription,
}: {
  organization: OrganizationWithSubscription;
  subscription: Subscription | null;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateSubscriptionPlan = useAction(
    api.admin.billing.updateSubscriptionPlan,
  );
  const createSubscription = useAction(api.admin.billing.createSubscription);
  const cancelSubscription = useAction(api.admin.billing.cancelSubscription);
  const reactivateSubscription = useAction(
    api.admin.billing.reactivateSubscription,
  );

  const detectBillingCycle = (): BillingCycle => {
    if (!subscription?.periodEnd || !subscription.periodStart) return "monthly";
    const periodStart = new Date(subscription.periodStart);
    const periodEnd = new Date(subscription.periodEnd);
    const monthsDiff =
      (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
      (periodEnd.getMonth() - periodStart.getMonth());
    return monthsDiff >= 11 ? "yearly" : "monthly";
  };

  const detectedBillingCycle = detectBillingCycle();
  const [billingCycleParam, setBillingCycleParam] = useQueryState(
    "billingCycle",
    billingCycleParser,
  );
  const billingCycle = billingCycleParam ?? detectedBillingCycle;
  const [selectedPlan, setSelectedPlan] = useState<string>(
    subscription?.plan ?? "free",
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [couponCode, setCouponCode] = useState("");

  const currentPlan = AUTH_PLANS.find(
    (plan) => plan.name === subscription?.plan,
  );
  const isActive = isActiveSubscriptionStatus(subscription?.status);
  const inferredAdminFreeDiscount: SubscriptionDiscount | null =
    subscription &&
    subscription.plan !== "free" &&
    isActive &&
    !subscription.stripeSubscriptionId
      ? {
          mode: "admin_free",
          couponId: ADMIN_FREE_COUPON_ID,
          couponName: "Admin free access",
          percentOff: 100,
          duration: "forever",
        }
      : null;
  const activeDiscount = subscription?.discount ?? inferredAdminFreeDiscount;
  const hasFullDiscount = activeDiscount?.percentOff === 100;
  const currentPrice =
    currentPlan && detectedBillingCycle === "yearly"
      ? currentPlan.yearlyPrice
      : currentPlan?.price;
  const status = subscription?.status;
  const statusConfig =
    status && status in STATUS_CONFIG
      ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
      : null;

  const hasChanges =
    selectedPlan !== (subscription?.plan ?? "free") ||
    Boolean(subscription && billingCycle !== detectBillingCycle());
  const isPaidPlanSelected = selectedPlan !== "free";
  const customCouponCode = couponCode.trim();
  const hasDiscount =
    isPaidPlanSelected &&
    (discountMode === "admin_free" ||
      (discountMode === "custom" && customCouponCode.length > 0));

  const handlePlanUpdate = async () => {
    if (!hasChanges && !hasDiscount) return;

    setIsUpdating(true);
    try {
      const isYearly = billingCycle === "yearly";
      const discountArgs =
        isPaidPlanSelected && discountMode !== "none"
          ? {
              discountMode,
              ...(discountMode === "custom" && customCouponCode
                ? { couponCode: customCouponCode }
                : {}),
            }
          : {};

      if (!subscription && selectedPlan !== "free") {
        await createSubscription({
          organizationId: organization.id,
          planName: selectedPlan,
          isYearly,
          ...discountArgs,
        });
      } else if (subscription) {
        await updateSubscriptionPlan({
          organizationId: organization.id,
          planName: selectedPlan,
          isYearly,
          ...discountArgs,
        });
      }
      setCouponCode("");
      setDiscountMode("none");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription) return;

    dialogManager.confirm({
      title: "Cancel Subscription",
      description:
        "The organization will lose access at the end of the billing period.",
      variant: "destructive",
      action: {
        label: "Cancel Subscription",
        variant: "destructive",
        onClick: async () => {
          setIsUpdating(true);
          try {
            await cancelSubscription({ organizationId: organization.id });
          } finally {
            setIsUpdating(false);
          }
        },
      },
    });
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;

    setIsUpdating(true);
    try {
      await reactivateSubscription({ organizationId: organization.id });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="border-border/70 border shadow-sm">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Review and update the billing plan for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Typography variant="h3" className="capitalize">
              {currentPlan?.name ?? "Free"} Plan
            </Typography>
            {subscription?.status ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn("size-1.5 rounded-full", statusConfig?.color)}
                />
                <Typography variant="muted" className="text-xs">
                  {statusConfig?.label ?? subscription.status}
                </Typography>
              </div>
            ) : null}
          </div>

          {subscription?.periodEnd && (
            <Typography variant="muted" className="text-xs">
              {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
              {dayjs(subscription.periodEnd).format("MMM DD, YYYY")}
            </Typography>
          )}
        </div>

        {subscription?.stripeSubscriptionId && (
          <Button variant="outline" size="sm" className="h-7" asChild>
            <a
              href={`https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 size-3" />
              Stripe
            </a>
          </Button>
        )}

        {subscription && currentPlan && (
          <div className="border-border/70 bg-muted/20 grid gap-3 rounded-lg border p-3 md:grid-cols-3">
            <div className="flex gap-3">
              <ListChecks className="text-muted-foreground mt-0.5 size-4" />
              <div className="min-w-0">
                <Typography variant="small">Plan benefits</Typography>
                <div className="text-muted-foreground mt-2 flex flex-col gap-1 text-xs">
                  {(
                    Object.keys(LIMITS_CONFIG) as (keyof typeof LIMITS_CONFIG)[]
                  ).map((key) => {
                    const value = currentPlan.limits[key];
                    const config = LIMITS_CONFIG[key];
                    return <span key={key}>{config.getLabel(value)}</span>;
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <TicketPercent className="text-muted-foreground mt-0.5 size-4" />
              <div className="min-w-0">
                <Typography variant="small">Coupon</Typography>
                {activeDiscount ? (
                  <div className="mt-2 flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {activeDiscount.couponName ??
                        activeDiscount.couponId ??
                        "Subscription discount"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDiscountValue(activeDiscount)} ·{" "}
                      {formatDiscountDuration(activeDiscount.duration)}
                    </span>
                    {activeDiscount.couponId && (
                      <code className="text-muted-foreground truncate font-mono text-xs">
                        {activeDiscount.couponId}
                      </code>
                    )}
                  </div>
                ) : (
                  <Typography variant="muted" className="mt-2 text-xs">
                    No coupon applied.
                  </Typography>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <CircleDollarSign className="text-muted-foreground mt-0.5 size-4" />
              <div className="min-w-0">
                <Typography variant="small">Billing</Typography>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {hasFullDiscount ? "$0" : `$${currentPrice ?? 0}`} /
                    {detectedBillingCycle === "yearly" ? "yr" : "mo"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {hasFullDiscount
                      ? "100% covered by coupon"
                      : "Standard plan price"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <Typography variant="large">Change Plan</Typography>
            <Tabs
              value={billingCycle}
              onValueChange={(value) => {
                const nextCycle = value as BillingCycle;
                void setBillingCycleParam(
                  nextCycle === detectedBillingCycle ? null : nextCycle,
                );
              }}
            >
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {AUTH_PLANS.filter((p) => !p.isHidden).map((plan) => {
              const price =
                billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
              const isSelected = selectedPlan === plan.name;
              const isCurrent = subscription?.plan === plan.name;

              return (
                <button
                  key={plan.name}
                  type="button"
                  onClick={() => setSelectedPlan(plan.name)}
                  disabled={isUpdating}
                  className={cn(
                    "border-border/70 bg-card relative flex min-h-36 flex-col rounded-lg border p-3 text-left transition-colors",
                    "hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
                    isSelected && "border-primary bg-primary/10 shadow-sm",
                  )}
                >
                  {isCurrent && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2 text-[10px]"
                    >
                      Current
                    </Badge>
                  )}

                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium capitalize">{plan.name}</span>
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {isSelected && <Check className="size-2.5" />}
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-xl font-semibold">${price ?? 0}</span>
                    <span className="text-muted-foreground text-xs">
                      /{billingCycle === "yearly" ? "yr" : "mo"}
                    </span>
                  </div>

                  <div className="text-muted-foreground space-y-0.5 text-xs">
                    {(
                      Object.keys(
                        LIMITS_CONFIG,
                      ) as (keyof typeof LIMITS_CONFIG)[]
                    ).map((key) => {
                      const value = plan.limits[key];
                      const config = LIMITS_CONFIG[key];
                      return <div key={key}>{config.getLabel(value)}</div>;
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin discount */}
          <div className="border-border/70 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <TicketPercent className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <Typography variant="small">Admin discount</Typography>
                  <Typography variant="muted" className="text-xs">
                    Optional discount for this subscription update.
                  </Typography>
                </div>
              </div>

              <ToggleGroup
                value={discountMode === "none" ? [] : [discountMode]}
                onValueChange={(value) => setDiscountMode(value[0] ?? "none")}
                disabled={!isPaidPlanSelected || isUpdating}
                className="grid w-full grid-cols-2 sm:w-fit"
              >
                <Toggle
                  value="admin_free"
                  variant="outline"
                  size="default"
                  disabled={!isPaidPlanSelected || isUpdating}
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 justify-center border-transparent px-3 data-[state=on]:shadow-sm"
                >
                  <BadgePercent className="size-3.5" />
                  Free (100% discount)
                </Toggle>
                <Toggle
                  value="custom"
                  variant="outline"
                  size="default"
                  disabled={!isPaidPlanSelected || isUpdating}
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 justify-center border-transparent px-3 data-[state=on]:shadow-sm"
                >
                  Custom
                </Toggle>
              </ToggleGroup>
            </div>

            {discountMode === "custom" && isPaidPlanSelected && (
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="h-8 max-w-sm text-sm"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {subscription && isActive && !subscription.cancelAtPeriodEnd && (
                <Button
                  onClick={handleCancelSubscription}
                  disabled={isUpdating}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <Button
                  onClick={handleReactivateSubscription}
                  disabled={isUpdating}
                  variant="outline"
                  size="sm"
                >
                  Reactivate
                </Button>
              )}
            </div>

            <Button
              onClick={handlePlanUpdate}
              disabled={isUpdating || (!hasChanges && !hasDiscount)}
              size="sm"
              className="justify-center sm:min-w-28"
            >
              {isUpdating
                ? "Updating..."
                : !subscription && selectedPlan !== "free"
                  ? "Create"
                  : "Apply"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
