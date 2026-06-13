import { useIsClient } from "@/hooks/use-is-client";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("useIsClient", () => {
  it("should return true after hydration", () => {
    const { result } = renderHook(() => useIsClient());
    expect(result.current).toBe(true);
  });
});
