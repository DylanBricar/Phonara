import { describe, expect, test } from "bun:test";
import { formatDateTime } from "../../src/utils/dateFormat";

describe("formatDateTime", () => {
  test("formats unix second timestamps for the requested locale", () => {
    const formatted = formatDateTime("1704067200", "en-US");

    expect(formatted).toContain("2024");
    expect(formatted).toContain("January");
  });

  test("returns the original value when the timestamp is invalid", () => {
    expect(formatDateTime("not-a-date", "en-US")).toBe("not-a-date");
  });

  test("returns the original value when the locale cannot be formatted", () => {
    expect(formatDateTime("1704067200", "invalid_locale")).toBe("1704067200");
  });
});
