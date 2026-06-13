import { formatDate } from "@/lib/format/date";
import { describe, expect, it } from "vitest";

describe("formatDate", () => {
  it("should format a date as 'MMMM D, YYYY'", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    expect(formatDate(date)).toBe("January 15, 2024");
  });

  it("should format December dates correctly", () => {
    const date = new Date("2026-12-25T12:00:00Z");
    expect(formatDate(date)).toBe("December 25, 2026");
  });

  it("should format start-of-year date", () => {
    const date = new Date("2026-01-01T12:00:00Z");
    expect(formatDate(date)).toBe("January 1, 2026");
  });

  it("should not pad the day with zero", () => {
    const date = new Date("2026-03-05T12:00:00Z");
    expect(formatDate(date)).toBe("March 5, 2026");
  });
});
