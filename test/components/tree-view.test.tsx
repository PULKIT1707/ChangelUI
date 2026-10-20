import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TreeView, type TreeNode } from "../../src/components/tree-view";

const items: TreeNode[] = [
  { id: "src", label: "src", children: [{ id: "a", label: "app.tsx" }, { id: "b", label: "button.tsx" }] },
  { id: "readme", label: "README.md" },
];

describe("TreeView", () => {
  it("renders an APG tree with levels and expanded state", () => {
    render(<TreeView label="Files" items={items} defaultExpanded={["src"]} />);
    expect(screen.getByRole("tree", { name: "Files" })).toBeInTheDocument();
    const src = screen.getByRole("treeitem", { name: /src/ });
    expect(src).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: /app/ })).toHaveAttribute("aria-level", "2");
  });
  it("selects with Enter and calls onActivate", () => {
    const onSelectedChange = vi.fn();
    const onActivate = vi.fn();
    render(<TreeView items={items} onSelectedChange={onSelectedChange} onActivate={onActivate} />);
    const first = screen.getByRole("treeitem", { name: /src/ });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("treeitem", { name: /README/ }), { key: "Enter" });
    expect(onSelectedChange).toHaveBeenCalledWith(["readme"]);
    expect(onActivate).toHaveBeenCalled();
  });
  it("renders expanded-by-default nodes on the server", () => {
    expect(renderToString(<TreeView items={items} defaultExpanded={["src"]} />)).toContain("button.tsx");
  });
});
