import { render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Reveal, revealPresets } from "../../src/effects/reveal";

describe("Reveal", () => {
  it("revealPresets offsets the directional presets by distance", () => {
    const presets = revealPresets(24);
    expect(presets["fade-up"].hidden).toEqual({ opacity: 0, y: 24 });
    expect(presets["fade-down"].hidden).toEqual({ opacity: 0, y: -24 });
    expect(presets["fade-left"].hidden).toEqual({ opacity: 0, x: 24 });
    expect(presets["fade-right"].hidden).toEqual({ opacity: 0, x: -24 });
    expect(presets.scale.visible).toEqual({ opacity: 1, scale: 1 });
    expect(Object.keys(presets)).toEqual(["fade", "fade-up", "fade-down", "fade-left", "fade-right", "blur", "scale"]);
  });

  it("renders the requested tag and becomes visible in view", async () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Reveal ref={ref} as="article" preset="fade" className="p-2">
        Hello
      </Reveal>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("ARTICLE");
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("p-2");
    expect(root).toHaveAttribute("data-preset", "fade");
    await waitFor(() => expect(root).toHaveAttribute("data-state", "visible"));
    await waitFor(() => expect(root.style.opacity).toBe("1"));
  });

  it('trigger="mount" is visible immediately', () => {
    const { container } = render(<Reveal trigger="mount">Now</Reveal>);
    expect(container.firstElementChild).toHaveAttribute("data-state", "visible");
  });
});
