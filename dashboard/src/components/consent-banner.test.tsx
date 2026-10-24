import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnalytics, type Analytics } from "../lib/analytics/client";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, type PrivacyNavigator } from "../lib/analytics/consent";
import { CONSENT_OFFSET_VAR, ConsentBanner } from "./consent-banner";

/** A configured client that never loads posthog-js (init is not called in these tests). */
function configured(nav: PrivacyNavigator = {}): Analytics {
  return createAnalytics({
    key: "phc_test",
    win: window,
    nav,
    storage: window.localStorage,
    load: () => Promise.reject(new Error("posthog-js is not loaded in unit tests")),
  });
}

function renderBanner(client?: Analytics) {
  return render(
    <>
      <main id="content" tabIndex={-1} />
      <ConsentBanner client={client} />
    </>,
  );
}

const banner = () => screen.queryByRole("region", { name: "Privacy choices" });
const storedChoice = () => JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "null") as { choice?: string } | null;

describe("ConsentBanner", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty(CONSENT_OFFSET_VAR);
  });

  it("stays hidden without a key, with Do Not Track or GPC, and after a stored choice", () => {
    const { unmount } = renderBanner();
    expect(banner()).toBeNull();
    unmount();

    for (const nav of [{ doNotTrack: "1" }, { globalPrivacyControl: true }]) {
      const view = renderBanner(configured(nav));
      expect(banner()).toBeNull();
      view.unmount();
    }

    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION, choice: "declined", date: "2026-01-01" }));
    renderBanner(configured());
    expect(banner()).toBeNull();
  });

  it("shows on a first visit, with a privacy link and two identically styled choices, without taking focus", () => {
    renderBanner(configured());
    const region = banner();
    expect(region).not.toBeNull();
    expect(region?.tagName).toBe("SECTION");
    expect(region?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    expect(screen.getByRole("link", { name: "Privacy details" })).toHaveAttribute("href", "#/docs/privacy");
    const accept = screen.getByRole("button", { name: "Accept" });
    const decline = screen.getByRole("button", { name: "Decline" });
    expect(accept.className).toBe(decline.className);
    expect(region).not.toContainElement(document.activeElement as HTMLElement | null);
    expect(document.documentElement.style.getPropertyValue(CONSENT_OFFSET_VAR)).toMatch(/^\d+px$/);
  });

  it("Accept calls the client, stores the choice, unmounts and focuses #content", async () => {
    const user = userEvent.setup();
    const client = configured();
    const accept = vi.spyOn(client, "accept");
    renderBanner(client);
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(accept).toHaveBeenCalledWith("banner");
    expect(storedChoice()).toMatchObject({ v: CONSENT_VERSION, choice: "accepted" });
    expect(banner()).toBeNull();
    expect(document.getElementById("content")).toHaveFocus();
    expect(document.documentElement.style.getPropertyValue(CONSENT_OFFSET_VAR)).toBe("");
  });

  it("Decline calls the client, stores the choice, unmounts and focuses #content", async () => {
    const user = userEvent.setup();
    const client = configured();
    const decline = vi.spyOn(client, "decline");
    renderBanner(client);
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(decline).toHaveBeenCalledWith("banner");
    expect(storedChoice()).toMatchObject({ v: CONSENT_VERSION, choice: "declined" });
    expect(banner()).toBeNull();
    expect(document.getElementById("content")).toHaveFocus();
  });

  it("ignores Escape", async () => {
    const user = userEvent.setup();
    renderBanner(configured());
    screen.getByRole("button", { name: "Decline" }).focus();
    await user.keyboard("{Escape}");
    expect(banner()).not.toBeNull();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });
});
