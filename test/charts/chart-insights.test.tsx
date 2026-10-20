import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartInsights, rankInsights } from "../../src/charts/chart-insights";
import { Chart, LineSeries } from "../../src/charts/chart";
const ys = [10, 11, 10, 12, 11, 40, 11, 12, 11, 10];
describe("ChartInsights", () => {
  it("ranks the spike first", () => {
    const ranked = rankInsights(ys, { xLabel: (i) => `#${i}`, format: String });
    expect(ranked[0]?.insight.type).toBe("anomaly");
  });
  it("renders a list inside a chart", () => {
    const data = ys.map((v, i) => ({ i, v }));
    const { getByRole } = render(
      <Chart data={data} x="i">
        <LineSeries id="v" y="v" />
        <ChartInsights list="bottom" />
      </Chart>,
    );
    expect(getByRole("list", { name: "Insights" })).toBeTruthy();
  });
});
