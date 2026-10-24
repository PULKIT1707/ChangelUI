import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VoiceOrb } from "../../src/effects/voice-orb";

describe("VoiceOrb", () => {
  it("renders a status with the state label, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<VoiceOrb ref={ref} state="listening" className="mt-4" />);
    const root = screen.getByRole("status");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-state", "listening");
    expect(root).toHaveTextContent("Listening");
    expect(root.className).toContain("mt-4");
  });
  it("uses custom labels (a11y)", () => {
    render(<VoiceOrb state="thinking" labels={{ thinking: "Looking that up" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Looking that up");
  });
  it("stays still under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <VoiceOrb state="speaking" />
      </MotionConfig>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-motion", "static");
  });
  it("renders a real path on the server", () => {
    const html = renderToString(<VoiceOrb />);
    expect(html).toContain('d="M');
    expect(html).not.toContain("undefined");
  });
});
