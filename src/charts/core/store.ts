"use client";
// Per-chart interaction store (useSyncExternalStore, like lib/roving-focus). Pointer moves and
// keyboard focus update the store; only subscribed parts (tooltip, crosshair, highlighted marks)
// re-render. Controlled props are supported per key: the store reports the requested change and
// the owner syncs the prop back in, so the store never fights the parent.
import { createContext, createElement, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ChartPattern } from "./color";

/** One mark: a series and the index of its datum. */
export interface ChartItem {
  seriesId: string;
  index: number;
}

export type Span = readonly [number, number];
export type SelectionMode = "none" | "single" | "multiple";

export interface SeriesMeta {
  id: string;
  label: string;
  color: string;
  pattern?: ChartPattern;
  yAxisId?: string;
  stack?: string;
}

export interface ChartState {
  /** Plot size in px. */
  width: number;
  height: number;
  /** Pointer position in plot px, or null when outside. */
  pointer: { x: number; y: number } | null;
  /** Hovered or keyboard-focused mark (drives fades, tooltip, crosshair). */
  highlight: ChartItem | null;
  /** Keyboard focus position (kept while the pointer hovers elsewhere). */
  focus: ChartItem | null;
  selection: readonly ChartItem[];
  /** Hidden series ids (legend toggles). */
  hidden: readonly string[];
  /** Series isolated by Alt+click, with the hidden set to restore. */
  solo: { id: string; restore: readonly string[] } | null;
  /** Zoomed x window, or null for the full extent. */
  xDomain: Span | null;
  /** Registered series, in registration order. */
  series: readonly SeriesMeta[];
  /** Latest live-region text. */
  announcement: string;
  /** Hovered, keyboard-focused or synced point index (axis tooltip, crosshair), or null. */
  activeIndex: number | null;
}

export type ControlledKey = "highlight" | "selection" | "hidden" | "xDomain";

export interface ChartStoreHandlers {
  onHighlightChange?: (item: ChartItem | null) => void;
  onSelectionChange?: (items: ChartItem[]) => void;
  onHiddenSeriesChange?: (ids: string[]) => void;
  onXDomainChange?: (domain: Span | null) => void;
}

export interface ChartStore {
  getState: () => ChartState;
  subscribe: (listener: () => void) => () => void;
  /** Merges a patch; listeners fire only when a field actually changed. */
  set(patch: Partial<ChartState>): void;
  /** Declares which keys the parent controls, and the change callbacks. */
  configure(controlled: Partial<Record<ControlledKey, boolean>>, handlers: ChartStoreHandlers): void;
  setSize(width: number, height: number): void;
  setPointer(pointer: { x: number; y: number } | null): void;
  setHighlight(item: ChartItem | null): void;
  setFocus(item: ChartItem | null): void;
  /** Click/Enter: single toggles one item; multiple with `additive` (Shift/Cmd) toggles membership. */
  select(item: ChartItem, mode: SelectionMode, additive?: boolean): void;
  clearSelection(): void;
  toggleSeries(id: string): void;
  /** Alt+click: show only this series; again restores the previous visibility. */
  soloSeries(id: string): void;
  setXDomain(domain: Span | null): void;
  /** Adds a series (replacing one with the same id); returns the unregister function. */
  registerSeries(meta: SeriesMeta): () => void;
  announce(text: string): void;
  setActiveIndex(index: number | null): void;
}

const sameItem = (a: ChartItem | null, b: ChartItem | null) => a === b || (!!a && !!b && a.seriesId === b.seriesId && a.index === b.index);
const sameSpan = (a: Span | null, b: Span | null) => a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1]);
const sameList = <T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean) => a.length === b.length && a.every((x, i) => eq(x, b[i] as T));

const EQUALS: { [K in keyof ChartState]: (a: ChartState[K], b: ChartState[K]) => boolean } = {
  width: Object.is,
  height: Object.is,
  pointer: (a, b) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y),
  highlight: sameItem,
  focus: sameItem,
  selection: (a, b) => sameList(a, b, (x, y) => sameItem(x, y)),
  hidden: (a, b) => sameList(a, b, Object.is),
  solo: (a, b) => a === b || (!!a && !!b && a.id === b.id && sameList(a.restore, b.restore, Object.is)),
  xDomain: sameSpan,
  series: (a, b) => a === b,
  announcement: Object.is,
  activeIndex: Object.is,
};

export const INITIAL_CHART_STATE: ChartState = {
  width: 0,
  height: 0,
  pointer: null,
  highlight: null,
  focus: null,
  selection: [],
  hidden: [],
  solo: null,
  xDomain: null,
  series: [],
  announcement: "",
  activeIndex: null,
};

