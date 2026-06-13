import { Button } from "@/components/ui/button";
import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import {
  ADDITIONAL_FEATURES,
  LIMITS_CONFIG,
} from "@/lib/auth/stripe/auth-plans";
import type { AppAuthPlan } from "@/lib/auth/stripe/auth-plans";
import { cn } from "@/lib/utils";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { openExternalUrl } from "@/lib/navigation/open-external-url";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

export function Pricing() {
  const visiblePlans = AUTH_PLANS.filter((p) => !p.isHidden);

  return (
    <section className="border-t border-[#222] pt-24 pb-16" id="pricing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="mb-3 text-sm text-[#666]">Pricing</p>
          <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
            Simple pricing, <em>no surprises.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Start free and upgrade when you need more. No hidden fees.
          </p>
        </div>

        <div
          className={cn(
            "relative mx-auto mt-14 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:max-w-none",
            visiblePlans.length === 2 && "lg:grid-cols-2",
            visiblePlans.length >= 3 && "lg:grid-cols-3",
          )}
        >
          <div
            aria-hidden="true"
            className="hidden lg:absolute lg:inset-x-px lg:top-4 lg:bottom-0 lg:block lg:rounded-t-2xl lg:border lg:border-[#2a2a2a] lg:bg-[#1a1a1a]"
          />
          {visiblePlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: AppAuthPlan }) {
  const activeOrg = useCurrentOrg();
  const [isPending, setIsPending] = useState(false);
  const createCheckout = useAction(
    api.stripe.actions.createOrganizationCheckout,
  );

  const handleUpgrade = async () => {
    if (!activeOrg) {
      toast.error("No active organization");
      return;
    }
    setIsPending(true);
    try {
      const result = await createCheckout({
        organizationSlug: activeOrg.slug,
        plan: plan.name,
        annual: false,
        successUrl: `/orgs/${activeOrg.slug}/settings/billing/success`,
        cancelUrl: `/orgs/${activeOrg.slug}/settings/billing`,
      });
      if (result.url) {
        openExternalUrl(result.url);
      }
    } catch (error) {
      toastClientError(error, "Failed to upgrade plan");
    } finally {
      setIsPending(false);
    }
  };

  const highlights: string[] = [];
  for (const [key, value] of Object.entries(plan.limits)) {
    if (key in LIMITS_CONFIG) {
      const config = LIMITS_CONFIG[key as keyof typeof LIMITS_CONFIG];
      highlights.push(config.getLabel(value as number));
    }
  }
  const additional =
    ADDITIONAL_FEATURES[plan.name as keyof typeof ADDITIONAL_FEATURES];
  for (const feat of additional) {
    highlights.push(feat.label);
  }

  return (
    <div
      className={cn(
        "group/tier relative rounded-2xl",
        plan.isPopular
          ? "z-10 rounded-2xl border border-[#fafafa]/20 bg-[#1a1a1a] shadow-xl"
          : "border border-[#2a2a2a] bg-[#1a1a1a] lg:border-0 lg:bg-transparent lg:pb-14",
      )}
    >
      <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
        <h3 className="text-sm font-semibold text-[#fafafa] capitalize">
          {plan.name}
        </h3>
        {plan.description && (
          <p className="mt-1 text-sm text-[#888]">{plan.description}</p>
        )}

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
          <div className="flex items-center gap-x-4">
            <p className="text-4xl font-semibold tracking-tight text-[#fafafa]">
              ${plan.price}
            </p>
            <div className="text-sm">
              <p className="text-[#fafafa]">USD</p>
              <p className="text-[#666]">Billed monthly</p>
            </div>
          </div>
          <Button
            size="lg"
            variant={plan.isPopular ? "default" : "outline"}
            className="w-full"
            onClick={() => void handleUpgrade()}
            disabled={isPending}
          >
            {plan.price === 0 ? "Get Started" : "Buy this plan"}
          </Button>
        </div>

        <div className="mt-8 flow-root sm:mt-10">
          <ul className="-my-2 divide-y divide-[#2a2a2a] border-t border-[#2a2a2a] text-sm text-[#fafafa] lg:border-t-0">
            {highlights.map((feature) => (
              <li key={feature} className="flex gap-x-3 py-2">
                <Check
                  aria-hidden="true"
                  className={cn(
                    "h-6 w-5 flex-none",
                    plan.isPopular ? "text-primary" : "text-[#666]",
                  )}
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
