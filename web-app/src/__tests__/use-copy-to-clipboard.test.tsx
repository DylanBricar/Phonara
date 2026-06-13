import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useCopyToClipboard", () => {
  const writeTextMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeTextMock.mockReset();

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should expose isCopied=false initially", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.isCopied).toBe(false);
  });

  it("should set isCopied=true after copying", () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    act(() => {
      result.current.copyToClipboard("hello");
    });

    expect(writeTextMock).toHaveBeenCalledWith("hello");
    expect(result.current.isCopied).toBe(true);
  });

  it("should reset isCopied=false after the configured delay", () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    act(() => {
      result.current.copyToClipboard("hello");
    });
    expect(result.current.isCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isCopied).toBe(false);
  });

  it("should default delay to 5000ms", () => {
    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copyToClipboard("foo");
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.isCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isCopied).toBe(false);
  });
});
