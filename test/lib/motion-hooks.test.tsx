import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useInViewTrigger, type InViewTriggerOptions } from "../../src/lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../../src/lib/use-reduced-motion";

function InView(props: InViewTriggerOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInViewTrigger(ref, props);
  return <div ref={ref}>{active ? "active" : "idle"}</div>;
}

describe("useInViewTrigger", () => {
  it("activates when the element is observed in view", () => {
    render(<InView />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("activates immediately without IntersectionObserver", () => {
    const original = window.IntersectionObserver;
    // @ts-expect-error simulate an old browser
    delete window.IntersectionObserver;
    try {
      render(<InView once={false} />);
      expect(screen.getByText("active")).toBeInTheDocument();
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it("is idle on the server for inView and active for mount", () => {
    expect(renderToString(<InView />)).toContain("idle");
    expect(renderToString(<InView trigger="mount" />)).toContain("active");
  });
});

function Reduced() {
  return <span>{usePrefersReducedMotion() ? "reduced" : "full"}</span>;
}

describe("usePrefersReducedMotion", () => {
  it("honors MotionConfig reducedMotion", () => {
    render(
      <>
        <MotionConfig reducedMotion="always">
          <Reduced />
        </MotionConfig>
        <MotionConfig reducedMotion="never">
          <Reduced />
        </MotionConfig>
      </>,
    );
    expect(screen.getByText("reduced")).toBeInTheDocument();
    expect(screen.getByText("full")).toBeInTheDocument();
  });
});
