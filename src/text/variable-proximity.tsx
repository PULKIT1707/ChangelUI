"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { useMediaQuery } from "../hooks/use-media-query";

export type VariableProximityFalloff = "linear" | "exponential" | "gaussian";

export interface VariableProximityProps extends Omit<MotionSafeHTMLProps<HTMLElement>, "children"> {
  /** The text. Each letter reacts on its own. */
  children: string;
  /** Rendered tag. Default "span". */
  as?: TextTag;
  /** px around the pointer that letters react within. Default 120. */
  radius?: number;
  /** `font-variation-settings` at rest, e.g. "'wght' 400, 'opsz' 14". Default "'wght' 400". */
  from?: string;
  /** Settings at the pointer; axes missing from `from` start at their `to` value. Default "'wght' 900". */
  to?: string;
  /** Curve from the pointer out to `radius`. Default "linear". */
  falloff?: VariableProximityFalloff;
  /** Also tints the nearest letters toward the primary color. Default false. */
  accent?: boolean;
  /** Share of the gap closed each frame, 0-1; lower is smoother. Default 0.15. */
  smoothing?: number;
  /** Measure the pointer only while it is over this element (default: anywhere on the page). */
  containerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

type Axes = Map<string, number>;

function parseSettings(value: string): Axes {
  const axes: Axes = new Map();
  for (const match of value.matchAll(/["']([A-Za-z0-9]{4})["']\s+(-?[\d.]+)/g)) {
    axes.set(match[1] as string, Number(match[2]));
  }
  return axes;
}

function curve(t: number, falloff: VariableProximityFalloff): number {
  if (falloff === "exponential") return t * t * t;
  if (falloff === "gaussian") return Math.exp(-((1 - t) ** 2) / (2 * 0.3 ** 2)) * (t > 0 ? 1 : 0);
  return t;
}

function settingsAt(from: Axes, to: Axes, t: number): { settings: string; weight: number | null } {
  const parts: string[] = [];
  let weight: number | null = null;
  for (const [axis, end] of to) {
    const start = from.get(axis) ?? end;
    const value = start + (end - start) * t;
    if (axis === "wght") weight = value;
    parts.push(`"${axis}" ${Math.round(value * 10) / 10}`);
  }
  for (const [axis, start] of from) {
    if (to.has(axis)) continue;
    if (axis === "wght") weight = start;
    parts.push(`"${axis}" ${start}`);
  }
  return { settings: parts.join(", "), weight };
}

/**
 * Text whose variable-font axes (weight, width, slant, optical size) swell letter by letter as the
 * pointer gets close, like pressure. Writes styles straight to the letters once per frame without
 * re-rendering. Screen readers get the plain text; coarse pointers and reduced motion render `from`.
 */
export const VariableProximity = React.forwardRef<HTMLElement, VariableProximityProps>(function VariableProximity(
  {
    children,
    as = "span",
    radius = 120,
    from = "'wght' 400",
    to = "'wght' 900",
    falloff = "linear",
    accent = false,
    smoothing = 0.15,
    containerRef,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const coarse = useMediaQuery("(pointer: coarse)");
  const active = !disabled && !reduced && !coarse;
  const fromAxes = React.useMemo(() => parseSettings(from), [from]);
  const toAxes = React.useMemo(() => parseSettings(to), [to]);
  const rest = React.useMemo(() => settingsAt(fromAxes, toAxes, 0), [fromAxes, toAxes]);
  const words = React.useMemo(() => children.split(/(\s+)/), [children]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const letters = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-pui-letter]"));
    const paint = (el: HTMLSpanElement, t: number) => {
      const { settings, weight } = settingsAt(fromAxes, toAxes, t);
      el.style.fontVariationSettings = settings;
      el.style.fontWeight = weight === null ? "" : String(Math.round(weight));
      el.style.color = accent && t > 0.01 ? `color-mix(in oklab, var(--pui-primary-text) ${Math.round(t * 100)}%, currentColor)` : "";
    };
    if (!active) {
      for (const el of letters) paint(el, 0);
      return;
    }
    const current = letters.map(() => 0);
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const tick = () => {
      frame = 0;
      // Read every rect first, then write, so each frame lays out once.
      const centers = letters.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      let moving = false;
      letters.forEach((el, i) => {
        const c = centers[i] as { x: number; y: number };
        const d = pointer ? Math.hypot(pointer.x - c.x, pointer.y - c.y) : Infinity;
        const target = radius > 0 && d < radius ? curve(1 - d / radius, falloff) : 0;
        const prev = current[i] as number;
        let next = prev + (target - prev) * Math.min(Math.max(smoothing, 0.01), 1);
        if (Math.abs(target - next) < 0.002) next = target;
        if (next !== prev) {
          current[i] = next;
          paint(el, next);
        }
        if (next !== target) moving = true;
      });
      if (moving) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const container = containerRef?.current;
      if (container && !container.contains(event.target as Node)) {
        if (pointer) {
          pointer = null;
          schedule();
        }
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, radius, falloff, smoothing, accent, fromAxes, toAxes, containerRef, children]);

  // Every TextTag accepts the same HTML attributes; one concrete tag keeps the JSX types simple.
  const Tag = as as "span";
  return (
    <Tag
      ref={mergedRef}
      data-state={active ? "interactive" : "static"}
      {...props}
      className={cn(blockReset, className)}
    >
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <span aria-hidden="true" className={cn(blockReset, "whitespace-pre-wrap")}>
        {words.map((word, w) =>
          /^\s+$/.test(word) || word === "" ? (
            word
          ) : (
            <span key={w} className={cn(blockReset, "inline-block whitespace-nowrap")}>
              {Array.from(word).map((char, c) => {
                return (
                  <span
                    key={c}
                    data-pui-letter=""
                    className={cn(blockReset, "inline-block")}
                    style={{
                      fontVariationSettings: rest.settings,
                      fontWeight: rest.weight === null ? undefined : Math.round(rest.weight),
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          ),
        )}
      </span>
    </Tag>
  );
});
