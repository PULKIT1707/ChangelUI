import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../../src/components/empty-state";
describe("EmptyState", () => {
  it("renders default copy, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<EmptyState ref={ref} className="mt-4" />);
    expect(screen.getByRole("heading", { name: "Nothing here yet" })).toBeInTheDocument();
    expect(ref.current?.className).toContain("mt-4");
    expect(ref.current).toHaveAttribute("data-variant", "no-data");
    expect(ref.current).not.toHaveAttribute("role");
  });
  it("echoes the query and clears filters (a11y)", () => {
    const onClearFilters = vi.fn();
    render(<EmptyState variant="no-results" query="invoices" onClearFilters={onClearFilters} />);
    expect(screen.getByRole("status", { name: "No results for “invoices”" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
  it("offers a retry for errors and renders custom actions", () => {
    const onRetry = vi.fn();
    render(<EmptyState variant="error" onRetry={onRetry} actions={<button type="button">Contact support</button>} titleAs="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Contact support" })).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<EmptyState title="Server" />)).toContain("Server");
  });
});
