import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiffViewer, diffLines } from "../../src/components/diff-viewer";

const before = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"].join("\n");
const after = ["a", "b", "c", "d", "e", "F", "g", "h", "i", "j", "k"].join("\n");

describe("DiffViewer", () => {
  it("diffs lines with numbers", () => {
    expect(diffLines("a\nb\nc", "a\nx\nc")).toEqual([
      { type: "equal", text: "a", oldNumber: 1, newNumber: 1 },
      { type: "remove", text: "b", oldNumber: 2 },
      { type: "add", text: "x", newNumber: 2 },
      { type: "equal", text: "c", oldNumber: 3, newNumber: 3 },
    ]);
    expect(diffLines("", "a\n")).toEqual([{ type: "add", text: "a", newNumber: 1 }]);
  });

  it("shows stats, collapses unchanged lines and expands them, forwarding the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<DiffViewer ref={ref} className="mt-4" oldValue={before} newValue={after} context={1} fileName="list.txt" />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByText("1 added, 1 removed")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Changes to list.txt" })).toBeInTheDocument();
    const gaps = screen.getAllByRole("button", { name: /Show \d+ unchanged lines/ });
    expect(gaps).toHaveLength(2);
    const rowsBefore = screen.getAllByRole("row").length;
    fireEvent.click(gaps[0]!);
    expect(screen.getAllByRole("row").length).toBeGreaterThan(rowsBefore);
    expect(screen.getAllByRole("button", { name: /Show \d+ unchanged lines/ })).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 4 unchanged lines");
  });

  it("switches to split view and labels changes for screen readers (a11y)", () => {
    render(<DiffViewer oldValue={"one\ntwo"} newValue={"one\nthree"} />);
    expect(screen.getByText("Removed:")).toBeInTheDocument();
    expect(screen.getByText("Added:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Split" }));
    expect(screen.getByRole("table")).toHaveAttribute("data-view", "split");
  });

  it("renders on the server", () => {
    expect(renderToString(<DiffViewer oldValue="a" newValue="b" />)).toContain("Unified");
  });
});
