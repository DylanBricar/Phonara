import { redirectAfterAuthSessionChange } from "@/lib/auth/session-transition";
import { describe, expect, it, vi } from "vitest";

describe("redirectAfterAuthSessionChange", () => {
  it("reloads to the target route after an auth session swap", () => {
    const assign = vi.fn();

    redirectAfterAuthSessionChange("/orgs", { assign });

    expect(assign).toHaveBeenCalledWith("/orgs");
  });

  it("does nothing when no browser location is available", () => {
    expect(() => redirectAfterAuthSessionChange("/orgs", null)).not.toThrow();
  });
});
