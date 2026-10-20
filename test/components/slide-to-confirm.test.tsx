import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SlideToConfirm } from "../../src/components/slide-to-confirm";

describe("SlideToConfirm", () => {
  it("forwards the ref, merges className and exposes a slider thumb", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SlideToConfirm ref={ref} className="mt-4" onConfirm={() => {}} />);
    expect(ref.current?.className).toContain("mt-4");
    const thumb = screen.getByRole("slider", { name: "Slide to confirm" });
    expect(thumb).toHaveAttribute("aria-valuenow", "0");
  });

  it("confirms with Enter (keyboard equivalent)", () => {
    const onConfirm = vi.fn();
    render(<SlideToConfirm onConfirm={onConfirm} resetAfterMs={0} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders on the server", () => {
    expect(renderToString(<SlideToConfirm onConfirm={() => {}}>Pay now</SlideToConfirm>)).toContain("Pay now");
  });
});
