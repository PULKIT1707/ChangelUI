import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UsageMeter, usageStatus } from "../../src/components/usage-meter";
describe("UsageMeter", () => {
  it("renders a labelled meter, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<UsageMeter ref={ref} className="mt-4" label="Storage" value={4} max={10} unit="GB" />);
    const meter = screen.getByRole("meter", { name: "Storage" });
    expect(meter).toHaveAttribute("aria-valuenow", "4");
    expect(meter).toHaveAttribute("aria-valuetext", "4 GB of 10 GB (40%)");
    expect(ref.current?.className).toContain("mt-4");
    expect(ref.current).toHaveAttribute("data-status", "ok");
  });
  it("sums segments, lists them and flags overage (a11y)", () => {
    render(
      <UsageMeter
        label="Seats"
        max={10}
        segments={[
          { label: "Admins", value: 4 },
          { label: "Members", value: 8 },
        ]}
      />,
    );
    expect(screen.getByRole("meter", { name: "Seats" })).toHaveAttribute("aria-valuetext", expect.stringContaining("2 over the limit"));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2 over your limit")).toBeInTheDocument();
  });
  it("derives status from thresholds", () => {
    expect(usageStatus(5, 10)).toBe("ok");
    expect(usageStatus(8, 10)).toBe("warning");
    expect(usageStatus(9.6, 10)).toBe("critical");
    expect(usageStatus(11, 10)).toBe("over");
  });
  it("renders on the server", () => {
    expect(renderToString(<UsageMeter label="Server" value={1} max={2} />)).toContain("Server");
  });
});
