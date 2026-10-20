// Design 11.3 "Reduced motion": every assertion runs under <MotionConfig reducedMotion="always">.
import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import type * as React from "react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Meteors } from "../src/backgrounds/meteors";
import { BorderBeam } from "../src/effects/border-beam";
import { Marquee } from "../src/effects/marquee";
import { SmoothCursor } from "../src/effects/smooth-cursor";
import { NumberTicker } from "../src/text/number-ticker";
import { ScrambleText } from "../src/text/scramble-text";
import { TypingText } from "../src/text/typing-text";
import { setMediaQuery } from "./utils/env";

function renderReduced(ui: React.ReactElement) {
  return render(<MotionConfig reducedMotion="always">{ui}</MotionConfig>);
}

function visual(container: HTMLElement): string {
  return container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
}

describe("reduced motion", () => {
  it("NumberTicker shows the final value immediately", () => {
    const { container } = renderReduced(<NumberTicker value={4321} from={0} />);
    expect(visual(container)).toBe("4,321");
  });

  it("TypingText shows the full text", () => {
    const { container } = renderReduced(<TypingText text="Hello there" />);
    expect(visual(container)).toBe("Hello there");
    expect(container.querySelector("[data-pui-cursor]")?.className).not.toContain("animate");
  });

  it("ScrambleText shows the final text", () => {
    const { container } = renderReduced(<ScrambleText text="Final text" trigger="mount" />);
    expect(visual(container)).toBe("Final text");
  });

  it("Marquee renders one copy with no animation class", () => {
    const { container } = renderReduced(
      <Marquee repeat={4}>
        <span>Item</span>
      </Marquee>,
    );
    const copies = container.querySelectorAll("[data-pui-marquee-copy]");
    expect(copies).toHaveLength(1);
    expect(copies[0]?.className).not.toContain("animate");
    expect(container.firstElementChild?.className).toContain("overflow-auto");
  });

  it("SmoothCursor renders null even with a fine pointer", () => {
    setMediaQuery("(pointer: fine)", true);
    const ref = createRef<HTMLDivElement>();
    const { container } = renderReduced(
      <div data-testid="scope">
        <SmoothCursor ref={ref} />
      </div>,
    );
    expect(ref.current).toBeNull();
    expect((container.firstElementChild as HTMLElement).innerHTML).toBe("");
    expect(document.querySelector("[data-pui-cursor]")).toBeNull();
  });

  it("BorderBeam and Meteors render nothing", () => {
    const { container } = renderReduced(
      <div data-testid="host">
        <BorderBeam />
        <Meteors count={10} />
      </div>,
    );
    expect((container.firstElementChild as HTMLElement).innerHTML).toBe("");
  });
});
