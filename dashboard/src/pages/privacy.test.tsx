import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacySettings } from "../components/privacy-settings";
import { createAnalytics } from "../lib/analytics/client";
import { CONSENT_STORAGE_KEY } from "../lib/analytics/consent";
import { NOT_FOUND_PATH_MAX, ZERO_RESULT_QUERY_MAX } from "../lib/analytics/events";
import { Privacy } from "./privacy";

describe("Privacy page", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the not-legal-advice alert, every section and the settings", () => {
    const { container } = render(<Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Not legal advice")).toBeInTheDocument();
    expect(screen.getByText(/is not legal advice/)).toBeInTheDocument();
    for (const name of [
      "Collected without consent",
      "Collected only if you accept",
      "Never collected",
      "Processor",
      "Retention",
      "Do Not Track and Global Privacy Control",
      "What is stored in your browser",
      "How to withdraw",
      "Your privacy settings",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name }), name).toBeInTheDocument();
    }
    expect(screen.getByText(CONSENT_STORAGE_KEY)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PostHog privacy policy" })).toHaveAttribute("href", "https://posthog.com/privacy");

    const settings = container.querySelector("#privacy-settings");
    expect(settings).not.toBeNull();
    // Unit tests build without a key: the settings only explain that.
    expect(within(settings as HTMLElement).getByRole("status")).toHaveTextContent("Analytics not enabled in this build");
    expect(within(settings as HTMLElement).queryByRole("button")).toBeNull();
  });

  it("lists the free-text and origin data sent without consent, with the code's limits", () => {
    const { container } = render(<Privacy />);
    const items = [...container.querySelectorAll('section[aria-labelledby="always"] li')].map((li) => li.textContent);
    const listed = (text: string) => items.some((item) => item.includes(text));
    expect(listed(`palette search found nothing: trimmed, lowercased and at most ${ZERO_RESULT_QUERY_MAX} characters`)).toBe(true);
    expect(listed(`cleaned-up path of a page that does not exist`)).toBe(true);
    expect(listed(`at most ${NOT_FOUND_PATH_MAX} characters`)).toBe(true);
    expect(listed("Your consent choice itself (accepted, declined or withdrawn")).toBe(true);
    expect(listed("The site you came from, cut to its origin")).toBe(true);
    expect(listed("CSS selector of the largest element")).toBe(true);
    expect(
      listed(
        "browser and operating system (name and version, read from the user agent), device type, browser language, time zone, the exact screen and window size, and the page title",
      ),
    ).toBe(true);
    const always = container.querySelector('section[aria-labelledby="always"]')?.textContent ?? "";
    expect(always).toContain("PostHog receives your IP address with each request");
    expect(always).toContain("set to discard it");
    const never = container.querySelector('section[aria-labelledby="never"]')?.textContent ?? "";
    expect(never).toContain("except the palette search text described above when a search finds nothing");
  });
});

describe("PrivacySettings", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows the live status and keeps focus on the first button across Accept and Withdraw", async () => {
    const user = userEvent.setup();
    const client = createAnalytics({
      key: "phc_test",
      win: window,
      nav: {},
      storage: window.localStorage,
      load: () => Promise.reject(new Error("posthog-js is not loaded in unit tests")),
    });
    render(<PrivacySettings client={client} />);
    expect(screen.getByRole("status")).toHaveTextContent("Not chosen");
    const accept = screen.getByRole("button", { name: "Accept full analytics" });
    const decline = screen.getByRole("button", { name: "Decline" });
    expect(accept.className).toBe(decline.className);

    await user.click(accept);
    expect(screen.getByRole("status")).toHaveTextContent("Allowed");
    const withdraw = screen.getByRole("button", { name: "Withdraw consent" });
    expect(withdraw).toBe(accept);
    expect(withdraw).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Decline" })).toBeNull();

    await user.click(withdraw);
    expect(screen.getByRole("status")).toHaveTextContent("Declined");
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "null")).toMatchObject({ choice: "declined" });
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("names the browser signal and still offers an opt-in", () => {
    const client = createAnalytics({ key: "phc_test", win: window, nav: { globalPrivacyControl: true }, storage: window.localStorage });
    render(<PrivacySettings client={client} />);
    expect(screen.getByRole("status")).toHaveTextContent("Browser privacy signal detected");
    expect(screen.getByRole("button", { name: "Accept full analytics" })).toBeInTheDocument();
  });
});
