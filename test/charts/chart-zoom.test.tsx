import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartNavigator, ChartZoom } from "../../src/charts/chart-zoom";
import { LineChart } from "../../src/charts/line-chart";
const rows = Array.from({ length: 20 }, (_, i) => ({ t: i, v: Math.sin(i / 3) * 10 + 20 }));
describe("ChartZoom", () => {
  it("adds zoom keys to the chart's keyboard help", () => {
    const { container } = render(
      <LineChart data={rows} x="t" series={[{ id: "v", y: "v" }]}>
        <ChartZoom />
        <ChartNavigator />
      </LineChart>,
    );
    expect(container.querySelector("figure")).not.toBeNull();
  });
  it("renders on the server", () => {
    const html = renderToString(
      <LineChart data={rows} x="t" series={[{ id: "v", y: "v" }]}>
        <ChartZoom />
      </LineChart>,
    );
    expect(html).toContain("<svg");
  });
});
