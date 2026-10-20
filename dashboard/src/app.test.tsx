import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";
import { registryMeta } from "./registry/meta";

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("App shell", () => {
  // jsdom does not implement scrolling; navigation scrolls to the top.
  let scrollTo: { mockRestore: () => void } | undefined;
  beforeEach(() => {
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });
  afterEach(() => {
    scrollTo?.mockRestore();
    window.location.hash = "";
  });

  it("makes Skip to content the first tab stop and marks the active nav link", async () => {
    window.location.hash = "#/components/button";
    const user = userEvent.setup();
    render(<App />);
    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.getElementById("content")).toHaveFocus();
    expect(window.location.hash).toBe("#/components/button");

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Button" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /^Dialog/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
  });

  it("lists every docs entry in the sidebar, grouped in registry order", () => {
    window.location.hash = "#/docs/installation";
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(3 + registryMeta.length);
    expect(links.slice(0, 3).map((l) => l.textContent)).toEqual(["Introduction", "Installation", "Theming"]);
    expect(within(nav).getByRole("heading", { name: "Hooks & utils" })).toBeInTheDocument();
  });

  it("renders docs, item and not-found pages and moves focus to the h1 on navigation", async () => {
    window.location.hash = "#/docs/installation";
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Installation" })).toBeInTheDocument();
    expect(document.title).toBe("Installation · ChangelUI");

    go("#/docs/theming");
    const theming = screen.getByRole("heading", { level: 1, name: "Theming" });
    await waitFor(() => expect(theming).toHaveFocus());
    expect(document.title).toBe("Theming · ChangelUI");

    go("#/text/word-rotate");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "WordRotate" })).toHaveFocus());

    go("#/components/nope");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toHaveFocus());
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "#/");
  });

  it("opens the command palette from the search button", async () => {
    window.location.hash = "#/docs/installation";
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });
});
