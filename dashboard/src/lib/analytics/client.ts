// Tiered, consent-gated analytics client (analytics plan, decisions 2, 4, 5, 7-10, 14).
// - No key (or a non-https host): a no-op. posthog-js is never imported and nothing is sent.
// - Tier "off" (DNT/GPC without an explicit accept): posthog-js is not loaded; if reached at
//   runtime the SDK is downgraded and before_send drops everything.
// - Tier "anonymous" (no choice yet, or declined): cookieless aggregate events only.
// - Tier "full" (accepted): persistent anonymous id, autocapture, heatmaps, masked session replay.
// We never call identify, alias or register: no person profiles in any tier.
import type { PostHog, PostHogConfig, Properties } from "posthog-js";
import { parseHash } from "../../router";
import {
  createConsentStore,
  type ConsentState,
  type ConsentStorage,
  type ConsentStore,
  type PrivacyNavigator,
  type Tier,
} from "./consent";
import type { AnalyticsEventName, AnalyticsEvents, ConsentSource, PageviewProps } from "./events";
import { sanitizeEvent } from "./sanitize";

export const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
/** Events tracked before posthog-js has loaded are kept in memory, up to this many. */
export const MAX_QUEUE = 50;

/** The posthog-js surface the client uses (tests inject a fake of this shape). */
export type PostHogClient = Pick<
  PostHog,
  | "init"
  | "capture"
  | "opt_in_capturing"
  | "get_explicit_consent_status"
  | "set_config"
  | "reset"
  | "startSessionRecording"
  | "stopSessionRecording"
>;
export type PostHogLoader = () => Promise<PostHogClient>;

/** Lazy chunk (`posthog-<hash>.js`): the bundle that inlines replay and web vitals and loads no remote scripts. */
export const loadPostHog: PostHogLoader = () => import("posthog-js/full/no-external").then((module) => module.default);

/** Options shared by every tier (decisions 4, 7, 8). `defaults` stays unset on purpose. */
export const BASE_CONFIG = {
  cookieless_mode: "on_reject",
  opt_out_capturing_by_default: true,
  // DNT/GPC are handled by our consent tiers, so an explicit opt-in can override them.
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
} satisfies Partial<PostHogConfig>;

/** Tier-specific options applied with set_config on upgrade/downgrade (decisions 5 and 8). */
export const ANONYMOUS_TIER_CONFIG = {
  autocapture: false,
  rageclick: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  disable_session_recording: true,
} satisfies Partial<PostHogConfig>;

export const FULL_TIER_CONFIG = {
  autocapture: true,
  rageclick: true,
  capture_heatmaps: true,
  capture_dead_clicks: true,
  disable_session_recording: false,
} satisfies Partial<PostHogConfig>;

export interface AnalyticsConfig {
  key: string;
  host: string;
}

/** The trimmed key and https host, or null (analytics disabled) when either is unusable. */
export function resolveAnalyticsConfig(key: string | undefined, host: string | undefined): AnalyticsConfig | null {
  const token = key?.trim() ?? "";
  if (token === "") return null;
  let url: URL;
  try {
    url = new URL(host?.trim() || DEFAULT_POSTHOG_HOST);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    return null;
  }
  return { key: token, host: url.href.replace(/\/+$/, "") };
}

const POSTHOG_PREFIXES = ["ph_", "__ph"];
const isPostHogName = (name: string) => POSTHOG_PREFIXES.some((prefix) => name.startsWith(prefix));

function purgeStorage(storage: Storage | undefined): void {
  if (!storage) return;
  const names: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (name !== null && isPostHogName(name)) names.push(name);
  }
  for (const name of names) storage.removeItem(name);
}

/** Deletes every localStorage/sessionStorage key and cookie named `ph_*` or `__ph*` (defensive, decision 5). */
export function purgePostHogStorage(win: Window | undefined): void {
  if (!win) return;
  for (const area of ["localStorage", "sessionStorage"] as const) {
    try {
      purgeStorage(win[area]);
    } catch {
      // Blocked storage holds nothing to purge.
    }
  }
  const doc = win.document;
  const hostname = win.location.hostname;
  for (const cookie of doc.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim() ?? "";
    if (!isPostHogName(name)) continue;
    const expired = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    doc.cookie = expired;
    if (hostname !== "") {
      doc.cookie = `${expired}; domain=${hostname}`;
      doc.cookie = `${expired}; domain=.${hostname}`;
    }
  }
}

export interface AnalyticsOptions {
  key?: string;
  host?: string;
  load?: PostHogLoader;
  /** Consent record storage (default: window.localStorage, null when blocked). */
  storage?: ConsentStorage | null;
  nav?: PrivacyNavigator;
  win?: Window;
}

export interface Analytics {
  /** A usable key and host exist in this build. */
  readonly configured: boolean;
  readonly consent: ConsentStore;
  /** Loads posthog-js when configured and the tier is not off. Safe to call more than once. */
  init(): Promise<void>;
  track<E extends AnalyticsEventName>(event: E, props: AnalyticsEvents[E]): void;
  pageview(props: PageviewProps): void;
  accept(source: ConsentSource): void;
  decline(source: ConsentSource): void;
  withdraw(source: ConsentSource): void;
}

function defaultWindow(): Window | undefined {
  return typeof window === "undefined" ? undefined : window;
}

