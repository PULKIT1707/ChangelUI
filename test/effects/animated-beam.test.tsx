import { render } from "@testing-library/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedBeam } from "../../src/effects/animated-beam";

function Diagram() {
  const container = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLSpanElement>(null);
  const to = useRef<HTMLSpanElement>(null);
  return (
    <div ref={container} className="relative">
      <span ref={from}>A</span>
      <span ref={to}>B</span>
      <AnimatedBeam containerRef={container} fromRef={from} toRef={to} />
    </div>
  );
}

describe("AnimatedBeam", () => {
  it("leaves the endpoints alone and adds nothing to the a11y tree", () => {
    const { container } = render(<Diagram />);
    expect(container.textContent).toBe("AB");
    container.querySelectorAll("svg").forEach((svg) => expect(svg).toHaveAttribute("aria-hidden", "true"));
  });

  it("renders nothing on the server until measured", () => {
    expect(renderToString(<Diagram />)).not.toContain("<svg");
  });
});
