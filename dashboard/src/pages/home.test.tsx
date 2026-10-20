import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../app";
import { registryMeta } from "../registry/meta";

// Counts come from the registry, so adding an item needs no edit here.
const total = registryMeta.length;
const text = registryMeta.filter((meta) => meta.category === "text");

describe("Home", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("renders every bento card and filters through #/?filter=", async () => {
    window.location.hash = "#/";
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tiny, accessible React");
    const gallery = screen.getByRole("list", { name: "Gallery items" });
    expect(within(gallery).getAllByTestId("bento-card")).toHaveLength(total);
    expect(screen.getByTestId("gallery-count")).toHaveTextContent(`${total} items`);
    // Minis load lazily (the IntersectionObserver mock reports every card in view).
    await waitFor(() => expect(gallery.querySelectorAll("[data-loaded]")).toHaveLength(total));
    for (const mini of gallery.querySelectorAll("[data-loaded]")) expect(mini).toHaveAttribute("inert");

    await user.click(screen.getByRole("radio", { name: "Text" }));
    await waitFor(() => expect(window.location.hash).toBe("#/?filter=text"));
    await waitFor(() => expect(within(gallery).getAllByTestId("bento-card")).toHaveLength(text.length));
    expect(screen.getByTestId("gallery-count")).toHaveTextContent(`${text.length} items`);
    expect(screen.getByRole("radio", { name: "Text" })).toHaveAttribute("aria-checked", "true");
    const first = within(gallery).getAllByTestId("bento-card")[0];
    expect(first).toHaveAttribute("href", `#/text/${text[0]?.slug ?? ""}`);
  });

  it("falls back to all for an unknown filter", () => {
    window.location.hash = "#/?filter=widgets";
    render(<App />);
    expect(within(screen.getByRole("list", { name: "Gallery items" })).getAllByTestId("bento-card")).toHaveLength(total);
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  });
});
