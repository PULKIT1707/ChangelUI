import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClarifyingQuestions, describeClarifyingAnswer, type ClarifyingQuestion } from "../../src/components/clarifying-questions";
const questions: ClarifyingQuestion[] = [
  { id: "range", prompt: "Which date range?", options: [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }], allowOther: true },
  { id: "format", prompt: "Which formats?", multiple: true, options: [{ value: "csv", label: "CSV" }, { value: "pdf", label: "PDF" }] },
];
describe("ClarifyingQuestions", () => {
  it("asks one question at a time, picks with number keys and submits the summary", () => {
    const onSubmit = vi.fn();
    const ref = createRef<HTMLElement>();
    render(<ClarifyingQuestions ref={ref} className="mt-4" questions={questions} onSubmit={onSubmit} autoAdvance={false} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("radiogroup", { name: "Which date range?" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("radio", { name: /Last 30 days/ }), { key: "2" });
    expect(screen.getByRole("radio", { name: /Last 30 days/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /CSV/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /PDF/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByText("CSV, PDF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));
    expect(onSubmit).toHaveBeenCalledWith({ range: { values: ["30d"], other: undefined }, format: { values: ["csv", "pdf"], other: undefined } });
  });
  it("supports Other and Skip", async () => {
    render(<ClarifyingQuestions questions={questions} autoAdvance={false} />);
    fireEvent.click(screen.getByRole("radio", { name: /Other/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Other answer" }), { target: { value: "This quarter" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("This quarter")).toBeInTheDocument();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
  });
  it("describes answers in plain text", () => {
    expect(describeClarifyingAnswer(questions[0]!, { values: ["7d"] })).toBe("Last 7 days");
    expect(describeClarifyingAnswer(questions[0]!, { values: [], skipped: true })).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<ClarifyingQuestions questions={questions} />)).toContain("Which date range?");
  });
});
