import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonViewer, jsonMatches } from "../../src/components/json-viewer";
const data = { user: { name: "Ada", tags: ["math", "code"] }, active: true };
describe("JsonViewer", () => {
  it("renders a tree, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<JsonViewer ref={ref} className="mt-4" data={data} />);
    expect(screen.getByRole("tree", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getAllByRole("treeitem")).toHaveLength(3);
    expect(ref.current?.className).toContain("mt-4");
  });
  it("expands with the keyboard and opens search matches (a11y)", () => {
    const { rerender } = render(<JsonViewer data={data} />);
    const root = screen.getAllByRole("treeitem")[0] as HTMLElement;
    root.focus();
    fireEvent.keyDown(root, { key: "ArrowDown" });
    const user = screen.getAllByRole("treeitem")[1] as HTMLElement;
    expect(user).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(user, { key: "ArrowRight" });
    expect(user).toHaveAttribute("aria-expanded", "true");
    rerender(<JsonViewer data={data} defaultExpandDepth={0} search="code" />);
    expect(document.querySelector('[data-match=""]')).toHaveAttribute("data-path", "$.user.tags[1]");
  });
  it("finds matching paths", () => {
    expect(jsonMatches(data, "NAME")).toEqual(["$.user.name"]);
  });
  it("renders on the server", () => {
    expect(renderToString(<JsonViewer data={{ server: 1 }} />)).toContain("server");
  });
});
