import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Kbd } from "../../src/components/kbd";

describe("Kbd", () => {
  it("renders a native kbd with sizes and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = render(<Kbd ref={ref}>K</Kbd>);
    const kbd = screen.getByText("K");
    expect(kbd.tagName).toBe("KBD");
    expect(ref.current).toBe(kbd);
    expect(kbd.className).toContain("h-5");
    expect(kbd.className).toContain("box-border");
    rerender(
      <Kbd size="md" className="font-sans">
        K
      </Kbd>,
    );
    expect(kbd.className).toContain("h-6");
    expect(kbd.className).toContain("font-sans");
    expect(kbd.className).not.toContain("font-mono");
  });
});
