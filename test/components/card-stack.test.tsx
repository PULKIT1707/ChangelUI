import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardStack } from "../../src/components/card-stack";

const items = ["One", "Two", "Three"];

describe("CardStack", () => {
  it("renders a labelled region, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardStack ref={ref} items={items} renderCard={(t) => <p>{t}</p>} className="mt-4" />);
    const region = screen.getByRole("region", { name: "Card stack" });
    expect(ref.current).toBe(region);
    expect(region.className).toContain("box-border");
    expect(region.className).toContain("mt-4");
  });
  it("renders Skip, Undo and Like buttons (a11y)", () => {
    render(<CardStack items={items} renderCard={(t) => <p>{t}</p>} />);
    expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Like" })).toBeEnabled();
  });
  it("renders on the server", () => {
    expect(renderToString(<CardStack items={items} renderCard={(t) => <p>{t}</p>} />)).toContain("One");
  });
});
