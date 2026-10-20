"use client";
// Pointer drag with velocity (roadmap I-11) for sliders-to-confirm, card stacks, globes and peels.
// Internal: not exported from the package.
import { useEffect, type RefObject } from "react";
import { useLatestRef } from "./use-latest-ref";

export interface DragInfo {
  /** Pointer position relative to the element's top-left corner, px. */
  x: number;
  y: number;
  /** Offset from where the drag started, px (locked to `axis` when set). */
  dx: number;
  dy: number;
  /** Velocity over the last ~100ms, px per second. */
  vx: number;
  vy: number;
  event: PointerEvent;
}

export interface DragHandlers {
  /** Return false to cancel this drag (e.g. the press landed on a nested control). */
  onStart?: (info: DragInfo) => void | false;
  onMove?: (info: DragInfo) => void;
  /** Also called on pointercancel. */
  onEnd?: (info: DragInfo) => void;
}

export interface DragOptions {
  /** px the pointer must travel before the drag starts. Default 3. */
  threshold?: number;
  /** Lock movement to one axis. */
  axis?: "x" | "y";
  /** Default true. */
  enabled?: boolean;
}

interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Pointer-captured drag on `ref` for mouse, pen and touch. Set `touch-action` on the element
 * (e.g. `touch-none` or `touch-pan-y`) so touch drags aren't taken by the browser's scrolling.
 */
export function useDrag(
  ref: RefObject<HTMLElement | null>,
  handlers: DragHandlers,
  { threshold = 3, axis, enabled = true }: DragOptions = {},
): void {
  const handlersRef = useLatestRef(handlers);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let pointerId: number | null = null;
    let started = false;
    let origin = { x: 0, y: 0 };
    let samples: Sample[] = [];
    const info = (event: PointerEvent): DragInfo => {
      const rect = el.getBoundingClientRect();
      const now = event.timeStamp || performance.now();
      samples.push({ x: event.clientX, y: event.clientY, t: now });
      samples = samples.filter((s) => now - s.t <= 100);
      const first = samples[0] as Sample;
      const span = (now - first.t) / 1000;
      let vx = span > 0 ? (event.clientX - first.x) / span : 0;
      let vy = span > 0 ? (event.clientY - first.y) / span : 0;
      let dx = event.clientX - origin.x;
      let dy = event.clientY - origin.y;
      if (axis === "x") {
        dy = 0;
        vy = 0;
      } else if (axis === "y") {
        dx = 0;
        vx = 0;
      }
      return { x: event.clientX - rect.left, y: event.clientY - rect.top, dx, dy, vx, vy, event };
    };
    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      pointerId = event.pointerId;
      started = false;
      origin = { x: event.clientX, y: event.clientY };
      samples = [{ x: event.clientX, y: event.clientY, t: event.timeStamp || performance.now() }];
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const current = info(event);
      if (!started) {
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < threshold) return;
        if (handlersRef.current.onStart?.(current) === false) {
          pointerId = null;
          return;
        }
        started = true;
        el.setPointerCapture?.(event.pointerId);
      }
      handlersRef.current.onMove?.(current);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (!started) return;
      started = false;
      if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
      handlersRef.current.onEnd?.(info(event));
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [ref, handlersRef, threshold, axis, enabled]);
}
