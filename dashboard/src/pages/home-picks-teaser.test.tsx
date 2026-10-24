import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../lib/analytics/client";
import { FEATURED_PICKS } from "../lib/picks";
import { registryMeta } from "../registry/meta";
import { Home } from "./home";

describe("Home: Developer's Pick teaser", () => {
  afterEach(() => {
    window.location.hash = "";
    vi.restoreAllMocks();
  });

  it("teases three featured picks without touching the gallery", async () => {
    render(<Home filter="all" />);
    const teaser = await screen.findByRole("region", { name: /Developer's Pick/ });
    const cards = within(teaser).getAllByTestId("pick-card");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.dataset.slug)).toEqual(FEATURED_PICKS.slice(0, 3));
    for (const card of cards) expect(card).toHaveAttribute("data-featured", "true");
    expect(within(teaser).getByRole("link", { name: /Explore all \d+ picks/ })).toHaveAttribute("href", "#/picks");
    const gallery = screen.getByRole("list", { name: "Gallery items" });
    expect(within(gallery).getAllByTestId("bento-card")).toHaveLength(registryMeta.length);
  });

  it("tracks a teaser click with the home surface", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(<Home filter="all" />);
    const teaser = await screen.findByRole("region", { name: /Developer's Pick/ });
    await user.click(within(teaser).getAllByTestId("pick-card")[1] as HTMLElement);
    const meta = registryMeta.find((m) => m.slug === FEATURED_PICKS[1]);
    expect(track).toHaveBeenCalledWith("devs_pick_card_clicked", {
      component: FEATURED_PICKS[1],
      category: meta?.category,
      position: 1,
      featured: true,
      surface: "home",
    });
  });
});