export function createChartStore(initial: Partial<ChartState> = {}): ChartStore {
  let state: ChartState = { ...INITIAL_CHART_STATE, ...initial };
  const listeners = new Set<() => void>();
  let controlled: Partial<Record<ControlledKey, boolean>> = {};
  let handlers: ChartStoreHandlers = {};

  const set = (patch: Partial<ChartState>) => {
    let next: ChartState | null = null;
    for (const key of Object.keys(patch) as Array<keyof ChartState>) {
      const value = patch[key];
      const eq = EQUALS[key] as (a: unknown, b: unknown) => boolean;
      if (value === undefined || eq(state[key], value)) continue;
      next ??= { ...state };
      (next as unknown as Record<string, unknown>)[key] = value;
    }
    if (!next) return;
    state = next;
    for (const listener of listeners) listener();
  };

  /** Applies a change to a possibly controlled key: report it, and store it only when uncontrolled. */
  const change = <K extends ControlledKey>(key: K, value: ChartState[K], extra: Partial<ChartState> = {}) => {
    const eq = EQUALS[key] as (a: unknown, b: unknown) => boolean;
    const changed = !eq(state[key], value);
    if (controlled[key]) set(extra);
    else set({ ...extra, [key]: value });
    if (!changed) return;
    if (key === "highlight") handlers.onHighlightChange?.(value as ChartItem | null);
    else if (key === "selection") handlers.onSelectionChange?.([...(value as ChartItem[])]);
    else if (key === "hidden") handlers.onHiddenSeriesChange?.([...(value as string[])]);
    else handlers.onXDomainChange?.(value as Span | null);
  };

  const store: ChartStore = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set,
    configure(nextControlled, nextHandlers) {
      controlled = nextControlled;
      handlers = nextHandlers;
    },
    setSize: (width, height) => set({ width, height }),
    setPointer: (pointer) => set({ pointer }),
    setHighlight: (item) => change("highlight", item),
    setFocus: (item) => set({ focus: item }),
    select(item, mode, additive = false) {
      if (mode === "none") return;
      const current = state.selection;
      const has = current.some((x) => sameItem(x, item));
      let next: ChartItem[];
      if (mode === "single" || !additive) next = has && current.length === 1 ? [] : [item];
      else next = has ? current.filter((x) => !sameItem(x, item)) : [...current, item];
      change("selection", next);
    },
    clearSelection: () => change("selection", []),
    toggleSeries(id) {
      const hidden = state.hidden.includes(id) ? state.hidden.filter((x) => x !== id) : [...state.hidden, id];
      change("hidden", hidden, { solo: null });
    },
    soloSeries(id) {
      if (state.solo?.id === id) {
        change("hidden", [...state.solo.restore], { solo: null });
        return;
      }
      const restore = state.solo ? state.solo.restore : state.hidden;
      change(
        "hidden",
        state.series.map((s) => s.id).filter((x) => x !== id),
        { solo: { id, restore } },
      );
    },
    setXDomain: (domain) => change("xDomain", domain),
    registerSeries(meta) {
      set({ series: [...state.series.filter((s) => s.id !== meta.id), meta] });
      return () => {
        if (state.series.some((s) => s === meta)) set({ series: state.series.filter((s) => s !== meta) });
      };
    },
    announce: (text) => set({ announcement: text }),
    setActiveIndex: (index) => set({ activeIndex: index }),
  };
  return store;
}

/** Remembers the last selected value so equal results keep their identity (no extra renders). */
function createSelectorMemo<T>() {
  let has = false;
  let lastState: ChartState | undefined;
  let lastValue: T | undefined;
  return {
    read(state: ChartState, selector: (s: ChartState) => T, isEqual: (a: T, b: T) => boolean): T {
      if (has && state === lastState) return lastValue as T;
      const value = selector(state);
      lastState = state;
      if (has && isEqual(lastValue as T, value)) return lastValue as T;
      has = true;
      lastValue = value;
      return value;
    },
  };
}

/**
 * Subscribes to a slice of the chart state. Re-renders only when `isEqual` says the slice changed
 * (default Object.is), so selectors may return fresh arrays when they pass a structural isEqual.
 */
export function useChartSelector<T>(store: ChartStore, selector: (state: ChartState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const [memo] = useState(createSelectorMemo<T>);
  const read = () => memo.read(store.getState(), selector, isEqual);
  return useSyncExternalStore(store.subscribe, read, read);
}

const ChartStoreContext = createContext<ChartStore | null>(null);

export function ChartStoreProvider({ store, children }: { store: ChartStore; children?: ReactNode }) {
  return createElement(ChartStoreContext.Provider, { value: store }, children);
}

/** The enclosing chart's store; throws outside a chart. */
export function useChartStoreContext(): ChartStore {
  const store = useContext(ChartStoreContext);
  if (!store) throw new Error("[changelui] chart parts must be rendered inside a Chart");
  return store;
}

/** True when `item`'s series is hidden. */
export function isSeriesHidden(state: ChartState, seriesId: string): boolean {
  return state.hidden.includes(seriesId);
}

/** True when another item is highlighted (this one should fade). */
export function isFaded(state: ChartState, seriesId: string): boolean {
  return !!state.highlight && state.highlight.seriesId !== seriesId;
}

export function isSelected(state: ChartState, item: ChartItem): boolean {
  return state.selection.some((x) => sameItem(x, item));
}
