import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../src/components/context-menu";

function Menu({ onCopy }: { onCopy?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger tabIndex={0}>Canvas</ContextMenuTrigger>
      <ContextMenuContent label="Canvas actions">
        <ContextMenuItem onSelect={onCopy}>Copy</ContextMenuItem>
        <ContextMenuItem>Paste</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("opens at the pointer on contextmenu and runs items", () => {
    const onCopy = vi.fn();
    render(<Menu onCopy={onCopy} />);
    fireEvent.contextMenu(screen.getByText("Canvas"), { clientX: 40, clientY: 50 });
    const menu = screen.getByRole("menu", { name: "Canvas actions" });
    expect(menu).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("opens with Shift+F10 (a11y)", () => {
    render(<Menu />);
    fireEvent.keyDown(screen.getByText("Canvas"), { key: "F10", shiftKey: true });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders only the region on the server", () => {
    const html = renderToString(<Menu />);
    expect(html).toContain("Canvas");
    expect(html).not.toContain("Copy");
  });
});
