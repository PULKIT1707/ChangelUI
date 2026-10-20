import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estimatePasswordStrength, PasswordInput } from "../../src/components/password-input";

describe("PasswordInput", () => {
  it("forwards the ref to the input and merges className", () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} aria-label="Password" className="mt-4" />);
    expect(ref.current?.type).toBe("password");
    expect(ref.current?.className).toContain("mt-4");
  });

  it("reveals with a pressed toggle and shows a meter (a11y)", () => {
    render(<PasswordInput aria-label="Password" strength defaultValue="Tr0ub4dor&3xyz" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("meter", { name: "Password strength" })).toBeInTheDocument();
  });

  it("estimates strength", () => {
    expect(estimatePasswordStrength("abc")).toBe(0);
    expect(estimatePasswordStrength("correct-Horse-battery-9")).toBe(4);
  });

  it("renders on the server", () => {
    expect(renderToString(<PasswordInput aria-label="Server" />)).toContain("password");
  });
});
