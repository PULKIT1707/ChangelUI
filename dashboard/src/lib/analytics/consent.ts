// Consent state (analytics plan, decisions 3 and 4). One source of truth: localStorage
// `pui-analytics-consent` = {"v":1,"choice":"accepted"|"declined","date":"YYYY-MM-DD"}, written only
// on an explicit choice (strictly necessary storage). Everything else is derived by resolveConsent.
import { useSyncExternalStore } from "react";

export const CONSENT_STORAGE_KEY = "pui-analytics-consent";
/** Bump when what the full tier collects changes: older records count as "no choice" (banner again). */
export const CONSENT_VERSION = 1;

export type ConsentChoice = "accepted" | "declined";
export interface ConsentRecord {
  v: number;
  choice: ConsentChoice;
  /** YYYY-MM-DD (UTC) of the choice. */
  date: string;
}
/** suppressed = a Do Not Track / Global Privacy Control signal without an explicit current accept. */
export type ConsentStatus = "pending" | "accepted" | "declined" | "suppressed";
/** off = nothing is sent; anonymous = cookieless aggregate events; full = consented (replay, autocapture). */
export type Tier = "off" | "anonymous" | "full";

export interface ConsentState {
  status: ConsentStatus;
  tier: Tier;
  showBanner: boolean;
  /** A build-time PostHog key and valid host exist. */
  configured: boolean;
  /** The browser sends Do Not Track or Global Privacy Control. */
  signal: boolean;
}

/** The navigator fields read for privacy signals (both are non-standard, hence optional). */
export interface PrivacyNavigator {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}

export type ConsentStorage = Pick<Storage, "getItem" | "setItem">;

export function hasPrivacySignal(nav: PrivacyNavigator | undefined): boolean {
  return nav?.doNotTrack === "1" || nav?.globalPrivacyControl === true;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The stored record, or null when missing, corrupt, or storage is blocked. Older versions are returned as-is. */
export function readConsent(storage: ConsentStorage | null): ConsentRecord | null {
  let raw: string | null;
  try {
    raw = storage?.getItem(CONSENT_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { v, choice, date } = value as Record<string, unknown>;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return null;
  if (choice !== "accepted" && choice !== "declined") return null;
  if (typeof date !== "string" || !DATE.test(date)) return null;
  return { v, choice, date };
}

/** Persists an explicit choice (best effort: blocked storage keeps it for this page only) and returns the record. */
export function writeConsent(storage: ConsentStorage | null, choice: ConsentChoice, now: Date): ConsentRecord {
  const record: ConsentRecord = { v: CONSENT_VERSION, choice, date: now.toISOString().slice(0, 10) };
  try {
    storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Blocked or full storage: the choice applies until reload.
  }
  return record;
}

/** Pure: decision 4. */
export function resolveConsent({
  record,
  signal,
  configured,
}: {
  record: ConsentRecord | null;
  signal: boolean;
  configured: boolean;
}): ConsentState {
  const current = record !== null && record.v === CONSENT_VERSION ? record.choice : null;
  let status: ConsentStatus;
  let tier: Tier;
  if (signal) {
    status = current === "accepted" ? "accepted" : "suppressed";
    tier = current === "accepted" ? "full" : "off";
  } else if (current === null) {
    status = "pending";
    tier = "anonymous";
  } else {
    status = current;
    tier = current === "accepted" ? "full" : "anonymous";
  }
  if (!configured) return { status, tier: "off", showBanner: false, configured, signal };
  return { status, tier, showBanner: status === "pending", configured, signal };
}

export interface ConsentStore {
  getSnapshot(): ConsentState;
  subscribe(onChange: () => void): () => void;
  accept(now?: Date): void;
  decline(now?: Date): void;
  /** Revokes an earlier accept; stored as "declined". */
  withdraw(now?: Date): void;
}

type StorageEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

/**
 * A tiny external store over the consent record. Other tabs' choices arrive through the window
 * `storage` event (listened to while anyone is subscribed).
 */
export function createConsentStore(
  storage: ConsentStorage | null,
  nav: PrivacyNavigator | undefined,
  configured: boolean,
  win: StorageEventTarget | undefined = typeof window === "undefined" ? undefined : window,
): ConsentStore {
  const signal = hasPrivacySignal(nav);
  const listeners = new Set<() => void>();
  let record = readConsent(storage);
  let snapshot = resolveConsent({ record, signal, configured });

  const update = (next: ConsentRecord | null) => {
    record = next;
    const resolved = resolveConsent({ record, signal, configured });
    if (
      resolved.status === snapshot.status &&
      resolved.tier === snapshot.tier &&
      resolved.showBanner === snapshot.showBanner
    ) {
      return;
    }
    snapshot = resolved;
    for (const listener of [...listeners]) listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) update(readConsent(storage));
  };

  const choose = (choice: ConsentChoice, now: Date) => update(writeConsent(storage, choice, now));

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange) {
      if (listeners.size === 0) win?.addEventListener("storage", onStorage);
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) win?.removeEventListener("storage", onStorage);
      };
    },
    accept: (now = new Date()) => choose("accepted", now),
    decline: (now = new Date()) => choose("declined", now),
    withdraw: (now = new Date()) => choose("declined", now),
  };
}

/** The live consent state of `store` (for the banner and privacy settings). */
export function useConsent(store: ConsentStore): ConsentState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
