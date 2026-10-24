import type { CaptureResult, PostHogConfig } from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analytics,
  createAnalytics,
  DEFAULT_POSTHOG_HOST,
  MAX_QUEUE,
  resolveAnalyticsConfig,
  type AnalyticsOptions,
  type PostHogClient,
} from "./client";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "./consent";

// A fake posthog-js: capture runs the configured before_send and records what would be sent.
const fake = vi.hoisted(() => {
  const state = {
    config: null as Partial<PostHogConfig> | null,
    consent: "pending" as "granted" | "denied" | "pending",
    sent: [] as CaptureResult[],
  };
  const ph = {
    init: vi.fn((_token: string, config: Partial<PostHogConfig>) => {
      state.config = config;
    }),
    capture: vi.fn((event: string, properties: Record<string, unknown> = {}) => {
      const result = state.config?.before_send;
      const input: CaptureResult = { uuid: "u", event, properties: { $current_url: window.location.href, ...properties } };
      const out = typeof result === "function" ? result(input) : input;
      if (out) state.sent.push(out);
      return out ?? undefined;
    }),
    opt_in_capturing: vi.fn(() => {
      state.consent = "granted";
    }),
    get_explicit_consent_status: vi.fn(() => state.consent),
    set_config: vi.fn(),
    reset: vi.fn(() => {
      state.consent = "pending";
    }),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  };
  // factorySpy: the mocked module was evaluated (once per file, never cleared, so the no-load tests
  // that assert it must stay before the first loading test); importSpy: one per load() of the chunk.
  return { state, ph, factorySpy: vi.fn(), importSpy: vi.fn() };
});

vi.mock("posthog-js/full/no-external", () => {
  fake.factorySpy();
  return {
    get default() {
      fake.importSpy();
      return fake.ph;
    },
  };
});

const KEY = "phc_test_key";
const NOW_RECORD = (choice: "accepted" | "declined") => JSON.stringify({ v: CONSENT_VERSION, choice, date: "2026-03-04" });
const make = (options: AnalyticsOptions = {}) =>
  createAnalytics({ key: KEY, win: window, nav: {}, storage: window.localStorage, ...options });
const sentNames = () => fake.state.sent.map((e) => e.event);

