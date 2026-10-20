"use client";
// A tiny keyed value shared by every render pass of one <Chart>. Chart children render once per
// layer (back, marks, front, html, legends), so an add-on that hovers in the legend and highlights
// in the plot needs state outside React's tree; it lives here, keyed by the chart's store.
import { useCallback, useSyncExternalStore } from "react";
import { useChart } from "./cartesian";
import type { ChartStore } from "./store";
interface Slot {
  value: unknown;
  listeners: Set<() => void>;
}
const slots = new WeakMap<ChartStore, Map<string, Slot>>();
function slotFor(store: ChartStore, key: string, initial: unknown): Slot {
  let map = slots.get(store);
  if (!map) {
    map = new Map();
    slots.set(store, map);
  }
  let slot = map.get(key);
  if (!slot) {
    slot = { value: initial, listeners: new Set() };
    map.set(key, slot);
  }
  return slot;
}
/** [value, set] shared by every part of the enclosing chart under `key`. */
export function useSharedChartValue<T>(key: string, initial: T): [T, (value: T) => void] {
  const { store } = useChart();
  const slot = slotFor(store, key, initial);
  const subscribe = useCallback(
    (l: () => void) => {
      slot.listeners.add(l);
      return () => slot.listeners.delete(l);
    },
    [slot],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => slot.value as T,
    () => initial,
  );
  const set = useCallback(
    (next: T) => {
      if (Object.is(slot.value, next)) return;
      slot.value = next;
      for (const l of slot.listeners) l();
    },
    [slot],
  );
  return [value, set];
}
