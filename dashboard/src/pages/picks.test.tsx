import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../lib/analytics/client";
import { creativeItems, FEATURED_PICKS, isCreative } from "../lib/picks";
import { registryMeta } from "../registry/meta";
import { itemHref } from "../router";
import { PicksPage } from "./picks";

const creative = creativeItems(registryMeta);
const creativeHrefs = new Set(creative.map((meta) => itemHref(meta.category, meta.slug)));
const list = () => screen.getByRole("list", { name: "Developer's picks" });
const cards = () => within(list()).getAllByTestId("pick-card");

describe("PicksPage", () => {
  afterEach(() => {
    window.location.hash = "";
    vi.restoreAllMocks();
  });

  it("shows every creative pick with the featured ones first", async () => {
    render(<PicksPage filter="all" />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/^Developer's Pick$/);
    expect(cards()).toHaveLength(creative.length);
    expect(screen.getByTestId("picks-count")).toHaveTextContent(`${creative.length} picks`);
    cards().forEach((card, index) => {
      expect(card).toHaveAttribute("data-featured", index < FEATURED_PICKS.length ? "true" : "false");
      expect(creativeHrefs.has(card.getAttribute("href") ?? "")).toBe(true);
    });
    expect(cards().slice(0, FEATURED_PICKS.length).map((card) => card.dataset.slug)).toEqual([...FEATURED_PICKS]);
    await waitFor(() => expect(list().querySelectorAll("[data-loaded]").length).toBeGreaterThan(0));
    for (const mini of list().querySelectorAll("[data-poster]")) expect(mini).toHaveAttribute("inert");
  });

  it("narrows to one category", async () => {
    render(<PicksPage filter="text" />);
    const text = creative.filter((meta) => meta.category === "text");
    await screen.findByRole("heading", { level: 1 });
    expect(cards()).toHaveLength(text.length);
    for (const card of cards()) expect(card.getAttribute("href")).toMatch(/^#\/text\//);
    expect(screen.getByRole("radio", { name: "Text" })).toHaveAttribute("aria-checked", "true");
  });

  it("changes the filter through the hash and tracks it", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(<PicksPage filter="all" />);
    await user.click(await screen.findByRole("radio", { name: "Text" }));
    await waitFor(() => expect(window.location.hash).toBe("#/picks?filter=text"));
    expect(track).toHaveBeenCalledWith("devs_pick_filter_changed", { category: "text" });
  });

  it("opens a random visible pick with Surprise me", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<PicksPage filter="effects" />);
    await screen.findByRole("heading", { level: 1 });
    const first = cards()[0] as HTMLElement;
    await user.click(screen.getByRole("button", { name: "Surprise me" }));
    await waitFor(() => expect(window.location.hash).toBe(first.getAttribute("href")));
    const meta = registryMeta.find((m) => m.slug === first.dataset.slug);
    expect(meta && isCreative(meta) && meta.category === "effects").toBe(true);
    const calls = track.mock.calls.filter(([name]) => name === "devs_pick_surprise_clicked");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toEqual({ component: meta?.slug, category: "effects", filter: "effects" });
  });

  it("tracks a card click with exactly the catalog props", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(<PicksPage filter="all" />);
    await screen.findByRole("heading", { level: 1 });
    const card = cards()[FEATURED_PICKS.length] as HTMLElement;
    const meta = registryMeta.find((m) => m.slug === card.dataset.slug);
    await user.click(card);
    const calls = track.mock.calls.filter(([name]) => name === "devs_pick_card_clicked");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toEqual({
      component: meta?.slug,
      category: meta?.category,
      position: FEATURED_PICKS.length,
      featured: false,
      surface: "picks",
    });
    await waitFor(() => expect(window.location.hash).toBe(card.getAttribute("href")));
  });
});
