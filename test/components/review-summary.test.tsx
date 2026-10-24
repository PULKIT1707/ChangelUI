import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewSummary } from "../../src/components/review-summary";
const COUNTS = { 5: 60, 4: 25, 3: 10, 2: 0, 1: 5 };
describe("ReviewSummary", () => {
  it("shows the average and total, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ReviewSummary ref={ref} counts={COUNTS} animate={false} className="mt-4" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    expect(container.querySelector("[data-pui-review-average]")).toHaveTextContent("4.4");
    expect(screen.getByText("100 reviews")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 stars: 0 reviews, 0%" })).toBeDisabled();
  });
  it("filters by star row and clears with the chip (a11y)", () => {
    const onChange = vi.fn();
    render(<ReviewSummary counts={COUNTS} animate={false} onValueChange={onChange} />);
    const four = screen.getByRole("button", { name: "4 stars: 25 reviews, 25%" });
    fireEvent.click(four);
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(four).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 25 4-star reviews");
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: 4 stars" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
  it("toggles topics and moves between rows with arrows", () => {
    const onTopic = vi.fn();
    render(<ReviewSummary counts={COUNTS} animate={false} topics={[{ id: "fit", label: "Fit", count: 12, sentiment: "negative" }]} onTopicChange={onTopic} />);
    fireEvent.click(screen.getByRole("button", { name: /Fit/ }));
    expect(onTopic).toHaveBeenLastCalledWith("fit");
    const five = screen.getByRole("button", { name: /^5 stars/ });
    five.focus();
    fireEvent.keyDown(five, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: /^4 stars/ })).toHaveFocus();
  });
  it("renders on the server", () => {
    expect(renderToString(<ReviewSummary counts={COUNTS} />)).toContain("Customer reviews");
  });
});
