import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard, moveKanbanCard } from "../../src/components/kanban-board";
const columns = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress", limit: 1 },
];
const cards = [
  { id: "a", columnId: "todo", title: "Write spec" },
  { id: "b", columnId: "todo", title: "Fix login" },
  { id: "c", columnId: "doing", title: "Ship docs" },
];
describe("KanbanBoard", () => {
  it("renders columns with counts, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<KanbanBoard ref={ref} className="mt-4" columns={columns} defaultCards={cards} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("heading", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByText(/limit 1/)).toBeInTheDocument();
  });
  it("moves a card across columns with the keyboard and announces it", () => {
    const onCardsChange = vi.fn();
    render(<KanbanBoard columns={columns} defaultCards={cards} onCardsChange={onCardsChange} />);
    const card = screen.getByRole("button", { name: "Fix login" });
    fireEvent.keyDown(card, { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("Picked up Fix login");
    fireEvent.keyDown(screen.getByRole("button", { name: "Fix login" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Fix login" }), { key: " " });
    expect(onCardsChange).toHaveBeenCalledWith(expect.any(Array), { cardId: "b", fromColumnId: "todo", toColumnId: "doing", index: 1 });
    expect(screen.getByText(/over the limit/)).toBeInTheDocument();
  });
  it("refuses moves into a full column with enforceLimits and cancels with Escape", () => {
    const onCardsChange = vi.fn();
    render(<KanbanBoard columns={columns} defaultCards={cards} onCardsChange={onCardsChange} enforceLimits />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Write spec" }), { key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: "Write spec" }), { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("In progress is at its limit");
    fireEvent.keyDown(screen.getByRole("button", { name: "Write spec" }), { key: "Escape" });
    expect(onCardsChange).not.toHaveBeenCalled();
  });
  it("moves cards in the data", () => {
    expect(moveKanbanCard(cards, "a", { columnId: "doing", index: 0 }).map((c) => `${c.id}:${c.columnId}`)).toEqual(["b:todo", "a:doing", "c:doing"]);
  });
  it("renders on the server", () => {
    expect(renderToString(<KanbanBoard columns={columns} defaultCards={cards} />)).toContain("Write spec");
  });
});
