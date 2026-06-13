export {
  ACTIVE_SUBSCRIPTION_STATUSES,
  isActiveSubscriptionStatus,
} from "@convex/billing/plans";

export const SUBSCRIPTION_STATUS_CONFIG = {
  trialing: { label: "Trial", color: "bg-primary" },
  active: { label: "Active", color: "bg-primary" },
  canceled: { label: "Canceled", color: "bg-muted-foreground" },
  past_due: { label: "Past Due", color: "bg-destructive" },
  unpaid: { label: "Unpaid", color: "bg-destructive" },
  incomplete: { label: "Incomplete", color: "bg-muted-foreground" },
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS_CONFIG;
