import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarList } from "../../src/charts/bar-list";
const rows = [
  { name: "Speed", a: 4, b: 0.2 },
  { name: "Range", a: 7, b: 0.4 },
  { name: "Comfort", a: 5, b: 0.3 },
];
const items = [
  { label: "/home", value: 420 },
  { label: "/pricing", value: 210 },
];
const cells = [
  { x: "Mon", y: "AM", v: 3 },
  { x: "Tue", y: "AM", v: 5 },
  { x: "Mon", y: "PM", v: 8 },
];
void rows;
void items;
void cells;
describe("BarList", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement & HTMLDivElement>();
    const { container } = render(<BarList ref={ref} className="max-w-sm" items={items} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders the final chart on the server", () => {
    const html = renderToString(<BarList items={items} />);
    expect(html).toContain('<ul');
  });
});
