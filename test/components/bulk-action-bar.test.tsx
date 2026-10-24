import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BulkActionBar } from "../../src/components/bulk-action-bar";
const actions = (onArchive = vi.fn()) => [
  { id: "archive", label: "Archive", onClick: onArchive },
  { id: "label", label: "Label", onClick: vi.fn() },
  { id: "export", label: "Export", onClick: vi.fn() },
  { id: "delete", label: "Delete", tone: "danger" as const, onClick: vi.fn() },
];
describe("BulkActionBar", () => {
  it("renders a toolbar with the count, select-all step and overflow menu", () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectAll = vi.fn();
    const onArchive = vi.fn();
    render(<BulkActionBar ref={ref} className="mt-4" count={3} total={248} onSelectAll={onSelectAll} onClear={vi.fn()} actions={actions(onArchive)} />);
    const toolbar = screen.getByRole("toolbar", { name: "Bulk actions" });
    expect(ref.current).toBe(toolbar);
    expect(toolbar.className).toContain("mt-4");
    expect(screen.getByRole("status")).toHaveTextContent("3 items selected");
    fireEvent.click(screen.getByRole("button", { name: "Select all 248" }));
    expect(onSelectAll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });
  it("clears with Escape but not while typing", () => {
    const onClear = vi.fn();
    render(
      <>
        <input aria-label="Search" />
        <BulkActionBar count={1} onClear={onClear} actions={actions()} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "Escape" });
    expect(onClear).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
  it("moves focus with arrow keys", () => {
    render(<BulkActionBar count={2} onClear={vi.fn()} actions={actions()} />);
    const archive = screen.getByRole("button", { name: "Archive" });
    archive.focus();
    fireEvent.keyDown(archive, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Label" })).toHaveFocus();
  });
  it("hides at zero and renders on the server", () => {
    render(<BulkActionBar count={0} onClear={vi.fn()} actions={actions()} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(renderToString(<BulkActionBar count={2} onClear={() => {}} actions={actions()} />)).toContain("selected");
  });
});
