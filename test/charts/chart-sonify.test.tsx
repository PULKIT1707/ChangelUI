import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartSonify, pitchFor } from "../../src/charts/chart-sonify";
describe("ChartSonify", () => {
  it("maps values to a log pitch range", () => {
    expect(pitchFor(0, 0, 1)).toBeCloseTo(220);
    expect(pitchFor(1, 0, 1)).toBeCloseTo(880);
    expect(pitchFor(0.5, 0, 1)).toBeCloseTo(440);
  });
  it("renders a labelled control group", () => {
    const { getByRole } = render(<ChartSonify values={[1, 3, 2, 5]} label="Sales" />);
    expect(getByRole("group", { name: "Listen to Sales" })).toBeTruthy();
  });
});
