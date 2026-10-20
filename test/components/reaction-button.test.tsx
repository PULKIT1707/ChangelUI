import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReactionButton } from "../../src/components/reaction-button";
describe("ReactionButton", () => {
  it("toggles aria-pressed, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ReactionButton ref={ref} className="mt-4" count={4} />);
    const button = screen.getByRole("button", { name: /Like/ });
    expect(ref.current?.className).toContain("mt-4");
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
  it("opens the reaction tray with ArrowUp (a11y)", () => {
    render(<ReactionButton reactions={[{ value: "love", emoji: "L", label: "Love" }]} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Like/ }), { key: "ArrowUp" });
    expect(screen.getByRole("menu", { name: "Reactions" })).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<ReactionButton label="Server" />)).toContain("Server");
  });
});
