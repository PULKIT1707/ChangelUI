import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageCompare } from "../../src/components/image-compare";

describe("ImageCompare", () => {
  it("forwards the ref and exposes the divider as a slider", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ImageCompare ref={ref} className="mt-4" before={<div>Old</div>} after={<div>New</div>} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("slider", { name: "Comparison divider" })).toHaveAttribute("aria-valuenow", "50");
  });

  it("moves with the arrow keys", () => {
    render(<ImageCompare before={<div>Old</div>} after={<div>New</div>} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(slider).toHaveAttribute("aria-valuenow", "60");
  });

  it("renders on the server at defaultPosition", () => {
    expect(renderToString(<ImageCompare before="a.png" after="b.png" defaultPosition={30} />)).toContain('aria-valuenow="30"');
  });
});
