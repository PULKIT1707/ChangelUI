import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RollingNumber } from "../../src/text/rolling-number";
describe("RollingNumber", () => {
  it("forwards the ref, merges className and exposes the formatted value (a11y)", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<RollingNumber ref={ref} value={1234.5} format={{ style: "currency", currency: "USD" }} className="mt-4" />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByText("$1,234.50")).toHaveClass("sr-only");
  });
  it("renders the final digits on the server", () => {
    const html = renderToString(<RollingNumber value={42} />);
    expect(html).toContain("42");
  });
});
