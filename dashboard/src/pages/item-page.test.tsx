import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../app";
import { groupPropDocs } from "../components/props-table";
import { analytics } from "../lib/analytics/client";

describe("ItemPage", () => {
  afterEach(() => {
    window.location.hash = "";
    vi.restoreAllMocks();
  });

  it("syncs controls to the preview and the snippet in the same render", async () => {
    window.location.hash = "#/components/button";
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Button" })).toBeInTheDocument();
    expect(screen.getByTestId("import-line")).toHaveTextContent('import { Button } from "changelui";');

    const variant = await screen.findByLabelText("Variant");
    // An sr-only h2 keeps demo h3s in a valid heading order.
    expect(screen.getByRole("heading", { level: 2, name: "Preview" })).toHaveClass("sr-only");
    const stage = screen.getByRole("region", { name: "Preview" });
    const main = within(stage).getByRole("button", { name: /Get started/ });
    expect(main).toHaveAttribute("data-variant", "solid");
    expect(screen.getByTestId("snippet")).toHaveTextContent("<Button>");

    await user.selectOptions(variant, "outline");
    expect(screen.getByTestId("snippet").textContent).toContain('variant="outline"');
    expect(within(stage).getByRole("button", { name: /Get started/ })).toHaveAttribute("data-variant", "outline");

    await user.click(screen.getByRole("switch", { name: "Loading" }));
    expect(screen.getByTestId("snippet").textContent).toContain("loading");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("snippet").textContent).not.toContain("variant=");
    expect(within(stage).getByRole("button", { name: /Get started/ })).toHaveAttribute("data-variant", "solid");

    // Props table, keyboard notes and prev/next.
    expect(screen.getByRole("table", { name: "Button props" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Keyboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Previous\s*Badge/ })).toHaveAttribute("href", "#/components/badge");
    expect(screen.getByRole("link", { name: /Next\s*Card/ })).toHaveAttribute("href", "#/components/card");
    await waitFor(() => expect(screen.getByText("Motion")).toBeInTheDocument());
    expect(screen.getByText("Client")).toBeInTheDocument();
  });

  it("deep-links ?tab=code and lists the item file plus its Also copy files", async () => {
    window.location.hash = "#/components/button?tab=code";
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    const files = await screen.findByRole("tablist", { name: "Source files" });
    const fileTabs = within(files).getAllByRole("tab");
    expect(fileTabs[0]).toHaveTextContent("components/button.tsx");
    expect(fileTabs.map((t) => t.textContent)).toContain("lib/cn.ts");
    expect(screen.getByRole("button", { name: "Copy src/components/button.tsx" })).toBeInTheDocument();
    expect(screen.getByTestId("source-code")).toHaveTextContent("forwardRef");
    expect(screen.getByText(/npm install motion clsx tailwind-merge/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Preview" }));
    await waitFor(() => expect(window.location.hash).toBe("#/components/button"));
    expect(await screen.findByRole("region", { name: "Preview" })).toBeInTheDocument();
  });

  it("shows a Replay button for replayable items and remounts the preview", async () => {
    window.location.hash = "#/text/number-ticker";
    const user = userEvent.setup();
    render(<App />);
    const replay = await screen.findByRole("button", { name: "Replay animation" });
    const before = screen.getByTestId("preview-root").firstElementChild;
    expect(before).not.toBeNull();
    await user.click(replay);
    const after = screen.getByTestId("preview-root").firstElementChild;
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
  });

  it("tracks control changes throttled, with the control kind but never the value", async () => {
    window.location.hash = "#/components/button";
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(<App />);
    const variant = await screen.findByLabelText("Variant");
    await user.selectOptions(variant, "outline");
    await user.selectOptions(variant, "ghost");
    const changes = track.mock.calls.filter(([name]) => name === "control_changed");
    expect(changes).toEqual([["control_changed", { component: "button", prop: "variant", value_type: "select" }]]);
    expect(JSON.stringify(changes)).not.toMatch(/outline|ghost/);

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(track).toHaveBeenCalledWith("controls_reset", { component: "button" });
  });

  it("groups compound props by part", () => {
    expect(
      groupPropDocs("Tabs", [
        { name: "value", type: "string", description: "Tabs: controlled." },
        { name: "variant", type: "string", description: "TabsList: style." },
        { name: "other", type: "string", description: "No prefix." },
      ]),
    ).toEqual([
      { part: "Tabs", docs: [{ name: "value", type: "string", description: "controlled." }, { name: "other", type: "string", description: "No prefix." }] },
      { part: "TabsList", docs: [{ name: "variant", type: "string", description: "style." }] },
    ]);
  });
});
