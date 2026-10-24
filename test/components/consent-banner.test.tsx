import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConsentBanner } from "../../src/components/consent-banner";
const wrap = (ui: ReactElement) => render(<MotionConfig reducedMotion="always">{ui}</MotionConfig>);
describe("ConsentBanner", () => {
  it("renders an open region with equal reject and accept actions, forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    wrap(<ConsentBanner ref={ref} position="inline" className="mt-4" />);
    expect(ref.current).toHaveAttribute("data-state", "open");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("region", { name: "Your privacy choices" })).toBeInTheDocument();
    const reject = screen.getByRole("button", { name: "Reject all" });
    const accept = screen.getByRole("button", { name: "Accept all" });
    expect(reject.className).toBe(accept.className);
  });
  it("rejects all optional categories but keeps the required ones", () => {
    const onDecide = vi.fn();
    wrap(<ConsentBanner position="inline" onDecide={onDecide} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject all" }));
    expect(onDecide).toHaveBeenCalledWith({ necessary: true, preferences: false, analytics: false, marketing: false }, "reject-all");
  });
  it("customizes inline with labelled switches and saves (a11y)", () => {
    const onDecide = vi.fn();
    wrap(<ConsentBanner position="inline" onDecide={onDecide} />);
    const customize = screen.getByRole("button", { name: "Customize" });
    expect(customize).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(customize);
    fireEvent.click(screen.getByRole("switch", { name: "Analytics" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
    expect(onDecide).toHaveBeenCalledWith({ necessary: true, preferences: false, analytics: true, marketing: false }, "custom");
  });
  it("starts as a reopen pill when a decision is stored", () => {
    const { container } = wrap(<ConsentBanner position="inline" defaultValue={{ analytics: true }} />);
    expect(container.firstElementChild).toHaveAttribute("data-state", "pill");
    expect(screen.getByRole("button", { name: /change cookie choices/ })).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<ConsentBanner position="inline" />)).toContain("Your privacy choices");
  });
});
