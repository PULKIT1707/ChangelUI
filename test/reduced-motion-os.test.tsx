// Reduced motion from the OS setting alone, with no MotionConfig (design 6, review finding 3).
// Motion reads "(prefers-reduced-motion)" once per module graph and caches it, so this file sets
// the query before every render and never turns it off.
import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BorderBeam } from "../src/effects/border-beam";
import { SmoothCursor } from "../src/effects/smooth-cursor";
import { usePrefersReducedMotion } from "../src/lib/use-reduced-motion";
import { TypingText } from "../src/text/typing-text";
import { setMediaQuery } from "./utils/env";

beforeEach(() => {
  setMediaQuery("(prefers-reduced-motion)", true);
  setMediaQuery("(prefers-reduced-motion: reduce)", true);
  // Motion warns once (console.warn) that the device prefers reduced motion.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

function Reduced() {
  return <span>{usePrefersReducedMotion() ? "reduced" : "full"}</span>;
}

describe("reduced motion from the OS, without MotionConfig", () => {
  it("usePrefersReducedMotion follows the OS, even under an explicit 'never'", () => {
    const { container } = render(
      <>
        <Reduced />
        <MotionConfig reducedMotion="never">
          <Reduced />
        </MotionConfig>
      </>,
    );
    expect(container.textContent).toBe("reducedreduced");
  });

  it("TypingText shows the full text", () => {
    const { container } = render(<TypingText text="Hello there" />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe("Hello there");
  });

  it("SmoothCursor and BorderBeam render nothing", () => {
    setMediaQuery("(pointer: fine)", true);
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div>
        <SmoothCursor ref={ref} />
        <BorderBeam />
      </div>,
    );
    expect(ref.current).toBeNull();
    expect((container.firstElementChild as HTMLElement).innerHTML).toBe("");
  });
});
