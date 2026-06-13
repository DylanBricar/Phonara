export type PlanLimit = {
  projects: number;
  storage: number;
  members: number;
};

export const DEFAULT_PLAN_LIMITS: PlanLimit = {
  projects: 5,
  storage: 10,
  members: 3,
};

export type OverrideLimits = Partial<PlanLimit>;
export const PLAN_LIMIT_KEYS = Object.keys(
  DEFAULT_PLAN_LIMITS,
) as (keyof PlanLimit)[];

export type BillingPlanDefinition = {
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  limits: PlanLimit;
  isPopular?: boolean;
  isHidden?: boolean;
  trialDays?: number;
  stripePriceEnv?: string;
  stripeAnnualPriceEnv?: string;
};

export const BILLING_PLANS: readonly BillingPlanDefinition[] = [
  {
    name: "free",
    description: "Get started collecting text testimonials for free",
    limits: DEFAULT_PLAN_LIMITS,
    price: 0,
    yearlyPrice: 0,
    currency: "USD",
  },
  {
    name: "pro",
    isPopular: true,
    description: "Video testimonials, custom branding, and embed widgets",
    stripePriceEnv: "STRIPE_PRO_PLAN_ID",
    stripeAnnualPriceEnv: "STRIPE_PRO_YEARLY_PLAN_ID",
    limits: {
      projects: 20,
      storage: 50,
      members: 10,
    },
    trialDays: 14,
    price: 49,
    yearlyPrice: 400,
    currency: "USD",
  },
  {
    name: "ultra",
    isPopular: false,
    description: "White-label solution with API access for large teams",
    stripePriceEnv: "STRIPE_ULTRA_PLAN_ID",
    stripeAnnualPriceEnv: "STRIPE_ULTRA_YEARLY_PLAN_ID",
    limits: {
      projects: 100,
      storage: 1000,
      members: 100,
    },
    trialDays: 14,
    price: 100,
    yearlyPrice: 1000,
    currency: "USD",
  },
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingPlanName = BillingPlan["name"];

export const FREE_PLAN_NAME = "free";
export const PAID_BILLING_PLANS = BILLING_PLANS.filter(
  (plan) => plan.price > 0,
);
export const PAID_PLAN_NAMES = PAID_BILLING_PLANS.map((plan) => plan.name);

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;
export type ActiveSubscriptionStatus =
  (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];

export function getBillingPlan(planName: string) {
  return BILLING_PLANS.find((plan) => plan.name === planName) ?? null;
}

export function getPaidBillingPlan(planName: string) {
  const plan = getBillingPlan(planName);
  return plan && plan.price > 0 ? plan : null;
}

export function getPlanPriceInCents(planName: string) {
  return (getBillingPlan(planName)?.price ?? 0) * 100;
}

export function getPlanStripePriceId(
  plan: BillingPlanDefinition,
  annual = false,
) {
  const envName = annual ? plan.stripeAnnualPriceEnv : plan.stripePriceEnv;
  return envName ? (process.env[envName] ?? "") : "";
}

export function isActiveSubscriptionStatus(
  status: string | null | undefined,
): status is ActiveSubscriptionStatus {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status as ActiveSubscriptionStatus);
}
