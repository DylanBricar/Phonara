import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("first", 300));
    expect(result.current).toBe("first");
  });

  it("should not update before delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 500),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("a");
  });

  it("should update after delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 500),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("b");
  });

  it("should reset the timer when value keeps changing", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 500),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe("a");

    rerender({ value: "c" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Less than 500ms since last change
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("c");
  });

  it("should use default delay of 300ms when not specified", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "x" } },
    );

    rerender({ value: "y" });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("x");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("y");
  });
});
