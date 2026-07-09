import { describe, expect, test } from "bun:test";
import { formatModelSize } from "../../src/lib/utils/format";

describe("formatModelSize", () => {
  test("returns a fallback for missing or invalid sizes", () => {
    expect(formatModelSize(null)).toBe("Unknown size");
    expect(formatModelSize(undefined)).toBe("Unknown size");
    expect(formatModelSize(0)).toBe("Unknown size");
    expect(formatModelSize(-1)).toBe("Unknown size");
    expect(formatModelSize(Number.NaN)).toBe("Unknown size");
  });

  test("formats megabytes with user-friendly precision", () => {
    expect(formatModelSize(99.5)).toMatch(/^99[,.]5 MB$/);
    expect(formatModelSize(100)).toBe("100 MB");
    expect(formatModelSize(512)).toBe("512 MB");
  });

  test("formats gigabytes with user-friendly precision", () => {
    expect(formatModelSize(1024)).toMatch(/^1[,.]0 GB$/);
    expect(formatModelSize(1536)).toMatch(/^1[,.]5 GB$/);
    expect(formatModelSize(10240)).toBe("10 GB");
  });
});
