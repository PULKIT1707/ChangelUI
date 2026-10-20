import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useControllableState } from "../../src/hooks/use-controllable-state";

afterEach(() => vi.restoreAllMocks());

describe("useControllableState", () => {
  it("uncontrolled: updates internally and calls onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("accepts a lazy defaultValue", () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: () => "lazy" }));
    expect(result.current[0]).toBe("lazy");
  });

  it("controlled: ignores the internal set but still calls onChange", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ value }) => useControllableState({ value, defaultValue: 0, onChange }), {
      initialProps: { value: 5 },
    });
    act(() => result.current[1](6));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(6);
    // a second request is evaluated against the (unchanged) controlled value
    act(() => result.current[1](6));
    expect(onChange).toHaveBeenCalledTimes(2);
    rerender({ value: 7 });
    expect(result.current[0]).toBe(7);
  });

  it("null is a controlled value", () => {
    const { result } = renderHook(() => useControllableState<string | null>({ value: null, defaultValue: "x" }));
    expect(result.current[0]).toBeNull();
  });

  it("functional updates read the latest value, including consecutive calls", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it("does not call onChange when the value is unchanged", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: "a", onChange }));
    act(() => result.current[1]("a"));
    act(() => result.current[1]((prev) => prev));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a stable setter", () => {
    const { result, rerender } = renderHook(() => useControllableState({ defaultValue: 0 }));
    const first = result.current[1];
    act(() => first(3));
    rerender();
    expect(result.current[1]).toBe(first);
  });

  it("warns once when switching between controlled and uncontrolled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ value }: { value?: number }) => useControllableState({ value, defaultValue: 0, name: "switch-test" }),
      { initialProps: { value: undefined } as { value?: number } },
    );
    rerender({ value: 1 });
    rerender({ value: undefined });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/\[changelui\].*switch-test.*uncontrolled to controlled/);
  });
});
