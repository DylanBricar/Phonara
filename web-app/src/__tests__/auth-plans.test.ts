import {
  AUTH_PLANS,
  getPlanFeatures,
  getPlanLimits,
} from "@/lib/auth/stripe/auth-plans";
import { describe, expect, it } from "vitest";

describe("getPlanLimits", () => {
  it("should return free plan limits when called with 'free'", () => {
    const limits = getPlanLimits("free");
    expect(limits).toEqual({ projects: 5, storage: 10, members: 3 });
  });

  it("should return pro plan limits when called with 'pro'", () => {
    const limits = getPlanLimits("pro");
    expect(limits).toEqual({ projects: 20, storage: 50, members: 10 });
  });

  it("should return ultra plan limits when called with 'ultra'", () => {
    const limits = getPlanLimits("ultra");
    expect(limits).toEqual({ projects: 100, storage: 1000, members: 100 });
  });

  it("should fallback to default limits for unknown plan", () => {
    const limits = getPlanLimits("non-existent");
    expect(limits).toEqual({ projects: 5, storage: 10, members: 3 });
  });

  it("should default to free plan when no argument is passed", () => {
    const limits = getPlanLimits();
    expect(limits).toEqual({ projects: 5, storage: 10, members: 3 });
  });

  it("should merge override limits over plan defaults", () => {
    const limits = getPlanLimits("pro", { projects: 999 });
    expect(limits).toEqual({ projects: 999, storage: 50, members: 10 });
  });

  it("should ignore null override limits", () => {
    const limits = getPlanLimits("pro", null);
    expect(limits).toEqual({ projects: 20, storage: 50, members: 10 });
  });

  it("should override every limit when all are provided", () => {
    const limits = getPlanLimits("free", {
      projects: 1,
      storage: 2,
      members: 3,
    });
    expect(limits).toEqual({ projects: 1, storage: 2, members: 3 });
  });
});

describe("getPlanFeatures", () => {
  it("should produce a list of features for the free plan", () => {
    const free = AUTH_PLANS.find((p) => p.name === "free");
    if (!free) throw new Error("free plan missing");

    const features = getPlanFeatures(free);
    expect(features).toContain("5 Testimonial Forms");
    expect(features).toContain("10 GB Video Storage");
    expect(features).toContain("3 Team Members");
    expect(features).toContain("Text Testimonials");
  });

  it("should pluralize/singularize testimonial forms label", () => {
    const free = AUTH_PLANS.find((p) => p.name === "free");
    if (!free) throw new Error("free plan missing");

    const features = getPlanFeatures({
      ...free,
      limits: { projects: 1, storage: 1, members: 1 },
    });
    expect(features).toContain("1 Testimonial Form");
    expect(features).toContain("1 Team Member");
  });

  it("should include pro-specific features", () => {
    const pro = AUTH_PLANS.find((p) => p.name === "pro");
    if (!pro) throw new Error("pro plan missing");

    const features = getPlanFeatures(pro);
    expect(features).toContain("Video Testimonials");
    expect(features).toContain("Custom Branding");
    expect(features).toContain("Embed Widgets");
  });

  it("should include ultra-specific features", () => {
    const ultra = AUTH_PLANS.find((p) => p.name === "ultra");
    if (!ultra) throw new Error("ultra plan missing");

    const features = getPlanFeatures(ultra);
    expect(features).toContain("White-label Solution");
    expect(features).toContain("API Access");
  });
});

describe("AUTH_PLANS configuration", () => {
  it("should expose three plans (free, pro, ultra)", () => {
    expect(AUTH_PLANS.map((p) => p.name)).toEqual(["free", "pro", "ultra"]);
  });

  it("should mark only the pro plan as popular", () => {
    expect(AUTH_PLANS.find((p) => p.name === "pro")?.isPopular).toBe(true);
    expect(AUTH_PLANS.find((p) => p.name === "free")?.isPopular).toBeFalsy();
    expect(AUTH_PLANS.find((p) => p.name === "ultra")?.isPopular).toBe(false);
  });

  it("should give every paid plan a free trial", () => {
    expect(AUTH_PLANS.find((p) => p.name === "pro")?.freeTrial?.days).toBe(14);
    expect(AUTH_PLANS.find((p) => p.name === "ultra")?.freeTrial?.days).toBe(
      14,
    );
  });

  it("should price plans monotonically (free < pro < ultra)", () => {
    const free = AUTH_PLANS.find((p) => p.name === "free")?.price ?? 0;
    const pro = AUTH_PLANS.find((p) => p.name === "pro")?.price ?? 0;
    const ultra = AUTH_PLANS.find((p) => p.name === "ultra")?.price ?? 0;
    expect(free).toBeLessThan(pro);
    expect(pro).toBeLessThan(ultra);
  });
});
