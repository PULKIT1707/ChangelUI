import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../../src/components/copy-button";

const originalExecCommand = document.execCommand;

afterEach(() => {
  document.execCommand = originalExecCommand;
});

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
    await Promise.resolve();
  });
}

describe("CopyButton", () => {
  it("copies a string value, shows copiedLabel and resets after timeoutMs", async () => {
    vi.useFakeTimers();
    const onCopied = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<CopyButton ref={ref} value="hello" timeoutMs={1000} onCopied={onCopied} />);
    const button = screen.getByRole("button", { name: "Copy" });
    expect(ref.current).toBe(button);
    await click(button);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
    expect(onCopied).toHaveBeenCalledWith("hello");
    expect(button).toHaveAccessibleName("Copied");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    expect(button).toHaveAttribute("data-state", "copied");
    act(() => vi.advanceTimersByTime(999));
    expect(button).toHaveAccessibleName("Copied");
    act(() => vi.advanceTimersByTime(1));
    expect(button).toHaveAccessibleName("Copy");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("calls a function value at click time", async () => {
    const value = vi.fn(() => "computed");
    render(<CopyButton value={value} />);
    expect(value).not.toHaveBeenCalled();
    await click(screen.getByRole("button"));
    expect(value).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("computed");
  });

  it("shows errorLabel and calls onCopyError when copying fails", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    document.execCommand = vi.fn(() => false);
    const onCopyError = vi.fn();
    const onCopied = vi.fn();
    render(<CopyButton value="x" onCopyError={onCopyError} onCopied={onCopied} errorLabel="Nope" />);
    await click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAccessibleName("Nope");
    expect(screen.getByRole("status")).toHaveTextContent("Nope");
    expect(onCopyError).toHaveBeenCalledWith(expect.objectContaining({ message: "denied" }));
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("showLabel renders icon + text in a Button layout", async () => {
    render(<CopyButton value="x" showLabel label="Copy code" />);
    const button = screen.getByRole("button", { name: "Copy code" });
    expect(button).toHaveTextContent("Copy code");
    expect(button).toHaveAttribute("data-variant", "outline");
    await click(button);
    expect(button).toHaveTextContent("Copied");
  });

  it("respects preventDefault in a consumer onClick", async () => {
    render(<CopyButton value="x" onClick={(e) => e.preventDefault()} />);
    await click(screen.getByRole("button"));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