function localStorageOf(win: Window | undefined): ConsentStorage | null {
  try {
    return win?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createAnalytics(options: AnalyticsOptions = {}): Analytics {
  const win = options.win ?? defaultWindow();
  const config = resolveAnalyticsConfig(options.key, options.host);
  const load = options.load ?? loadPostHog;
  const storage = options.storage === undefined ? localStorageOf(win) : options.storage;
  const nav = options.nav ?? win?.navigator;
  const consent = createConsentStore(storage, nav, config !== null, win);

  let posthog: PostHogClient | null = null;
  let loading: Promise<void> | null = null;
  let initRequested = false;
  let ttfbSent = false;
  let appliedTier: Tier = "anonymous";
  const queue: Array<{ event: string; props: Properties }> = [];

  const tier = () => consent.getSnapshot().tier;

  const capture = (event: string, props: Properties) => {
    if (!config || tier() === "off") return;
    if (posthog) {
      posthog.capture(event, props);
    } else if (queue.length < MAX_QUEUE) {
      queue.push({ event, props });
    }
  };

  const upgrade = (ph: PostHogClient) => {
    ph.opt_in_capturing({ captureEventName: false });
    ph.set_config(FULL_TIER_CONFIG);
    ph.startSessionRecording();
  };

  const downgrade = (ph: PostHogClient) => {
    ph.stopSessionRecording();
    ph.set_config(ANONYMOUS_TIER_CONFIG);
    // reset() clears PostHog's stored opt-in, returning it to opted-out-by-default (cookieless).
    ph.reset();
    purgePostHogStorage(win);
  };

  const applyTier = (next: Tier) => {
    if (!posthog || next === appliedTier) return;
    // In the off tier the loaded SDK also stops its feature-flag requests; leaving off turns them back on.
    if (next === "off") posthog.set_config({ advanced_disable_flags: true });
    else if (appliedTier === "off") posthog.set_config({ advanced_disable_flags: false });
    if (next === "full") upgrade(posthog);
    // Leaving full, or reaching off at runtime (before_send then drops every event).
    else if (appliedTier === "full" || next === "off") downgrade(posthog);
    appliedTier = next;
  };

  const sendTtfb = () => {
    if (ttfbSent || !win) return;
    ttfbSent = true;
    // activationStart (prerender) is newer than TypeScript's DOM lib, hence the widened type.
    const entry = win.performance?.getEntriesByType?.("navigation")[0] as
      | (PerformanceNavigationTiming & { activationStart?: number })
      | undefined;
    if (!entry || !(entry.responseStart > 0)) return;
    const value = Math.round(entry.responseStart - (entry.activationStart ?? 0));
    if (!Number.isFinite(value) || value < 0) return;
    capture("web_vital_ttfb", { value_ms: value, route_kind: parseHash(win.location.hash).kind });
  };

  const start = (): Promise<void> => {
    if (!config) return Promise.resolve();
    loading ??= load()
      .then((ph) => {
        ph.init(config.key, {
          api_host: config.host,
          ...BASE_CONFIG,
          ...ANONYMOUS_TIER_CONFIG,
          // Evaluated per event, so the live tier always decides what leaves the browser.
          before_send: (event) =>
            sanitizeEvent(event, {
              tier: tier(),
              width: win?.innerWidth ?? 1024,
              colorScheme: win?.document.documentElement.classList.contains("dark") ? "dark" : "light",
              origin: win?.location.origin ?? "",
              isNotFound: (hash) => parseHash(hash).kind === "notFound",
            }),
        });
        posthog = ph;
        const current = tier();
        if (current === "full") {
          upgrade(ph);
        } else if (ph.get_explicit_consent_status() === "granted") {
          // Stale opt-in from an earlier session (withdrawn in another tab, or a consent version bump).
          downgrade(ph);
        }
        appliedTier = current;
        for (const item of queue.splice(0)) capture(item.event, item.props);
        sendTtfb();
      })
      .catch(() => {
        // The chunk failed to load (offline, blocked): analytics stays silent for this page.
        queue.length = 0;
      });
    return loading;
  };

  if (config) {
    consent.subscribe(() => {
      const state: ConsentState = consent.getSnapshot();
      applyTier(state.tier);
      if (initRequested && state.tier !== "off") void start();
    });
  }

  const choose = (action: "accept" | "decline" | "withdraw", source: ConsentSource) => {
    if (!config) return;
    const before = appliedTier;
    consent[action]();
    // A decline always clears PostHog state, even when the tier did not change (applyTier covers leaving full/reaching off).
    if (action !== "accept" && posthog && before !== "full" && appliedTier !== "off") downgrade(posthog);
    const choice = action === "accept" ? "accepted" : action === "decline" ? "declined" : "withdrawn";
    capture("consent_changed", { choice, source });
  };

  return {
    configured: config !== null,
    consent,
    init() {
      if (!config) return Promise.resolve();
      initRequested = true;
      if (tier() === "off") return loading ?? Promise.resolve();
      return start();
    },
    track: (event, props) => capture(event, props),
    pageview: (props) => capture("$pageview", props),
    accept: (source) => choose("accept", source),
    decline: (source) => choose("decline", source),
    withdraw: (source) => choose("withdraw", source),
  };
}

/** The dashboard's client, configured from dashboard/.env.local at build time. */
export const analytics: Analytics = createAnalytics({
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
});
