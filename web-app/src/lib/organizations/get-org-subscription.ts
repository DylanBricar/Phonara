import { logger } from "../logger";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { mapSubscription } from "./map-subscription";

export type Subscription = ReturnType<typeof mapSubscription>;

export const getOrgActiveSubscription = async (
  organizationId: string,
): Promise<Subscription | null> => {
  try {
    const subscription = await fetchAuthQuery(
      api.subscriptions.queries.getActiveByOrganization,
      { organizationId },
    );

    if (!subscription) {
      return null;
    }

    return mapSubscription(subscription as Doc<"subscriptions">);
  } catch (error) {
    logger.error("Error fetching subscription:", error);
    return null;
  }
};
