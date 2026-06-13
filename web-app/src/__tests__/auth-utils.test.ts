import {
  DEFAULT_AUTH_CALLBACK_URL,
  getCallbackUrl,
  normalizeAuthCallbackUrl,
} from "@/lib/auth/auth-utils";
import { describe, expect, it } from "vitest";

describe("normalizeAuthCallbackUrl", () => {
  it("returns the default callback when no value is provided", () => {
    expect(normalizeAuthCallbackUrl(undefined)).toBe(DEFAULT_AUTH_CALLBACK_URL);
  });

  it("returns the provided internal absolute path", () => {
    expect(normalizeAuthCallbackUrl("/orgs/foo")).toBe("/orgs/foo");
  });

  it("prefixes relative internal paths with a slash", () => {
    expect(normalizeAuthCallbackUrl("orgs/foo")).toBe("/orgs/foo");
  });

  it("preserves nested paths with query and hash", () => {
    expect(
      normalizeAuthCallbackUrl("/orgs/bar/settings?tab=billing#plan"),
    ).toBe("/orgs/bar/settings?tab=billing#plan");
  });

  it("falls back for external or protocol-relative URLs", () => {
    expect(normalizeAuthCallbackUrl("https://evil.test", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(normalizeAuthCallbackUrl("//evil.test", "/dashboard")).toBe(
      "/dashboard",
    );
  });

  it("falls back for unsafe auth entrypoints and legacy null strings", () => {
    expect(normalizeAuthCallbackUrl("/auth/signin", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(normalizeAuthCallbackUrl("/auth/signup", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(normalizeAuthCallbackUrl("null", "/dashboard")).toBe("/dashboard");
  });
});

describe("getCallbackUrl", () => {
  it("keeps the previous public alias", () => {
    expect(getCallbackUrl("/orgs/foo")).toBe("/orgs/foo");
  });
});
