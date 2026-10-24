import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FeedbackWidget } from "../../src/components/feedback-widget";
describe("FeedbackWidget", () => {
  it("renders the question and a labelled scale, forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FeedbackWidget ref={ref} className="mt-4" />);
    expect(ref.current).toHaveAttribute("data-state", "rate");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("group", { name: "Was this page helpful?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Very helpful" })).toBeInTheDocument();
  });
  it("rates, moves focus to the comment and submits (a11y)", () => {
    const onRate = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<FeedbackWidget onRate={onRate} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
    expect(onRate).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
    const field = screen.getByLabelText("What helped most? (optional)");
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: "  Clear examples " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: 3, comment: "Clear examples" }));
    expect(container.firstElementChild).toHaveAttribute("data-state", "done");
  });
  it("skips the comment step when comment is false", () => {
    const onSubmit = vi.fn();
    const { container } = render(<FeedbackWidget comment={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: 1, comment: "" }));
    expect(container.firstElementChild).toHaveAttribute("data-state", "done");
  });
  it("renders on the server", () => {
    expect(renderToString(<FeedbackWidget />)).toContain("Was this page helpful?");
  });
});
