import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HoldToConfirm } from "../../src/components/hold-to-confirm";
describe("HoldToConfirm", () => {
  it("renders a button with defaults, merges className and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <HoldToConfirm ref={ref} className="mt-4" onConfirm={() => {}}>
        Delete
      </HoldToConfirm>,
    );
    const button = screen.getByRole("button", { name: /Delete/ });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("data-state", "idle");
    expect(button).toHaveAttribute("data-tone", "danger");
    expect(button.className).toContain("mt-4");
  });
  it("describes the hold gesture (a11y)", () => {
    render(<HoldToConfirm onConfirm={() => {}} hintLabel="Hold to confirm" />);
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Hold to confirm");
  });
  it("renders on the server", () => {
    expect(renderToString(<HoldToConfirm onConfirm={() => {}}>Server</HoldToConfirm>)).toContain("Server");
  });
});
