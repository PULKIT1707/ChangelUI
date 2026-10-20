import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Terminal, TerminalLine } from "../../src/text/terminal";

describe("Terminal", () => {
  it("renders a labelled group, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Terminal ref={ref} title="zsh" className="mt-4">
        <TerminalLine type="command">npm test</TerminalLine>
      </Terminal>,
    );
    const root = screen.getByRole("group", { name: "zsh" });
    expect(ref.current).toBe(root);
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
  });

  it("keeps the full transcript readable (a11y)", () => {
    render(
      <Terminal trigger="mount" prompt="%">
        <TerminalLine type="command">npm test</TerminalLine>
        <TerminalLine>ok</TerminalLine>
      </Terminal>,
    );
    const pre = document.querySelector("pre");
    expect(pre?.textContent).toBe("% npm test\nok");
    expect(screen.getByRole("button", { name: "Copy command: npm test" })).toBeInTheDocument();
  });

  it("shows every line at once under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <Terminal lines={[{ type: "command", children: "ls" }, { children: "a.txt" }]} />
      </MotionConfig>,
    );
    expect(screen.getByRole("group")).toHaveAttribute("data-state", "complete");
  });

  it("renders the transcript on the server", () => {
    const html = renderToString(
      <Terminal>
        <TerminalLine type="command">npm run build</TerminalLine>
      </Terminal>,
    );
    expect(html).toContain("npm run build");
  });
});
