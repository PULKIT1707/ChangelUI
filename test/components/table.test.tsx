import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useTableSort } from "../../src/components/table";

describe("Table", () => {
  it("renders native semantics and aria-sort", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortable sortDirection="desc">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument();
  });
  it("useTableSort cycles asc, desc and unsorted", () => {
    const rows = [{ n: "b10" }, { n: "b2" }, { n: "a" }];
    const { result } = renderHook(() => useTableSort(rows));
    act(() => result.current.getSortProps("n").onSort?.());
    expect(result.current.rows.map((r) => r.n)).toEqual(["a", "b2", "b10"]);
    act(() => result.current.getSortProps("n").onSort?.());
    expect(result.current.rows.map((r) => r.n)).toEqual(["b10", "b2", "a"]);
    act(() => result.current.getSortProps("n").onSort?.());
    expect(result.current.sortKey).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<Table><TableBody><TableRow><TableCell>Server</TableCell></TableRow></TableBody></Table>)).toContain("Server");
  });
});
