import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "../../src/hooks/use-copy-to-clipboard";

const originalExecCommand = document.execCommand;

afterEach(() => {
  document.execCommand = originalExecCommand;
});

describe("useCopyToClipboard", () => {
  it("copies with the Clipboard API and resets after timeoutMs", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopyToClipboard({ timeoutMs: 500 }));
    let ok = false;
    await act(async () => {
      ok = await result.current.copy("hello");
    });
    expect(ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.copied).toBe(false);
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = false;
    await act(async () => {
      ok = await result.current.copy("fallback");
    });
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("resolves false and sets error when every path fails", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    document.execCommand = vi.fn(() => false);
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy("x");
    });
    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error?.message).toBe("denied");
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it("handles a missing Clipboard API and a throwing execCommand", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    document.execCommand = vi.fn(() => {
      throw new Error("nope");
    });
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy("x");
    });
    expect(ok).toBe(false);
    expect(result.current.error?.message).toBe("Clipboard API unavailable");
  });
});
