import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CandlestickChart } from "../../src/charts/candlestick-chart";

const rows = [{ t: "2026-01-02", o: 10, h: 12, l: 9, c: 11, v: 900 }, { t: "2026-01-05", o: 11, h: 13, l: 10, c: 10.5, v: 1200 }];

describe("CandlestickChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<CandlestickChart ref={ref} className="max-w-sm" data={rows} x="t" open="o" high="h" low="l" close="c" volume="v" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<CandlestickChart data={rows} x="t" open="o" high="h" low="l" close="c" volume="v" />);
    expect(html).toContain("aria-roledescription");
  });
});
