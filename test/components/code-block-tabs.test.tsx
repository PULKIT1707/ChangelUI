import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CodeBlockTabs, stripShellPrompts, type CodeTab } from "../../src/components/code-block-tabs";
const tabs: CodeTab[] = [
  { label: "npm", code: "$ npm install changelui", language: "bash" },
  { label: "pnpm", code: "$ pnpm add changelui", language: "bash" },
];
describe("stripShellPrompts", () => {
  it("drops prompts and output lines when prompts are present", () => {
    expect(stripShellPrompts("$ npm test\nok\n$ npm run build")).toBe("npm test\nnpm run build");
    expect(stripShellPrompts("npm test")).toBe("npm test");
  });
});
describe("CodeBlockTabs", () => {
  it("switches tabs with the keyboard and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    render(<CodeBlockTabs ref={ref} className="mt-4" tabs={tabs} onValueChange={onValueChange} />);
    expect(ref.current?.className).toContain("mt-4");
    const npm = screen.getByRole("tab", { name: "npm" });
    expect(npm).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(npm, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true");
    expect(onValueChange).toHaveBeenCalledWith("pnpm");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm add changelui");
  });
  it("syncs blocks that share a group", () => {
    render(
      <>
        <CodeBlockTabs group="test-pm" tabs={tabs} label="First" />
        <CodeBlockTabs group="test-pm" tabs={tabs} label="Second" />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getAllByRole("tab", { name: "pnpm" })[0]!);
    });
    for (const tab of screen.getAllByRole("tab", { name: "pnpm" })) expect(tab).toHaveAttribute("aria-selected", "true");
  });
  it("renders on the server with the first tab", () => {
    const html = renderToString(<CodeBlockTabs group="ssr" tabs={tabs} />);
    expect(html).toContain("install");
    expect(html).not.toContain("pnpm add");
  });
});
