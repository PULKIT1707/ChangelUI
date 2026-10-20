import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SortableItem, SortableList } from "../../src/components/sortable-list";

const list = (onValuesChange = () => {}, ref?: React.Ref<HTMLUListElement>) => (
  <SortableList ref={ref} values={["a", "b", "c"]} onValuesChange={onValuesChange} className="mt-4">
    {["a", "b", "c"].map((v) => (
      <SortableItem key={v} value={v}>
        {v}
      </SortableItem>
    ))}
  </SortableList>
);

describe("SortableList", () => {
  it("renders a list, forwards the ref and merges className", () => {
    const ref = createRef<HTMLUListElement>();
    render(list(undefined, ref));
    expect(ref.current?.tagName).toBe("UL");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("moves an item with the keyboard", () => {
    const onValuesChange = vi.fn();
    render(list(onValuesChange));
    const first = screen.getByText("a");
    fireEvent.keyDown(first, { key: " " });
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(onValuesChange).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("renders on the server", () => {
    expect(renderToString(list())).toContain("b");
  });
});
