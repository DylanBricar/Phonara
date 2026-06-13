import type { Doc } from "@convex/_generated/dataModel";
import { mapSubscription } from "@/lib/organizations/map-subscription";
import { describe, expect, it } from "vitest";

const baseRaw: Doc<"subscriptions"> = {
  _id: "sub_xxx" as Doc<"subscriptions">["_id"],
  _creationTime: 0,
  organizationId: "org_123",
  plan: "pro",
  status: "active",
  periodStart: 1_000_000,
  periodEnd: 2_000_000,
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: "stripe_sub_1",
  stripeCustomerId: "cus_1",
  overrideLimits: null,
  createdAt: 100,
  updatedAt: 200,
} as unknown as Doc<"subscriptions">;

describe("mapSubscription", () => {
  it("should map raw Convex doc to subscription shape", () => {
    const result = mapSubscription(baseRaw);

    expect(result).toMatchObject({
      id: "sub_xxx",
      referenceId: "org_123",
      plan: "pro",
      status: "active",
      periodStart: 1_000_000,
      periodEnd: 2_000_000,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: "stripe_sub_1",
      stripeCustomerId: "cus_1",
      overrideLimits: null,
      createdAt: 100,
      updatedAt: 200,
    });
  });

  it("should attach plan limits derived from plan name", () => {
    const result = mapSubscription(baseRaw);
    expect(result.limits).toEqual({
      projects: 20,
      storage: 50,
      members: 10,
    });
  });

  it("should apply overrideLimits to plan limits", () => {
    const raw = {
      ...baseRaw,
      overrideLimits: { projects: 999 },
    } as unknown as Doc<"subscriptions">;

    const result = mapSubscription(raw);
    expect(result.limits.projects).toBe(999);
    expect(result.limits.storage).toBe(50);
    expect(result.limits.members).toBe(10);
  });

  it("should default nullable fields to null when undefined", () => {
    const raw = {
      ...baseRaw,
      status: undefined,
      periodStart: undefined,
      periodEnd: undefined,
      cancelAtPeriodEnd: undefined,
      stripeSubscriptionId: undefined,
      stripeCustomerId: undefined,
    } as unknown as Doc<"subscriptions">;

    const result = mapSubscription(raw);
    expect(result.status).toBeNull();
    expect(result.periodStart).toBeNull();
    expect(result.periodEnd).toBeNull();
    expect(result.cancelAtPeriodEnd).toBeNull();
    expect(result.stripeSubscriptionId).toBeNull();
    expect(result.stripeCustomerId).toBeNull();
  });

  it("should fallback to free plan limits for unknown plan", () => {
    const raw = {
      ...baseRaw,
      plan: "unknown",
    } as unknown as Doc<"subscriptions">;

    const result = mapSubscription(raw);
    expect(result.limits).toEqual({ projects: 5, storage: 10, members: 3 });
  });
});
