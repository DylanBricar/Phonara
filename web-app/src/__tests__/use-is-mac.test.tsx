import { useIsMac } from "@/hooks/use-is-mac";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const setUserAgent = (ua: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
};

describe("useIsMac", () => {
  const originalUA = window.navigator.userAgent;

  afterEach(() => {
    setUserAgent(originalUA);
  });

  it("should return true when user agent contains 'Mac OS X'", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    );
    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(true);
  });

  it("should return false on Windows user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(false);
  });

  it("should return false on Linux user agent", () => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(false);
  });
});
