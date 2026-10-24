import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estimatePrice, PricingEstimator, type PricingTier } from "../../src/components/pricing-estimator";

const tiers: PricingTier[] = [
  { upTo: 1000, unitPrice: 0 },
  { upTo: 10000, unitPrice: 0.01 },
  { upTo: null, unitPrice: 0.005 },
];

describe("estimatePrice", () => {
  it("prices graduated tiers unit by unit", () => {
    const result = estimatePrice(tiers, 20000);
    expect(result.tierIndex).toBe(2);
    expect(result.lines.map((line) => line.quantity)).toEqual([1000, 9000, 10000]);
    expect(result.total).toBeCloseTo(90 + 50);
  });

  it("prices volume tiers at the reached rate", () => {
    expect(estimatePrice(tiers, 5000, "volume").total).toBeCloseTo(50);
    expect(estimatePrice(tiers, 0, "volume").lines).toHaveLength(0);
  });
});

describe("PricingEstimator", () => {
  it("renders a labelled slider and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PricingEstimator ref={ref} tiers={tiers} defaultValue={5000} unitLabel="events" className="mt-4" />);
    expect(ref.current?.className).toContain("mt-4");
    const slider = screen.getByRole("slider", { name: "Monthly usage" });
    expect(slider).toHaveAttribute("aria-valuetext", "5,000 events");
  });

  it("marks the current tier and offers a billing switch (a11y)", () => {
    render(<PricingEstimator tiers={tiers} defaultValue={5000} yearlyDiscount={0.2} />);
    const current = screen.getByRole("list", { name: "Tiers" }).querySelector('[aria-current="true"]');
    expect(current).toHaveTextContent("$0.01");
    expect(screen.getByRole("radiogroup", { name: "Billing period" })).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<PricingEstimator tiers={tiers} defaultValue={2000} />)).toContain("Estimate your cost");
  });
});
