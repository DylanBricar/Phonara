import { LoadingButton } from "@/features/form/submit-button";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { openExternalUrl } from "@/lib/navigation/open-external-url";
import { api } from "@convex/_generated/api";
import { useLocation } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { toastClientError } from "@/lib/errors/client-error-message";

type PlanCardActionProps = {
  label: string;
  variant?: "default" | "outline" | "secondary";
  currentPlan: string;
  targetPlan: string;
};

export function PlanCardAction({
  label,
  variant = "default",
  currentPlan,
  targetPlan,
}: PlanCardActionProps) {
  const { pathname } = useLocation();
  const activeOrg = useCurrentOrg();
  const isFreePlan = currentPlan === "free";
  const createCheckout = useAction(
    api.stripe.actions.createOrganizationCheckout,
  );
  const createBillingPortal = useAction(
    api.stripe.actions.createOrganizationBillingPortal,
  );

  const mutation = useQueryMutation({
    mutationFn: async () => {
      if (!activeOrg) throw new Error("No active organization");
      if (isFreePlan) {
        return createCheckout({
          organizationSlug: activeOrg.slug,
          plan: targetPlan,
          annual: false,
          successUrl: pathname,
          cancelUrl: pathname,
        });
      }
      return createBillingPortal({
        organizationSlug: activeOrg.slug,
        returnUrl: pathname,
      });
    },
    onSuccess: (result) => {
      if (result.url) {
        openExternalUrl(result.url);
      }
    },
    onError: (error) => {
      toastClientError(error, "Failed to update plan");
    },
  });

  return (
    <LoadingButton
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
      variant={variant}
      className="w-full"
    >
      {label}
    </LoadingButton>
  );
}
