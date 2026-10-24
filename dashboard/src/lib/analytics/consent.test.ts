import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  createConsentStore,
  hasPrivacySignal,
  readConsent,
  resolveConsent,
  useConsent,
  writeConsent,
  type ConsentStorage,
} from "./consent";

const NOW = new Date("2026-03-04T12:00:00Z");
const store = (value: unknown) => {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
};

afterEach(() => {
  window.localStorage.clear();
});

describe("hasPrivacySignal", () => {
  it("reads Do Not Track and Global Privacy Control", () => {
    expect(hasPrivacySignal(undefined)).toBe(false);
    expect(hasPrivacySignal({})).toBe(false);
    expect(hasPrivacySignal({ doNotTrack: "0" })).toBe(false);
    expect(hasPrivacySignal({ doNotTrack: "unspecified", globalPrivacyControl: false })).toBe(false);
    expect(hasPrivacySignal({ doNotTrack: "1" })).toBe(true);
    expect(hasPrivacySignal({ globalPrivacyControl: true })).toBe(true);
  });
});

describe("readConsent / writeConsent", () => {
  it("round-trips a dated, versioned record", () => {
    expect(readConsent(window.localStorage)).toBeNull();
    expect(writeConsent(window.localStorage, "accepted", NOW)).toEqual({ v: CONSENT_VERSION, choice: "accepted", date: "2026-03-04" });
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "")).toEqual({ v: 1, choice: "accepted", date: "2026-03-04" });
    expect(readConsent(window.localStorage)).toEqual({ v: 1, choice: "accepted", date: "2026-03-04" });
  });

  it("treats corrupt or malformed values as no record", () => {
    for (const bad of ["{", "null", "[]", '"accepted"', { v: 1, choice: "maybe", date: "2026-01-01" }, { v: "1", choice: "accepted", date: "2026-01-01" }, { v: 1, choice: "accepted" }, { v: 0, choice: "declined", date: "2026-01-01" }]) {
      store(bad);
      expect(readConsent(window.localStorage)).toBeNull();
    }
  });

  it("returns other versions as-is (resolveConsent treats them as no current choice)", () => {
    store({ v: 0.5, choice: "accepted", date: "2025-01-01" });
    expect(readConsent(window.localStorage)).toBeNull();
    const other = { v: CONSENT_VERSION + 1, choice: "accepted", date: "2025-01-01" };
    store(other);
    expect(readConsent(window.localStorage)).toEqual(other);
  });

  it("tolerates storage that throws", () => {
    const throwing: ConsentStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(readConsent(throwing)).toBeNull();
    expect(readConsent(null)).toBeNull();
    expect(writeConsent(throwing, "declined", NOW)).toEqual({ v: 1, choice: "declined", date: "2026-03-04" });
  });
});

describe("resolveConsent", () => {
  const accepted = { v: CONSENT_VERSION, choice: "accepted" as const, date: "2026-03-04" };
  const declined = { v: CONSENT_VERSION, choice: "declined" as const, date: "2026-03-04" };
  const outdated = { v: CONSENT_VERSION - 1, choice: "accepted" as const, date: "2025-03-04" };

  it.each([
    ["no choice", null, false, { status: "pending", tier: "anonymous", showBanner: true }],
    ["accepted", accepted, false, { status: "accepted", tier: "full", showBanner: false }],
    ["declined", declined, false, { status: "declined", tier: "anonymous", showBanner: false }],
    ["outdated version", outdated, false, { status: "pending", tier: "anonymous", showBanner: true }],
    ["signal, no choice", null, true, { status: "suppressed", tier: "off", showBanner: false }],
    ["signal + accepted", accepted, true, { status: "accepted", tier: "full", showBanner: false }],
    ["signal + declined", declined, true, { status: "suppressed", tier: "off", showBanner: false }],
    ["signal + outdated accept", outdated, true, { status: "suppressed", tier: "off", showBanner: false }],
  ] as const)("%s", (_label, record, signal, expected) => {
    expect(resolveConsent({ record, signal, configured: true })).toEqual({ ...expected, configured: true, signal });
  });

  it("is off with no banner when analytics is not configured", () => {
    expect(resolveConsent({ record: null, signal: false, configured: false })).toMatchObject({ tier: "off", showBanner: false, configured: false });
    expect(resolveConsent({ record: accepted, signal: false, configured: false })).toMatchObject({ status: "accepted", tier: "off" });
  });
});