beforeEach(() => {
  fake.importSpy.mockClear();
  for (const fn of Object.values(fake.ph)) fn.mockClear();
  fake.state.config = null;
  fake.state.consent = "pending";
  fake.state.sent.length = 0;
  window.location.hash = "#/";
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("resolveAnalyticsConfig", () => {
  it("needs a key and an https host", () => {
    expect(resolveAnalyticsConfig(undefined, undefined)).toBeNull();
    expect(resolveAnalyticsConfig("   ", undefined)).toBeNull();
    expect(resolveAnalyticsConfig(` ${KEY} `, undefined)).toEqual({ key: KEY, host: DEFAULT_POSTHOG_HOST });
    expect(resolveAnalyticsConfig(KEY, "")).toEqual({ key: KEY, host: DEFAULT_POSTHOG_HOST });
    expect(resolveAnalyticsConfig(KEY, "https://e.example/ingest/")).toEqual({ key: KEY, host: "https://e.example/ingest" });
    for (const bad of ["http://eu.i.posthog.com", "not a url", "javascript:alert(1)", "https://u:p@e.example", "https://e.example/?x=1"]) {
      expect(resolveAnalyticsConfig(KEY, bad)).toBeNull();
    }
  });
});

describe("unconfigured", () => {
  it("the module singleton is a no-op in tests (no VITE_POSTHOG_KEY)", async () => {
    expect(analytics.configured).toBe(false);
    await analytics.init();
    expect(fake.factorySpy).not.toHaveBeenCalled();
    expect(fake.importSpy).not.toHaveBeenCalled();
  });

  it("never imports posthog-js and sends nothing without a key", async () => {
    const client = make({ key: undefined });
    expect(client.configured).toBe(false);
    expect(client.consent.getSnapshot()).toMatchObject({ tier: "off", showBanner: false });
    await client.init();
    client.track("palette_opened", {});
    client.pageview({ route_kind: "home", route_key: "home", category: null, component: null });
    client.accept("banner");
    await Promise.resolve();
    expect(fake.factorySpy).not.toHaveBeenCalled();
    expect(fake.importSpy).not.toHaveBeenCalled();
    expect(fake.ph.init).not.toHaveBeenCalled();
    expect(fake.ph.capture).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("an invalid host disables analytics", async () => {
    const load = vi.fn(() => Promise.resolve(fake.ph as unknown as PostHogClient));
    const client = make({ host: "http://insecure.example", load });
    expect(client.configured).toBe(false);
    await client.init();
    expect(load).not.toHaveBeenCalled();
  });
});

describe("privacy signals", () => {
  it.each([
    ["Do Not Track", { doNotTrack: "1" }],
    ["Global Privacy Control", { globalPrivacyControl: true }],
  ])("%s: posthog-js is not loaded", async (_label, nav) => {
    const client = make({ nav });
    await client.init();
    client.track("palette_opened", {});
    expect(client.consent.getSnapshot()).toMatchObject({ status: "suppressed", tier: "off", showBanner: false });
    expect(fake.factorySpy).not.toHaveBeenCalled();
    expect(fake.importSpy).not.toHaveBeenCalled();
    expect(fake.ph.capture).not.toHaveBeenCalled();
  });

  it("an explicit accept overrides the signal and loads the full tier", async () => {
    const client = make({ nav: { doNotTrack: "1" } });
    await client.init();
    client.accept("settings");
    await client.init();
    expect(fake.importSpy).toHaveBeenCalledTimes(1);
    expect(fake.ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(client.consent.getSnapshot().tier).toBe("full");
  });
});

describe("init", () => {
  it("initialises posthog-js once with the anonymous-tier options", async () => {
    const client = make();
    await Promise.all([client.init(), client.init()]);
    expect(fake.importSpy).toHaveBeenCalledTimes(1);
    expect(fake.ph.init).toHaveBeenCalledTimes(1);
    const [token, config] = fake.ph.init.mock.calls[0] ?? [];
    expect(token).toBe(KEY);
    expect(config).toEqual({
      api_host: "https://eu.i.posthog.com",
      cookieless_mode: "on_reject",
      opt_out_capturing_by_default: true,
      respect_dnt: false,
      persistence: "localStorage",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: { web_vitals: true, network_timing: false, web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"] },
      disable_surveys: true,
      disable_web_experiments: true,
      mask_personal_data_properties: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: { maskAllInputs: true, maskTextSelector: "*" },
      autocapture: false,
      rageclick: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      before_send: expect.any(Function),
    });
    expect(config).not.toHaveProperty("defaults");
    expect(fake.ph.opt_in_capturing).not.toHaveBeenCalled();
    expect(fake.ph.startSessionRecording).not.toHaveBeenCalled();
  });

  it("starts in the full tier for a stored accept", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, NOW_RECORD("accepted"));
    await make().init();
    expect(fake.ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(fake.ph.set_config).toHaveBeenCalledWith({
      autocapture: true,
      rageclick: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      disable_session_recording: false,
    });
    expect(fake.ph.startSessionRecording).toHaveBeenCalledTimes(1);
  });

  it("a consent version bump shows the banner again and downgrades a stale PostHog opt-in", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION - 1, choice: "accepted", date: "2025-01-01" }));
    window.localStorage.setItem("ph_phc_test_key_posthog", "{}");
    fake.state.consent = "granted";
    const client = make();
    expect(client.consent.getSnapshot()).toMatchObject({ status: "pending", showBanner: true, tier: "anonymous" });
    await client.init();
    expect(fake.ph.opt_in_capturing).not.toHaveBeenCalled();
    expect(fake.ph.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(fake.ph.reset).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("ph_phc_test_key_posthog")).toBeNull();
  });

  it("flushes events tracked before load, in order, up to the queue limit", async () => {
    let resolve: (ph: PostHogClient) => void = () => {};
    const load = vi.fn(() => new Promise<PostHogClient>((r) => (resolve = r)));
    const client = make({ load });
    const pending = client.init();
    client.pageview({ route_kind: "home", route_key: "home", category: null, component: null });
    client.track("palette_opened", {});
    client.track("install_command_copied", { surface: "home" });
    expect(fake.ph.capture).not.toHaveBeenCalled();
    resolve(fake.ph as unknown as PostHogClient);
    await pending;
    expect(fake.ph.capture.mock.calls.map((call) => call[0])).toEqual(["$pageview", "palette_opened", "install_command_copied"]);
    expect(fake.ph.capture.mock.calls[2]?.[1]).toEqual({ surface: "home" });
  });

  it("caps the queue", async () => {
    let resolve: (ph: PostHogClient) => void = () => {};
    const client = make({ load: () => new Promise<PostHogClient>((r) => (resolve = r)) });
    const pending = client.init();
    for (let i = 0; i < MAX_QUEUE + 10; i++) client.track("controls_reset", { component: `c${i}` });
    resolve(fake.ph as unknown as PostHogClient);
    await pending;
    expect(fake.ph.capture).toHaveBeenCalledTimes(MAX_QUEUE);
    expect(fake.ph.capture.mock.calls.at(-1)?.[1]).toEqual({ component: `c${MAX_QUEUE - 1}` });
  });

  it("sends TTFB once from the navigation timing entry", async () => {
    vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([
      { responseStart: 120.4, activationStart: 20 } as unknown as PerformanceEntry,
    ]);
    const client = make();
    await client.init();
    await client.init();
    const ttfb = fake.state.sent.filter((e) => e.event === "web_vital_ttfb");
    expect(ttfb).toHaveLength(1);
    expect(ttfb[0]?.properties).toMatchObject({ value_ms: 100, route_kind: "home" });
  });

  it("a failed chunk load stays silent", async () => {
    const client = make({ load: () => Promise.reject(new Error("offline")) });
    await expect(client.init()).resolves.toBeUndefined();
    client.track("palette_opened", {});
  });
});

describe("before_send in the anonymous tier", () => {
  it("drops autocapture-style events and sanitizes the rest", async () => {
    window.location.hash = "#/components/button?tab=code&secret=x";
    const client = make();
    await client.init();
    fake.ph.capture("$autocapture", {});
    fake.ph.capture("$rageclick", {});
    client.track("palette_opened", {});
    expect(sentNames()).toEqual(["palette_opened"]);
    expect(fake.state.sent[0]?.properties).toMatchObject({
      $current_url: `${window.location.origin}/#/components/button?tab=code`,
      viewport_bucket: expect.any(String),
      color_scheme: "light",
    });
  });
});

describe("consent actions", () => {
  const seedPostHogStorage = () => {
    window.localStorage.setItem("ph_phc_test_key_posthog", "{}");
    window.localStorage.setItem("__ph_opt_in_out_phc_test_key", "1");
    window.localStorage.setItem("pui-theme", "dark");
    window.sessionStorage.setItem("ph_session", "1");
    document.cookie = "ph_cookie=1; path=/";
  };

  it("accept opts in, enables the full tier and records the choice", async () => {
    const client = make();
    await client.init();
    client.accept("banner");
    expect(fake.ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(fake.ph.set_config).toHaveBeenLastCalledWith(expect.objectContaining({ autocapture: true, disable_session_recording: false }));
    expect(fake.ph.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}")).toMatchObject({ v: CONSENT_VERSION, choice: "accepted" });
    const changed = fake.state.sent.find((e) => e.event === "consent_changed");
    expect(changed?.properties).toMatchObject({ choice: "accepted", source: "banner" });
    // The full tier lets autocapture through.
    fake.ph.capture("$autocapture", {});
    expect(sentNames()).toContain("$autocapture");
  });

  it.each(["decline", "withdraw"] as const)("%s stops replay, resets and purges PostHog storage", async (action) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, NOW_RECORD("accepted"));
    const client = make();
    await client.init();
    seedPostHogStorage();
    client[action]("settings");
    expect(fake.ph.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(fake.ph.set_config).toHaveBeenLastCalledWith(expect.objectContaining({ autocapture: false, disable_session_recording: true }));
    expect(fake.ph.reset).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("ph_phc_test_key_posthog")).toBeNull();
    expect(window.localStorage.getItem("__ph_opt_in_out_phc_test_key")).toBeNull();
    expect(window.sessionStorage.getItem("ph_session")).toBeNull();
    expect(document.cookie).not.toContain("ph_cookie");
    expect(window.localStorage.getItem("pui-theme")).toBe("dark");
    expect(client.consent.getSnapshot()).toMatchObject({ status: "declined", tier: "anonymous" });
    const changed = fake.state.sent.find((e) => e.event === "consent_changed");
    expect(changed?.properties).toMatchObject({ choice: action === "decline" ? "declined" : "withdrawn", source: "settings" });
    fake.ph.capture("$autocapture", {});
    expect(sentNames()).not.toContain("$autocapture");
  });

  it("a decline from the banner also clears PostHog state", async () => {
    const client = make();
    await client.init();
    seedPostHogStorage();
    client.decline("banner");
    expect(fake.ph.reset).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("ph_phc_test_key_posthog")).toBeNull();
  });

  it("reaching the off tier at runtime downgrades and stops sending", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, NOW_RECORD("accepted"));
    const client = make({ nav: { doNotTrack: "1" } });
    await client.init();
    expect(client.consent.getSnapshot().tier).toBe("full");
    client.withdraw("settings");
    expect(client.consent.getSnapshot().tier).toBe("off");
    expect(fake.ph.reset).toHaveBeenCalledTimes(1);
    expect(fake.ph.set_config).toHaveBeenCalledWith({ advanced_disable_flags: true });
    fake.state.sent.length = 0;
    fake.ph.capture.mockClear();
    client.track("palette_opened", {});
    expect(fake.ph.capture).not.toHaveBeenCalled();
    fake.ph.capture("$pageview", {});
    expect(fake.state.sent).toEqual([]);
  });

  it("follows a choice made in another tab", async () => {
    // Clients from earlier tests also hear this window event, so this one gets its own fake.
    const own = {
      init: vi.fn(),
      capture: vi.fn(),
      opt_in_capturing: vi.fn(),
      get_explicit_consent_status: vi.fn(() => "pending" as const),
      set_config: vi.fn(),
      reset: vi.fn(),
      startSessionRecording: vi.fn(),
      stopSessionRecording: vi.fn(),
    };
    const client = make({ load: () => Promise.resolve(own as unknown as PostHogClient) });
    await client.init();
    window.localStorage.setItem(CONSENT_STORAGE_KEY, NOW_RECORD("accepted"));
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));
    expect(client.consent.getSnapshot().tier).toBe("full");
    expect(own.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(own.startSessionRecording).toHaveBeenCalledTimes(1);
  });
});
