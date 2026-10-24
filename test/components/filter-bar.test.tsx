import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FilterBar, filterRows, type FilterBarValue, type FilterField } from "../../src/components/filter-bar";
const fields: FilterField[] = [
  { id: "status", label: "Status", options: [{ value: "todo", label: "Todo" }, { value: "done", label: "Done" }] },
  { id: "title", label: "Title", type: "text" },
];
const rows = [
  { title: "Fix login", status: "todo" },
  { title: "Write docs", status: "done" },
  { title: "Fix billing", status: "done" },
];
const get = (row: (typeof rows)[number], field: string) => (field === "status" ? row.status : field === "title" ? row.title : null);
describe("FilterBar", () => {
  it("flips the operator and removes a chip", () => {
    const onValueChange = vi.fn();
    const ref = createRef<HTMLDivElement>();
    render(
      <FilterBar
        ref={ref}
        fields={fields}
        defaultValue={{ query: "", filters: [{ field: "status", operator: "is", values: ["todo"] }] }}
        onValueChange={onValueChange}
        resultCount={1}
      />,
    );
    expect(ref.current).toHaveAttribute("role", "group");
    expect(screen.getByRole("status")).toHaveTextContent("1 result");
    fireEvent.click(screen.getByRole("button", { name: /Status is\. Switch to is not/ }));
    expect(onValueChange).toHaveBeenLastCalledWith({ query: "", filters: [{ field: "status", operator: "is_not", values: ["todo"] }] });
    fireEvent.click(screen.getByRole("button", { name: "Remove Status filter" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ query: "", filters: [] });
  });
  it("marks a view as unsaved when the filters drift", () => {
    const onSaveView = vi.fn();
    const views = [{ id: "all", label: "All", value: { query: "", filters: [] } }];
    render(<FilterBar fields={fields} views={views} defaultView="all" onSaveView={onSaveView} />);
    expect(screen.queryByRole("button", { name: "Save view" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search rows" }), { target: { value: "fix" } });
    expect(screen.getByRole("radio", { name: /All.*unsaved changes/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    expect(onSaveView).toHaveBeenCalledWith({ query: "fix", filters: [] }, "all");
  });
  it("filters rows", () => {
    const value: FilterBarValue = { query: "fix", filters: [{ field: "status", operator: "is_not", values: ["todo"] }] };
    expect(filterRows(rows, value, get, (r) => r.title).map((r) => r.title)).toEqual(["Fix billing"]);
    expect(filterRows(rows, { query: "", filters: [{ field: "title", operator: "contains", values: ["DOCS"] }] }, get)).toHaveLength(1);
  });
  it("renders on the server", () => {
    expect(renderToString(<FilterBar fields={fields} />)).toContain("Filter");
  });
});
