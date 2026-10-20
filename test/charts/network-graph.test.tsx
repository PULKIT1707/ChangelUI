import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NetworkGraph } from "../../src/charts/network-graph";
const nodes = [{ id: "a", label: "Ads" }, { id: "b", label: "Signup" }, { id: "c", label: "Paid" }];
const links = [
  { source: "a", target: "b", value: 40 },
  { source: "b", target: "c", value: 12 },
];
describe("NetworkGraph", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<NetworkGraph ref={ref} className="max-w-sm" nodes={nodes} links={links} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders on the server", () => {
    const html = renderToString(<NetworkGraph nodes={nodes} links={links} />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
