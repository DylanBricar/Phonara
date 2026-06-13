import type {
  OverrideLimits,
  PlanLimit,
  SubscriptionDiscount,
} from "@/lib/auth/stripe/auth-plans";
import { getPlanLimits } from "@/lib/auth/stripe/auth-plans";
import { create } from "zustand";

type CurrentOrgSubscription = {
  id: string;
  referenceId: string;
  plan: string;
  status: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  discount: SubscriptionDiscount | null;
  overrideLimits: Record<string, Record<string, number>> | null;
  createdAt: number;
  updatedAt: number;
  limits: PlanLimit;
};

type CurrentOrgStore = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  subscription: CurrentOrgSubscription | null;
  limits: PlanLimit;
};

/**
 * Client-side hook to access the current organization context.
 *
 * This is the canonical way to get org data in client components.
 * Do NOT use better-auth's useActiveOrganization - use this instead.
 *
 * The org data is injected server-side via OrgProvider in the layout.
 *
 * @example
 * ```tsx
 * export const ClientComponent = () => {
 *   const currentOrg = useCurrentOrg();
 *
 *   if (!currentOrg) return null;
 *
 *   return <p>Current org: {currentOrg.name}</p>;
 * };
 * ```
 */
export const useCurrentOrg = create<CurrentOrgStore | null>(() => null);

export type CurrentOrgData = Omit<CurrentOrgStore, "limits">;

export const setCurrentOrg = (org: CurrentOrgData) => {
  useCurrentOrg.setState({
    id: org.id,
    slug: org.slug,
    name: org.name,
    image: org.image,
    subscription: org.subscription,
    limits: getPlanLimits(
      org.subscription?.plan,
      org.subscription?.overrideLimits
        ? (org.subscription.overrideLimits as unknown as OverrideLimits)
        : null,
    ),
  });
};

export const clearCurrentOrg = () => {
  useCurrentOrg.setState(null);
};
