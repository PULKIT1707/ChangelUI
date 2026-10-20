"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useIsClient } from "../lib/use-is-client";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type PixelRevealPattern = "random" | "wipe" | "radial" | "diagonal" | "rain";
export type PixelRevealTrigger = "inView" | "mount" | "hover" | "manual";

export interface PixelRevealProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Grid columns. Default 16. */
  cols?: number;
  /** Grid rows. Default 10. */
  rows?: number;
  /** Order in which cells dissolve. Default "random". */
  pattern?: PixelRevealPattern;
  /** Seconds from the first cell to the last. Default 0.8. */
  duration?: number;
  /** Seconds each cell takes to fade. Default 0.22. */
  cellDuration?: number;
  /** Seconds before the reveal starts. Default 0. */
  delay?: number;
  /** "inView" (default) and "mount" reveal once; "hover" reveals on hover or focus and covers again on leave; "manual" follows `revealed`. */
  trigger?: PixelRevealTrigger;
  /** Controlled state for trigger="manual". */
  revealed?: boolean;
  /** Cover color. Default "var(--pui-primary)". */
  color?: string;
  /** Cells shrink into dots as they fade. Default true. */
  shrink?: boolean;
  /** Seed for the random order (same seed, same order on server and client). Default 7. */
  seed?: number;
  /** Called once the last cell has faded. */
  onRevealed?: () => void;
}

function cellDelays(cols: number, rows: number, pattern: PixelRevealPattern, seed: number): number[] {
  const rand = mulberry32(seed);
  const delays: number[] = [];
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxRadial = Math.hypot(cx, cy) || 1;
  const columnOffsets = Array.from({ length: cols }, () => rand() * 0.45);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitter = rand();
      let t: number;
      switch (pattern) {
        case "wipe":
          t = (c / Math.max(cols - 1, 1)) * 0.8 + jitter * 0.2;
          break;
        case "radial":
          t = (Math.hypot(c - cx, r - cy) / maxRadial) * 0.8 + jitter * 0.2;
          break;
        case "diagonal":
          t = ((c + r) / Math.max(cols + rows - 2, 1)) * 0.85 + jitter * 0.15;
          break;
        case "rain":
          t = (columnOffsets[c] ?? 0) + (r / Math.max(rows - 1, 1)) * 0.55;
          break;
        default:
          t = jitter;
      }
      delays.push(Math.min(Math.max(t, 0), 1));
    }
  }
  return delays;
}

/**
 * Reveals its content through a grid of pixels that dissolve in a random, wipe, radial, diagonal or
 * rain order. The content is in the DOM from the start; the pixel cover is a decorative overlay that
 * only mounts in the browser, so server HTML and reduced motion show the content directly.
 */
export const PixelReveal = React.forwardRef<HTMLDivElement, PixelRevealProps>(function PixelReveal(
  {
    cols = 16,
    rows = 10,
    pattern = "random",
    duration = 0.8,
    cellDuration = 0.22,
    delay = 0,
    trigger = "inView",
    revealed: revealedProp,
    color = "var(--pui-primary)",
    shrink = true,
    seed = 7,
    onRevealed,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    className,
    children,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const inView = useInViewTrigger(localRef, { trigger: trigger === "mount" ? "mount" : "inView", once: true, margin: "0px 0px -15% 0px" });
  const [hovered, setHovered] = React.useState(false);
  const safeCols = Math.max(1, Math.min(Math.round(cols), 64));
  const safeRows = Math.max(1, Math.min(Math.round(rows), 64));
  const delays = React.useMemo(() => cellDelays(safeCols, safeRows, pattern, seed), [safeCols, safeRows, pattern, seed]);

  // The cover has to paint once before it can dissolve, so "mount" waits two frames.
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArmed(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  const revealed =
    trigger === "manual" ? Boolean(revealedProp) : trigger === "hover" ? hovered : armed && inView;
  const onRevealedRef = useLatestRef(onRevealed);

  React.useEffect(() => {
    if (!revealed || reduced) return;
    const id = window.setTimeout(() => onRevealedRef.current?.(), (delay + duration + cellDuration) * 1000);
    return () => window.clearTimeout(id);
  }, [revealed, reduced, delay, duration, cellDuration, onRevealedRef]);

  const showOverlay = isClient && !reduced;
  const hover = trigger === "hover";
  return (
    <div
      ref={mergedRef}
      data-state={revealed || reduced ? "revealed" : "covered"}
      data-pattern={pattern}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, () => hover && setHovered(true))}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => hover && setHovered(false))}
      onFocus={composeEventHandlers(onFocus, () => hover && setHovered(true))}
      onBlur={composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLDivElement>) => {
        if (hover && !event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false);
      })}
      className={cn(blockReset, "relative isolate overflow-hidden", className)}
    >
      {children}
      {showOverlay ? (
        <div
          aria-hidden="true"
          style={{ gridTemplateColumns: `repeat(${safeCols}, 1fr)`, gridTemplateRows: `repeat(${safeRows}, 1fr)` }}
          className={cn(blockReset, "pointer-events-none absolute inset-0 z-10 grid")}
        >
          {delays.map((t, i) => {
            // Covering again on hover-out runs the order in reverse, so it feels like one gesture.
            const at = revealed ? delay + t * duration : (1 - t) * duration * 0.6;
            return (
              <span
                key={i}
                style={{
                  backgroundColor: color,
                  opacity: revealed ? 0 : 1,
                  transform: revealed && shrink ? "scale(0.3)" : "scale(1.02)",
                  transitionProperty: "opacity, transform",
                  transitionDuration: `${cellDuration}s`,
                  transitionDelay: `${at.toFixed(3)}s`,
                  transitionTimingFunction: "var(--pui-ease-out)",
                  borderRadius: revealed && shrink ? "30%" : "0",
                }}
                className={cn(blockReset, "block")}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
});
