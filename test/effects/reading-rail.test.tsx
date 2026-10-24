import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { layoutRailNodes, ReadingRail } from "../../src/effects/reading-rail";

const sections = [
  { id: "rr-intro", label: "Intro" },
  { id: "rr-setup", label: "Setup" },
  { id: "rr-ship", label: "Ship it" },
];

function Article() {
  return (
    <>
      <h2 id="rr-intro">Intro</h2>
      <p>One two three four five.</p>
      <h2 id="rr-setup">Setup</h2>
      <h2 id="rr-ship">Ship it</h2>
    </>
  );
}

describe("ReadingRail", () => {
  it("renders a labelled nav with one link per section and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ReadingRail ref={ref} sections={sections} className="mt-4">
        <Article />
      </ReadingRail>,
    );
    expect(ref.current?.className).toContain("mt-4");
    const nav = screen.getByRole("navigation", { name: "Reading progress" });
    expect(nav.querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute("aria-current", "location");
  });

  it("uses one tab stop and moves focus with the arrow keys (a11y)", () => {
    render(
      <ReadingRail sections={sections}>
        <Article />
      </ReadingRail>,
    );
    const intro = screen.getByRole("link", { name: "Intro" });
    expect(intro).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("tabindex", "-1");
    intro.focus();
    fireEvent.keyDown(intro, { key: "End" });
    expect(screen.getByRole("link", { name: "Ship it" })).toHaveFocus();
  });

  it("keeps nodes apart", () => {
    const ys = layoutRailNodes([0, 0.01, 0.02, 1], 100, 20);
    for (let i = 1; i < ys.length; i += 1) expect((ys[i] ?? 0) - (ys[i - 1] ?? 0)).toBeGreaterThanOrEqual(20);
    expect(ys[ys.length - 1]).toBeLessThanOrEqual(100);
  });

  it("renders on the server", () => {
    const html = renderToString(
      <ReadingRail sections={sections}>
        <Article />
      </ReadingRail>,
    );
    expect(html).toContain('aria-label="Reading progress"');
  });
});