describe("createConsentStore", () => {
  it("defaults to pending and moves through accept, decline and withdraw", () => {
    const consent = createConsentStore(window.localStorage, {}, true);
    const listener = vi.fn();
    const unsubscribe = consent.subscribe(listener);
    expect(consent.getSnapshot()).toMatchObject({ status: "pending", tier: "anonymous", showBanner: true });
    const first = consent.getSnapshot();
    expect(consent.getSnapshot()).toBe(first);

    consent.accept(NOW);
    expect(consent.getSnapshot()).toMatchObject({ status: "accepted", tier: "full", showBanner: false });
    expect(readConsent(window.localStorage)?.choice).toBe("accepted");

    consent.withdraw(NOW);
    expect(consent.getSnapshot()).toMatchObject({ status: "declined", tier: "anonymous" });
    expect(readConsent(window.localStorage)?.choice).toBe("declined");

    consent.decline(NOW);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("starts from the stored record; a version bump shows the banner again", () => {
    store({ v: CONSENT_VERSION, choice: "declined", date: "2026-01-01" });
    expect(createConsentStore(window.localStorage, {}, true).getSnapshot()).toMatchObject({ status: "declined", tier: "anonymous", showBanner: false });
    store({ v: CONSENT_VERSION - 1, choice: "accepted", date: "2025-01-01" });
    expect(createConsentStore(window.localStorage, {}, true).getSnapshot()).toMatchObject({ status: "pending", showBanner: true });
  });

  it("DNT is off without a banner, GPC too, and an explicit accept overrides them", () => {
    const dnt = createConsentStore(window.localStorage, { doNotTrack: "1" }, true);
    expect(dnt.getSnapshot()).toMatchObject({ status: "suppressed", tier: "off", showBanner: false, signal: true });
    expect(createConsentStore(window.localStorage, { globalPrivacyControl: true }, true).getSnapshot()).toMatchObject({ tier: "off" });
    dnt.accept(NOW);
    expect(dnt.getSnapshot()).toMatchObject({ status: "accepted", tier: "full" });
    dnt.decline(NOW);
    expect(dnt.getSnapshot()).toMatchObject({ status: "suppressed", tier: "off" });
  });

  it("falls back to pending when storage is corrupt or throws, and keeps a choice in memory", () => {
    store("{not json");
    expect(createConsentStore(window.localStorage, {}, true).getSnapshot()).toMatchObject({ status: "pending" });
    const throwing: ConsentStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const consent = createConsentStore(throwing, {}, true);
    expect(consent.getSnapshot()).toMatchObject({ status: "pending" });
    consent.accept(NOW);
    expect(consent.getSnapshot()).toMatchObject({ status: "accepted", tier: "full" });
  });

  it("syncs choices made in another tab through the storage event", () => {
    const consent = createConsentStore(window.localStorage, {}, true);
    const listener = vi.fn();
    const unsubscribe = consent.subscribe(listener);
    store({ v: CONSENT_VERSION, choice: "accepted", date: "2026-03-04" });
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(consent.getSnapshot()).toMatchObject({ status: "accepted", tier: "full" });
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(consent.getSnapshot()).toMatchObject({ status: "pending" });
    unsubscribe();
    store({ v: CONSENT_VERSION, choice: "declined", date: "2026-03-04" });
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("useConsent", () => {
  it("re-renders on a choice", () => {
    const consent = createConsentStore(window.localStorage, {}, true);
    const { result } = renderHook(() => useConsent(consent));
    expect(result.current.showBanner).toBe(true);
    act(() => consent.accept(NOW));
    expect(result.current).toMatchObject({ status: "accepted", showBanner: false });
  });
});
