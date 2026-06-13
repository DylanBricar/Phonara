import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn (class name merger)", () => {
  it("should join basic class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should ignore falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("should resolve conditional objects", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("should flatten nested arrays", () => {
    expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
  });

  it("should merge conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should keep non-conflicting tailwind utilities", () => {
    expect(cn("text-sm", "font-bold", "p-2")).toBe("text-sm font-bold p-2");
  });

  it("should return empty string when no input is provided", () => {
    expect(cn()).toBe("");
  });

  it("should handle conditional tailwind merging", () => {
    expect(cn("p-2", { "p-4": true })).toBe("p-4");
  });
});
