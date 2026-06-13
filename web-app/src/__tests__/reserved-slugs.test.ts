import { RESERVED_SLUGS } from "@/lib/organizations/reserved-slugs";
import { describe, expect, it } from "vitest";

describe("RESERVED_SLUGS", () => {
  it("should reserve slugs that collide with route segments", () => {
    expect(RESERVED_SLUGS).toContain("new");
    expect(RESERVED_SLUGS).toContain("create");
    expect(RESERVED_SLUGS).toContain("accept-invitation");
  });

  it("should not contain duplicates", () => {
    const unique = new Set(RESERVED_SLUGS);
    expect(unique.size).toBe(RESERVED_SLUGS.length);
  });

  it("should contain only lowercase strings", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(slug).toBe(slug.toLowerCase());
    }
  });
});
