import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpandableSearch } from "../../src/components/expandable-search";

describe("ExpandableSearch", () => {
  it("forwards the ref and starts collapsed", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ExpandableSearch ref={ref} className="mt-4" />);
    expect(ref.current).toHaveAttribute("role", "search");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-expanded", "false");
  });

  it("expands on click and shows the field", () => {
    render(<ExpandableSearch />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("combobox", { name: "Search" })).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<ExpandableSearch label="Find" />)).toContain("Find");
  });
});
