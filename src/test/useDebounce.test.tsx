// @ts-nocheck
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDebounce } from "../hooks/useDebounce";

describe("useDebounce", () => {
  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("should not update the value before the delay has passed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } },
    );

    // Update the value prop
    rerender({ value: "updated", delay: 300 });

    // Fast-forward only 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Value should still be 'initial'
    expect(result.current).toBe("initial");

    vi.useRealTimers();
  });

  it("should update the value after the delay has passed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } },
    );

    rerender({ value: "updated", delay: 300 });

    // Fast-forward 301ms
    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(result.current).toBe("updated");

    vi.useRealTimers();
  });

  it("should clear existing timeout if value changes again before delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } },
    );

    // First change
    rerender({ value: "second", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Second change before the first 300ms finished
    rerender({ value: "third", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Total time passed 400ms, but 'second' was cancelled by 'third'
    // 'third' still needs 100ms more
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("third");

    vi.useRealTimers();
  });
});
