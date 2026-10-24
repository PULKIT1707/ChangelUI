import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LogViewer, type LogLine } from "../../src/components/log-viewer";
const lines: LogLine[] = [
  { id: 1, time: Date.UTC(2026, 0, 1, 9, 30, 5, 120), level: "info", message: "Compiling 42 modules", source: "vite" },
  { id: 2, time: "09:30:06", level: "warn", message: "Chunk larger than 500 kB" },
  { id: 3, level: "error", message: "Failed to resolve import" },
];
describe("LogViewer", () => {
  it("renders lines with level counts and UTC times and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<LogViewer ref={ref} className="mt-4" title="Build" lines={lines} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("log", { name: "Build lines" })).toBeInTheDocument();
    expect(screen.getByText("09:30:05.120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warn 1/ })).toHaveAttribute("aria-pressed", "true");
  });
  it("filters by level and search", () => {
    render(<LogViewer lines={lines} />);
    fireEvent.click(screen.getByRole("button", { name: /error 1/ }));
    expect(screen.queryByText("Failed to resolve import")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search logs" }), { target: { value: "chunk" } });
    expect(screen.getByText("1 of 3 lines")).toBeInTheDocument();
    expect(screen.getByText("Chunk").tagName).toBe("MARK");
  });
  it("renders on the server", () => {
    expect(renderToString(<LogViewer lines={lines} />)).toContain("Compiling 42 modules");
  });
});
