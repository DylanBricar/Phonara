import { useIsMobile } from "@/hooks/use-mobile";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MqlListener = () => void;

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    writable: true,
    configurable: true,
  });
};

const installMatchMedia = () => {
  let listener: MqlListener | null = null;
  const mql = {
    matches: false,
    addEventListener: vi.fn((_: string, fn: MqlListener) => {
      listener = fn;
    }),
    removeEventListener: vi.fn(() => {
      listener = null;
    }),
  };
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockReturnValue(mql),
    writable: true,
    configurable: true,
  });
  return {
    trigger: () => listener?.(),
  };
};

describe("useIsMobile", () => {
  beforeEach(() => {
    setWindowWidth(1024);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false on a desktop viewport", () => {
    installMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true when viewport is narrower than 768px", () => {
    setWindowWidth(500);
    installMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should react when viewport changes through media query event", () => {
    setWindowWidth(1024);
    const mql = installMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(400);
      mql.trigger();
    });
    expect(result.current).toBe(true);
  });

  it("should treat exactly 768px as desktop", () => {
    setWindowWidth(768);
    installMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
