import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Separator } from "../../src/components/separator";

describe("Separator", () => {
  it("is decorative (role none) by default and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Separator ref={ref} />);
    const el = container.firstElementChild;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("role", "none");
    expect(el).toHaveAttribute("data-orientation", "horizontal");
    expect(el?.className).toContain("h-px");
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("non-decorative exposes role separator with aria-orientation", () => {
    render(<Separator decorative={false} orientation="vertical" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep.className).toContain("w-px");
  });

  it("renders a centered label when horizontal only", () => {
    const { rerender } = render(<Separator label="OR" />);
    expect(screen.getByText("OR")).toBeInTheDocument();
    rerender(<Separator label="OR" orientation="vertical" />);
    expect(screen.queryByText("OR")).toBeNull();
  });
});
