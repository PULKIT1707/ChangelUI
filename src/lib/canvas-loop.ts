"use client";
// Shared canvas driver (roadmap I-11), extracted from the Particles pattern: DPR scaling, a
// ResizeObserver, pause while off screen or in a hidden tab, a theme MutationObserver, an optional
// fps cap and full cleanup. Internal: not exported from the package.
import { useEffect, type RefObject } from "react";
import { useLatestRef } from "./use-latest-ref";

export interface CanvasFrame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels. */
  width: number;
  height: number;
  dpr: number;
  /** Seconds since the loop started (paused time excluded). */
  time: number;
  /** Seconds since the previous frame (capped at 0.1 so a resumed tab doesn't jump). */
  delta: number;
  /** Computed `color` of the canvas element: use a text-* token class to theme the drawing. */
  color: string;
}

export interface CanvasLoopOptions {
  /** Frame cap. Default 60. Use 30 for slow ambient backgrounds. */
  fps?: number;
  /** false draws a single static frame (on mount, resize and theme change): use it for reduced motion. */
  running?: boolean;
  /** Pause while the canvas is outside the viewport. Default true. */
  pauseOffscreen?: boolean;
  /** Called after every resize with the new size (rebuild particles, grids, ...). */
  onResize?: (frame: CanvasFrame) => void;
  /**
   * While `running` is false, a change to this value repaints the static frame (pass a string built
   * from the props that shape the drawing). Ignored while running.
   */
  redrawKey?: string;
}

/**
 * Drives `draw` on a canvas sized to its parent element. The canvas should be absolutely positioned
 * (inset 0) inside a sized parent; the hook sets its backing store from the parent size × DPR.
 */
export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  draw: (frame: CanvasFrame) => void,
  { fps = 60, running = true, pauseOffscreen = true, onResize, redrawKey }: CanvasLoopOptions = {},
): void {
  const drawRef = useLatestRef(draw);
  const resizeRef = useLatestRef(onResize);
  // Restarting the effect repaints a static frame with the latest draw callback.
  const staticKey = running ? undefined : redrawKey;
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    const state: CanvasFrame = { ctx, width: 0, height: 0, dpr: 1, time: 0, delta: 0, color: "" };
    const minGap = fps >= 60 ? 0 : 1000 / Math.max(fps, 1);
    let frame = 0;
    let last = 0;
    let visible = true;
    let tabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const readColor = () => {
      state.color = getComputedStyle(canvas).color;
    };
    const paint = () => {
      ctx.save();
      drawRef.current(state);
      ctx.restore();
    };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      state.width = host.clientWidth;
      state.height = host.clientHeight;
      state.dpr = dpr;
      canvas.width = Math.max(1, Math.floor(state.width * dpr));
      canvas.height = Math.max(1, Math.floor(state.height * dpr));
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeRef.current?.(state);
      if (!running) paint();
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (minGap && now - last < minGap - 1) return;
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      state.delta = delta;
      state.time += delta;
      paint();
    };
    const start = () => {
      if (!running || frame || !visible || !tabVisible) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    readColor();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    let intersection: IntersectionObserver | null = null;
    if (pauseOffscreen && typeof IntersectionObserver !== "undefined") {
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      });
      intersection.observe(canvas);
    }
    const onVisibility = () => {
      tabVisible = document.visibilityState !== "hidden";
      if (tabVisible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Theme switches toggle a class or data-theme on <html>; re-read the token color.
    const themeObserver = new MutationObserver(() => {
      readColor();
      if (!running) paint();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-pui-theme", "style"],
    });
    start();
    return () => {
      stop();
      resizeObserver.disconnect();
      intersection?.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef, drawRef, resizeRef, fps, running, pauseOffscreen, staticKey]);
}
