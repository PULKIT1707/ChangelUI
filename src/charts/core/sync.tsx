"use client";
// ChartSyncGroup: shares the hovered x value (and optionally the zoom window) across charts.
// Sync is by x value, not index, so charts with different sampling snap to their own nearest datum.
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type Span = readonly [number, number];

export interface SyncState {
  /** Hovered or keyboard-focused x value (numbers; epoch ms for time axes). */
  hoverX: number | null;
  /** Id of the chart that set hoverX (it already shows its own crosshair). */
  source: string | null;
  domain: Span | null;
}

export interface SyncStore {
  getState: () => SyncState;
  subscribe: (listener: () => void) => () => void;
  setHover(x: number | null, source: string | null): void;
  setDomain(domain: Span | null): void;
}

export function createSyncStore(): SyncStore {
  let state: SyncState = { hoverX: null, source: null, domain: null };
  const listeners = new Set<() => void>();
  const emit = (next: SyncState) => {
    state = next;
    for (const l of listeners) l();
  };
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setHover(x, source) {
      if (state.hoverX === x && state.source === source) return;
      emit({ ...state, hoverX: x, source: x === null ? null : source });
    },
    setDomain(domain) {
      const d = state.domain;
      if (d === domain || (d && domain && d[0] === domain[0] && d[1] === domain[1])) return;
      emit({ ...state, domain });
    },
  };
}

export interface ChartSyncContextValue {
  id: string;
  store: SyncStore;
  /** Share the zoom window too. */
  syncZoom: boolean;
}

const SyncContext = createContext<ChartSyncContextValue | null>(null);

export interface ChartSyncGroupProps {
  /** Group name (for debugging and data attributes). */
  id?: string;
  /** Also share the zoom window. Default false. */
  syncZoom?: boolean;
  children?: ReactNode;
}

/** Links every chart inside it. Renders no element. */
export function ChartSyncGroup({ id = "sync", syncZoom = false, children }: ChartSyncGroupProps) {
  const [store] = useState(createSyncStore);
  const value = useMemo(() => ({ id, store, syncZoom }), [id, store, syncZoom]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

/** The enclosing sync group, or null when the chart is standalone. */
export function useChartSyncGroup(): ChartSyncContextValue | null {
  return useContext(SyncContext);
}

const noop = () => () => {};
const nothing = () => null;

/** The group's hovered x as set by another chart (null when none, or set by `selfId`). */
export function useSyncedHoverX(selfId: string): number | null {
  const group = useContext(SyncContext);
  const subscribe = group ? group.store.subscribe : noop;
  const read = group
    ? () => {
        const s = group.store.getState();
        return s.source === selfId ? null : s.hoverX;
      }
    : nothing;
  return useSyncExternalStore(subscribe, read, nothing);
}

/** The group's shared zoom window when syncZoom is on, else null. */
export function useSyncedDomain(): Span | null {
  const group = useContext(SyncContext);
  const subscribe = group?.syncZoom ? group.store.subscribe : noop;
  const read = group?.syncZoom ? () => group.store.getState().domain : nothing;
  return useSyncExternalStore(subscribe, read, nothing);
}
