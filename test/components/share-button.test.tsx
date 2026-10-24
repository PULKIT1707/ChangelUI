import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ShareButton } from "../../src/components/share-button";
const URL_ = "https://example.com/posts/launch";
describe("ShareButton", () => {
  it("renders a collapsed trigger, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareButton ref={ref} url={URL_} className="mt-4" />);
    const trigger = screen.getByRole("button", { name: "Share" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(ref.current).toHaveAttribute("data-state", "closed");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("opens into share links built from the content and reports the target", () => {
    const onShare = vi.fn();
    render(<ShareButton url={URL_} title="Launch week" targets={["x", "linkedin", "email", "copy"]} preferNative={false} onShare={onShare} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("button", { name: "Share" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list", { name: "Share to" })).toBeInTheDocument();
    const x = screen.getByRole("link", { name: "Share on X" });
    expect(x.getAttribute("href")).toContain(encodeURIComponent(URL_));
    expect(x).toHaveAttribute("target", "_blank");
    expect(x).toHaveAttribute("rel", "noopener noreferrer");
    const email = screen.getByRole("link", { name: "Send by email" });
    expect(email.getAttribute("href")).toMatch(/^mailto:\?subject=Launch%20week/);
    expect(email).not.toHaveAttribute("target");
    fireEvent.click(x);
    expect(onShare).toHaveBeenCalledWith("x", { url: URL_, title: "Launch week", text: undefined });
  });
  it("copies the link and announces it (a11y)", async () => {
    render(<ShareButton url={URL_} preferNative={false} closeOnShare={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await Promise.resolve();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    expect(screen.getByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });
  it("closes on Escape and returns focus to the trigger (keyboard)", () => {
    render(<ShareButton url={URL_} preferNative={false} />);
    const trigger = screen.getByRole("button", { name: "Share" });
    fireEvent.click(trigger);
    const first = screen.getByRole("link", { name: "Share on X" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: "End" });
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
  it("hands off to the system share sheet when asked", async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const onShare = vi.fn();
    render(<ShareButton url={URL_} preferNative onShare={onShare} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
      await Promise.resolve();
    });
    expect(share).toHaveBeenCalledWith({ url: URL_, title: undefined, text: undefined });
    expect(onShare).toHaveBeenCalledWith("native", expect.objectContaining({ url: URL_ }));
    expect(screen.queryByRole("list")).toBeNull();
    Reflect.deleteProperty(navigator, "share");
  });
  it("renders on the server", () => {
    expect(renderToString(<ShareButton url={URL_} />)).toContain("Share");
  });
});
