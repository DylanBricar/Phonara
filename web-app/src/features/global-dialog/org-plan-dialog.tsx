import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUTH_PLANS, getPlanFeatures } from "@/lib/auth/stripe/auth-plans";
import { SimplePricingCard } from "@/routes/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/_components/simple-pricing-card";
import { Link } from "@tanstack/react-router";
import { closeGlobalDialog } from "./global-dialog.store";

export const OrgPlanDialog = () => {
  return (
    <Dialog open={true} onOpenChange={() => closeGlobalDialog()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto px-8 py-6 lg:px-16 lg:py-14">
        <DialogHeader className="w-full text-center">
          <DialogTitle className="text-center font-bold lg:text-3xl">
            Choose a plan and start growing
          </DialogTitle>
          <DialogDescription className="text-center">
            To unlock full access to our features, choose a plan and start
            growing your business.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-8 flex w-full justify-center gap-4 max-md:flex-col lg:mt-12 lg:gap-8 xl:gap-12">
          {AUTH_PLANS.map((card, i) => (
            <SimplePricingCard
              key={i}
              title={card.name}
              price={card.price.toString()}
              period="month"
              features={getPlanFeatures(card)}
              action={
                <Button asChild>
                  <Link
                    to="/orgs/$orgSlug/settings/billing"
                    params={{ orgSlug: "default" }}
                  >
                    Upgrade
                  </Link>
                </Button>
              }
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
