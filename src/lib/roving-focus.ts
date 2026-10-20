"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useIsomorphicLayoutEffect, useLatestRef } from "./use-latest-ref";

export type RovingOrientation = "horizontal" | "vertical" | "both";

interface RovingItem {
  key: string;
  el: HTMLElement;
  disabled: boolean;
}

export interface RovingStore {
  subscribe: (listener: () => void) => () => void;
  /** The single tab stop: selected, else focused, else first enabled item in DOM order, else null. */
  getTabStopKey: () => string | null;
  /** True until the first item registers (server and pre-layout): the container is then the tab stop. */
  isEmpty: () => boolean;
  register: (item: RovingItem) => () => void;
  setFocusedKey: (key: string) => void;
  setSelectedKey: (key: string | null) => void;
}

/** One store per widget instance (design 6, roving focus). */
export function createRovingStore(): RovingStore {
  const items = new Map<string, RovingItem>();
  const listeners = new Set<() => void>();
  let focusedKey: string | null = null;
  let selectedKey: string | null = null;
  let tabStop: string | null = null;
  let empty = true;

  const enabled = (key: string | null) => key !== null && items.has(key) && !items.get(key)?.disabled;
  const compute = (): string | null => {
    if (enabled(selectedKey)) return selectedKey;
    if (enabled(focusedKey)) return focusedKey;
    const ordered = [...items.values()]
      .filter((item) => !item.disabled)
      .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return ordered[0]?.key ?? null;
  };
  const update = () => {
    const next = compute();
    const nextEmpty = items.size === 0;
    if (next === tabStop && nextEmpty === empty) return;
    tabStop = next;
    empty = nextEmpty;
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTabStopKey: () => tabStop,
    isEmpty: () => empty,
    register(item) {
      items.set(item.key, item);
      update();
      return () => {
        if (items.get(item.key) === item) items.delete(item.key);
        update();
      };
    },
    setFocusedKey(key) {
      focusedKey = key;
      update();
    },
    setSelectedKey(key) {
      selectedKey = key;
      update();
    },
  };
}

interface RovingContextValue {
  store: RovingStore;
  /** Server snapshot: selectedKey ?? null. */
  serverKey: string | null;
  manageTabStop: boolean;
}

const RovingContext = createContext<RovingContextValue | null>(null);

/** Provides the roving store to items. Pass the `value` returned by useRovingFocus. */
export function RovingFocusProvider({ value, children }: { value: RovingContextValue; children?: ReactNode }) {
  return createElement(RovingContext.Provider, { value }, children);
}

export interface UseRovingFocusOptions {
  orientation: RovingOrientation;
  /** Wrap from last to first and back. Default true. */
  loop?: boolean;
  selectedKey?: string | null;
  /** false: every item renders tabIndex -1 and focus moves programmatically (menus). Default true. */
  manageTabStop?: boolean;
  /** Called with the newly focused item's key ("selection follows focus" widgets). */
  onActivate?: (key: string) => void;
}

const ITEM_SELECTOR = "[data-roving-item]:not([disabled]):not([data-disabled])";
const NEXT_KEYS: Record<RovingOrientation, string[]> = {
  horizontal: ["ArrowRight"],
  vertical: ["ArrowDown"],
  both: ["ArrowRight", "ArrowDown"],
};
const PREV_KEYS: Record<RovingOrientation, string[]> = {
  horizontal: ["ArrowLeft"],
  vertical: ["ArrowUp"],
  both: ["ArrowLeft", "ArrowUp"],
};

function navigableItems(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter(
    (el) => el.closest("[data-roving-container]") === container,
  );
}

/** Arrow/Home/End navigation with a single tab stop (design 6). */
export function useRovingFocus({
  orientation,
  loop = true,
  selectedKey = null,
  manageTabStop = true,
  onActivate,
}: UseRovingFocusOptions) {
  const [store] = useState(createRovingStore);
  const onActivateRef = useLatestRef(onActivate);

  useIsomorphicLayoutEffect(() => {
    store.setSelectedKey(selectedKey);
  }, [store, selectedKey]);

  const tabStopKey = useSyncExternalStore(store.subscribe, store.getTabStopKey, () => selectedKey);
  const empty = useSyncExternalStore(store.subscribe, store.isEmpty, () => true);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const container = event.currentTarget;
      const target = event.target as HTMLElement;
      if (!target.hasAttribute("data-roving-item")) return;
      const items = navigableItems(container);
      const index = items.indexOf(target);
      if (index === -1) return;
      const rtl = getComputedStyle(container).direction === "rtl";
      const flip = (key: string) =>
        rtl && orientation !== "vertical" && (key === "ArrowLeft" || key === "ArrowRight")
          ? key === "ArrowLeft"
            ? "ArrowRight"
            : "ArrowLeft"
          : key;
      const key = flip(event.key);
      let next: number;
      if (NEXT_KEYS[orientation].includes(key)) next = loop ? (index + 1) % items.length : Math.min(index + 1, items.length - 1);
      else if (PREV_KEYS[orientation].includes(key)) next = loop ? (index - 1 + items.length) % items.length : Math.max(index - 1, 0);
      else if (key === "Home") next = 0;
      else if (key === "End") next = items.length - 1;
      else return;
      event.preventDefault();
      const el = items[next];
      if (!el || el === target) return;
      el.focus();
      const nextKey = el.getAttribute("data-key");
      if (nextKey !== null) onActivateRef.current?.(nextKey);
    },
    [orientation, loop, onActivateRef],
  );

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      // Only the container itself (tab stop when nothing is registered yet) forwards focus.
      if (event.target !== event.currentTarget) return;
      const items = navigableItems(event.currentTarget);
      const key = store.getTabStopKey();
      const el = items.find((item) => item.getAttribute("data-key") === key) ?? items[0];
      el?.focus();
    },
    [store],
  );

  // Never when items are registered but all disabled: a fully disabled widget has no tab stop.
  const containerTabbable = manageTabStop && tabStopKey === null && empty;
  const containerProps = {
    "data-roving-container": "",
    tabIndex: containerTabbable ? 0 : undefined,
    onKeyDown,
    onFocus,
  };

  const value = useMemo<RovingContextValue>(
    () => ({ store, serverKey: selectedKey, manageTabStop }),
    [store, selectedKey, manageTabStop],
  );

  return { containerProps, value };
}

export interface UseRovingItemOptions {
  ref: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

/** Registers an item; spread the result on the item element (React owns tabIndex). */
export function useRovingItem(key: string, { ref, disabled = false }: UseRovingItemOptions) {
  const context = useContext(RovingContext);
  if (!context) throw new Error("[changelui] useRovingItem must be used inside its widget");
  const { store, serverKey, manageTabStop } = context;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return store.register({ key, el, disabled });
  }, [store, key, disabled, ref]);

  const tabStopKey = useSyncExternalStore(store.subscribe, store.getTabStopKey, () => serverKey);
  const onFocus = useCallback(() => store.setFocusedKey(key), [store, key]);

  return {
    tabIndex: manageTabStop && !disabled && tabStopKey === key ? 0 : -1,
    onFocus,
    "data-roving-item": "",
    "data-key": key,
  };
}
