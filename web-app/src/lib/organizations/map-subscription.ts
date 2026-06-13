import type { Doc } from "@convex/_generated/dataModel";
import type {
  OverrideLimits,
  SubscriptionDiscount,
} from "@/lib/auth/stripe/auth-plans";
import { getPlanLimits } from "@/lib/auth/stripe/auth-plans";

export function mapSubscription(raw: Doc<"subscriptions">) {
  const overrideLimits = (raw.overrideLimits as OverrideLimits | null) ?? null;
  const discount = (raw.discount as SubscriptionDiscount | null) ?? null;

  return {
    id: raw._id,
    referenceId: raw.organizationId,
    plan: raw.plan,
    status: raw.status ?? null,
    periodStart: raw.periodStart ?? null,
    periodEnd: raw.periodEnd ?? null,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd ?? null,
    stripeSubscriptionId: raw.stripeSubscriptionId ?? null,
    stripeCustomerId: raw.stripeCustomerId ?? null,
    discount,
    overrideLimits: overrideLimits as Record<
      string,
      Record<string, number>
    > | null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    limits: getPlanLimits(raw.plan, overrideLimits),
  };
}
