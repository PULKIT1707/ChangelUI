import { render } from "@testing-library/react";
import { createRef, useRef } from "react";
import { describe, expect, it } from "vitest";
import { ScrollProgress } from "../../src/effects/scroll-progress";

describe("ScrollProgress", () => {
  it("is a decorative fixed gradient bar at the top by default", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ScrollProgress ref={ref} thickness={4} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(bar);
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar.className).toContain("fixed");
    expect(bar.className).toContain("top-0");
    expect(bar.className).toContain("origin-left");
    expect(bar.className).toContain("from-pui-beam-from");
    expect(bar.style.height).toBe("4px");
  });

  it("can sit sticky at the bottom of a scroll container", () => {
    function Demo() {
      const scroller = useRef<HTMLDivElement>(null);
      return (
        <div ref={scroller} data-testid="scroller">
          <ScrollProgress container={scroller} fixed={false} position="bottom" spring={false} />
        </div>
      );
    }
    const { getByTestId } = render(<Demo />);
    const bar = getByTestId("scroller").firstElementChild as HTMLElement;
    expect(bar.className).toContain("sticky");
    expect(bar.className).toContain("bottom-0");
    expect(bar).toHaveAttribute("data-position", "bottom");
  });
});
