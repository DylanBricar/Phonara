import { logger } from "@/lib/logger";
import {
  BILLING_PLANS,
  DEFAULT_PLAN_LIMITS,
  PLAN_LIMIT_KEYS,
  type OverrideLimits,
  type PlanLimit,
} from "@convex/billing/plans";
import {
  Code,
  FolderArchive,
  HardDrive,
  Paintbrush,
  Palette,
  Users,
  Video,
} from "lucide-react";
import { SiteConfig } from "@/site-config";

export { PLAN_LIMIT_KEYS };
export type { OverrideLimits, PlanLimit };

export type SubscriptionDiscount = {
  mode: "admin_free" | "custom" | "stripe";
  couponId?: string;
  couponName?: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: string;
};

export type Subscription = {
  id: string;
  referenceId: string;
  plan: string;
  organizationId?: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  seats: number | null;
  discount: SubscriptionDiscount | null;
  overrideLimits: OverrideLimits | null;
  createdAt: number;
  updatedAt: number;
};

type HookCtx = {
  req: Request;
  organizationId: string;
  stripeCustomerId: string;
  subscriptionId: string;
};

export type AppAuthPlan = {
  priceId?: string | undefined;
  lookupKey?: string | undefined;
  annualDiscountPriceId?: string | undefined;
  annualDiscountLookupKey?: string | undefined;
  name: string;
  limits?: Record<string, number> | undefined;
  group?: string;
  freeTrial?: {
    days: number;
    onTrialStart?: (subscription: Subscription, ctx: HookCtx) => Promise<void>;
    onTrialEnd?: (
      data: {
        subscription: Subscription;
      },
      ctx: HookCtx,
    ) => Promise<void>;
    onTrialExpired?: (
      subscription: Subscription,
      ctx: HookCtx,
    ) => Promise<void>;
  };
  onSubscriptionCanceled?: (
    subscription: Subscription,
    ctx: HookCtx,
  ) => Promise<void>;
} & {
  description: string;
  isPopular?: boolean;
  price: number;
  yearlyPrice?: number;
  currency: string;
  isHidden?: boolean;
  limits: PlanLimit;
};

type RuntimeImportMeta = {
  env?: Record<string, boolean | string | undefined>;
};

const getRuntimeEnvValue = (key: string) => {
  const viteValue = (import.meta as unknown as RuntimeImportMeta).env?.[key];
  if (typeof viteValue === "string") return viteValue;

  if (typeof process !== "undefined") {
    return process.env[key] ?? "";
  }

  return "";
};

export const AUTH_PLANS: AppAuthPlan[] = BILLING_PLANS.map((plan) => ({
  ...plan,
  priceId: plan.stripePriceEnv
    ? getRuntimeEnvValue(plan.stripePriceEnv)
    : undefined,
  annualDiscountPriceId: plan.stripeAnnualPriceEnv
    ? getRuntimeEnvValue(plan.stripeAnnualPriceEnv)
    : undefined,
  freeTrial: plan.trialDays
    ? {
        days: plan.trialDays,
        onTrialStart:
          plan.name === "pro"
            ? async (subscription) => {
                logger.debug(`Welcome email sent to ${subscription}`);
              }
            : undefined,
        onTrialExpired:
          plan.name === "pro"
            ? async (subscription) => {
                logger.debug(`Trial expired for ${subscription}`);
              }
            : undefined,
        onTrialEnd:
          plan.name === "pro"
            ? async (subscription) => {
                logger.debug(`Trial ended for ${subscription}`);
              }
            : undefined,
      }
    : undefined,
}));

// Limits transformation object
export const LIMITS_CONFIG: Record<
  keyof PlanLimit,
  {
    icon: React.ElementType;
    getLabel: (value: number) => string;
    description: string;
  }
> = {
  projects: {
    icon: FolderArchive,
    getLabel: (value: number) =>
      `${value} Testimonial ${value === 1 ? "Form" : "Forms"}`,
    description: "Collect testimonials from your customers",
  },
  storage: {
    icon: HardDrive,
    getLabel: (value: number) => `${value} GB Video Storage`,
    description: "Store video testimonials from your customers",
  },
  members: {
    icon: Users,
    getLabel: (value: number) =>
      `${value} Team ${value === 1 ? "Member" : "Members"}`,
    description: "Invite team members to collaborate",
  },
};

// Additional features by plan
export const ADDITIONAL_FEATURES = {
  free: [
    {
      icon: Video,
      label: "Text Testimonials",
      description: "Collect written testimonials from customers",
    },
  ],
  pro: [
    {
      icon: Video,
      label: "Video Testimonials",
      description: "Record and collect video testimonials",
    },
    {
      icon: Palette,
      label: "Custom Branding",
      description: "Match your brand colors and logo",
    },
    {
      icon: Code,
      label: "Embed Widgets",
      description: "Showcase testimonials on your website",
    },
  ],
  ultra: [
    {
      icon: Paintbrush,
      label: "White-label Solution",
      description: `Remove all ${SiteConfig.title} branding`,
    },
    {
      icon: Code,
      label: "API Access",
      description: "Integrate testimonials via REST API",
    },
  ],
};

function getAdditionalFeatures(planName: string) {
  return planName in ADDITIONAL_FEATURES
    ? ADDITIONAL_FEATURES[planName as keyof typeof ADDITIONAL_FEATURES]
    : [];
}

export const getPlanLimits = (
  plan = "free",
  overrideLimits?: OverrideLimits | null,
): PlanLimit => {
  const planLimits = AUTH_PLANS.find((p) => p.name === plan)?.limits;

  const baseLimits = planLimits ?? DEFAULT_PLAN_LIMITS;

  if (!overrideLimits) {
    return baseLimits;
  }

  return {
    ...baseLimits,
    ...overrideLimits,
  };
};

export const getPlanFeatures = (plan: AppAuthPlan): string[] => {
  const features: string[] = [
    ...Object.entries(plan.limits)
      .filter(([key]) => key in LIMITS_CONFIG)
      .map(([key, value]) => {
        const limitConfig = LIMITS_CONFIG[key as keyof typeof LIMITS_CONFIG];
        return limitConfig.getLabel(value as number);
      }),
    ...getAdditionalFeatures(plan.name).map((f) => f.label),
  ];
  return features;
};
