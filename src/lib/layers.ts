"use client";

import { useId, useSyncExternalStore } from "react";
import { getGlobal } from "./global";
import { useIsomorphicLayoutEffect, useLatestRef } from "./use-latest-ref";

export type LayerKind = "modal" | "popover" | "menu" | "tooltip";

export interface LayerConfig {
  kind: LayerKind;
  /** Whether the layer owns focus (traps or moves it). Default: true except for tooltips. */
  takesFocus?: boolean;
  /** Escape handler. A non-dismissible modal still passes a no-op so Escape never leaks below it. */
  onEscape?: (event: KeyboardEvent) => void;
  /** Called when a pointerdown lands outside contentEls() while this layer is on top. */
  onPointerDownOutside?: (event: PointerEvent) => void;
  /**
   * Elements that count as inside (content, trigger). Tooltips list only their bubble: a
   * pointerdown on it never dismisses a layer beneath, while its trigger counts for whichever
   * layer contains it.
   */
  contentEls?: () => ReadonlyArray<Element | null | undefined>;
}

interface LayerRecord {
  id: string;
  readonly config: LayerConfig;
}

interface LayerStack {
  layers: LayerRecord[];
  listeners: Set<() => void>;
  attached: boolean;
}

const getStack = () =>
  getGlobal<LayerStack>("layers", () => ({ layers: [], listeners: new Set(), attached: false }));

function takesFocus(config: LayerConfig): boolean {
  return config.takesFocus ?? config.kind !== "tooltip";
}

/** Bubble phase: inner widgets can consume Escape first by calling preventDefault(). */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const { layers } = getStack();
  // Tooltips close ahead of any other layer (design 7.1 #23), even when registered first, as
  // happens when a tooltip mounts open inside a dialog (child layout effects run first).
  let tooltip: LayerRecord | undefined;
  for (const layer of layers) if (layer.config.kind === "tooltip" && layer.config.onEscape) tooltip = layer;
  const ordered = tooltip ? [...layers.filter((layer) => layer !== tooltip), tooltip] : layers;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const handler = ordered[i]?.config.onEscape;
    if (handler) {
      handler(event);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
}

const containsTarget = (layer: LayerRecord, target: Node) =>
  (layer.config.contentEls?.() ?? []).some((el) => el?.contains(target));

/**
 * Capture phase: only the top non-tooltip layer evaluates "outside". Tooltips never dismiss on
 * outside clicks, so one on top must not shield the popover or menu beneath it (as with Escape),
 * but a pointerdown on a tooltip bubble (portaled, hoverable) is not outside that layer either.
 */
function onPointerDown(event: PointerEvent): void {
  const { layers } = getStack();
  const target = event.target;
  if (!(target instanceof Node)) return;
  let top: LayerRecord | undefined;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer?.config.kind === "tooltip") {
      if (containsTarget(layer, target)) return;
    } else if (!top) top = layer;
  }
  const handler = top?.config.onPointerDownOutside;
  if (!top || !handler) return;
  if (!containsTarget(top, target)) handler(event);
}

function notify(stack: LayerStack): void {
  for (const listener of stack.listeners) listener();
}

/** Pushes a layer; returns its removal function. Document listeners attach lazily and detach when empty. */
export function registerLayer(record: LayerRecord): () => void {
  const stack = getStack();
  stack.layers.push(record);
  if (!stack.attached) {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    stack.attached = true;
  }
  notify(stack);
  return () => {
    const index = stack.layers.indexOf(record);
    if (index !== -1) stack.layers.splice(index, 1);
    if (stack.layers.length === 0 && stack.attached) {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      stack.attached = false;
    }
    notify(stack);
  };
}

function subscribe(listener: () => void): () => void {
  const { listeners } = getStack();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface LayerState {
  isTop: boolean;
  isTopFocusLayer: boolean;
  /** A layer of kind "modal" sits above this one (nested dialogs recede). */
  underModal: boolean;
}

// Indexed by the bits isTop (4), isTopFocusLayer (2) and underModal (1), so useSyncExternalStore
// always returns one of eight stable objects.
const STATES: readonly LayerState[] = Array.from({ length: 8 }, (_, bits) => ({
  isTop: (bits & 4) !== 0,
  isTopFocusLayer: (bits & 2) !== 0,
  underModal: (bits & 1) !== 0,
}));
const CLOSED = STATES[0] as LayerState;

function stateFor(id: string): LayerState {
  const { layers } = getStack();
  const index = layers.findIndex((layer) => layer.id === id);
  if (index === -1) return CLOSED;
  const isTop = index === layers.length - 1;
  let focusLayer: LayerRecord | undefined;
  for (let i = layers.length - 1; i >= 0 && !focusLayer; i--) {
    const layer = layers[i];
    if (layer && takesFocus(layer.config)) focusLayer = layer;
  }
  let underModal = false;
  for (let i = index + 1; i < layers.length && !underModal; i++) underModal = layers[i]?.config.kind === "modal";
  return STATES[(isTop ? 4 : 0) | (focusLayer?.id === id ? 2 : 0) | (underModal ? 1 : 0)] ?? CLOSED;
}

/** Registers a layer while open (design 6). */
export function useLayer(open: boolean, config: LayerConfig): LayerState {
  const id = useId();
  const configRef = useLatestRef(config);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    return registerLayer({
      id,
      get config() {
        return configRef.current;
      },
    });
  }, [open, id, configRef]);

  return useSyncExternalStore(
    subscribe,
    () => (open ? stateFor(id) : CLOSED),
    () => CLOSED,
  );
}
