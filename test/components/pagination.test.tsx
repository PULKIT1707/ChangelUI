import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Pagination, paginationRange } from "../../src/components/pagination";

describe("Pagination", () => {
  it("windows pages with ellipses", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(10, 20)).toEqual([1, "start-ellipsis", 9, 10, 11, "end-ellipsis", 20]);
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 20]);
  });

  it("marks the current page and moves with prev/next (a11y)", () => {
    const onPageChange = vi.fn();
    render(<Pagination count={10} defaultPage={3} onPageChange={onPageChange} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("renders on the server", () => {
    expect(renderToString(<Pagination count={4} />)).toContain("Page 1");
  });
});
