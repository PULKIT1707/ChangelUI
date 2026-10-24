import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { clearedShare, ScratchReveal } from "../../src/effects/scratch-reveal";

describe("ScratchReveal", () => {
  it("covers the content, forwards the ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ScratchReveal ref={ref} className="mt-4">
        <button type="button">Copy code</button>
      </ScratchReveal>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-state", "covered");
    expect(root?.className).toContain("mt-4");
    // Hidden content is inert and out of the accessibility tree.
    expect(screen.queryByRole("button", { name: "Copy code" })).toBeNull();
  });

  it("reveals through the Reveal button (a11y)", () => {
    const onReveal = vi.fn();
    const { container } = render(
      <ScratchReveal onReveal={onReveal}>
        <button type="button">Copy code</button>
      </ScratchReveal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild).toHaveAttribute("data-state", "revealed");
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Revealed");
  });

  it("measures the cleared share", () => {
    const data = new Uint8ClampedArray(4 * 4);
    data[3] = 255;
    data[7] = 0;
    data[11] = 0;
    data[15] = 255;
    expect(clearedShare(data, 1)).toBe(0.5);
  });

  it("renders on the server with the cover in place", () => {
    const html = renderToString(<ScratchReveal coverText="Scratch me">Prize</ScratchReveal>);
    expect(html).toContain("Scratch me");
    expect(html).toContain('data-state="covered"');
  });
});
