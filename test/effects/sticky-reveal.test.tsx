import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StickyReveal } from "../../src/effects/sticky-reveal";

describe("StickyReveal", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<StickyReveal ref={ref} className="mt-4" items={[{ title: "Chapter", body: "Body", media: <span>Media</span> }]} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><StickyReveal items={[{ title: "Chapter", body: "Body", media: <span>Media</span> }]} /></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<StickyReveal items={[{ title: "Chapter", body: "Body", media: <span>Media</span> }]} />)).toContain("Chapter");
  });
});
