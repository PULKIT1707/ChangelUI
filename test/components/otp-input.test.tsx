import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "../../src/components/otp-input";

describe("OtpInput", () => {
  it("renders one labelled one-time-code input and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<OtpInput ref={ref} className="mt-4" />);
    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(ref.current?.className).toContain("mt-4");
  });

  it("filters input and calls onComplete (a11y)", () => {
    const onComplete = vi.fn();
    render(<OtpInput length={4} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "12a34" } });
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("renders on the server", () => {
    expect(renderToString(<OtpInput defaultValue="42" />)).toContain("4");
  });
});
