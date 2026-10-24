"use client";
import { useMotionValueEvent, useScroll, type UseScrollOptions } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings, type EasingName } from "../hooks/motion-presets";
import { blockReset } from "../lib/styles";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface PathDrawProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "inView" draws once it scrolls into view, "mount" right away, "scroll" ties drawing to scroll. Default "inView". */
  trigger?: "inView" | "mount" | "scroll";
  /** Seconds each stroke takes. Default 1.4. */
  duration?: number;
  /** Seconds between consecutive strokes. Default 0.12. */
  stagger?: number;
  /** Seconds before the first stroke. Default 0. */
  delay?: number;
  /** Motion preset easing. Default "inOut". */
  ease?: EasingName;
  /** Fade filled shapes in as their outline finishes. Default true. */
  fill?: boolean;
  /** Draw again every time it re-enters the view (inView only). Default false. */
  repeat?: boolean;
  /** Which SVG elements draw. Default every path, line, polyline, polygon, circle, ellipse and rect. */
  selector?: string;
  /** Scroll window for trigger="scroll". Default ["start 0.9", "end 0.6"]. */
  scrollOffset?: UseScrollOptions["offset"];
  /** Scroll container for trigger="scroll". Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Fires when every stroke has finished drawing. */
  onComplete?: () => void;
}
const DEFAULT_SELECTOR = "path, line, polyline, polygon, circle, ellipse, rect";
const DEFAULT_OFFSET: NonNullable<UseScrollOptions["offset"]> = ["start 0.9", "end 0.6"];
interface Stroke {
  el: SVGGeometryElement;
  length: number;
  /** Final fill-opacity, or null for shapes without a fill. */
  fill: number | null;
}
function measure(root: HTMLElement, selector: string, withFill: boolean): Stroke[] {
  const out: Stroke[] = [];
  for (const node of Array.from(root.querySelectorAll(selector))) {
    if (typeof (node as SVGGeometryElement).getTotalLength !== "function") continue;
    const el = node as SVGGeometryElement;
    let length = 0;
    try {
      length = el.getTotalLength();
    } catch {
      continue;
    }
    if (!Number.isFinite(length) || length <= 0) continue;
    let fill: number | null = null;
    if (withFill && typeof getComputedStyle === "function") {
      const style = getComputedStyle(el);
      if (style.fill && style.fill !== "none" && style.fill !== "transparent") fill = Number.parseFloat(style.fillOpacity || "1");
      if (fill !== null && !Number.isFinite(fill)) fill = 1;
    }
    out.push({ el, length: Math.ceil(length) + 1, fill });
  }
  return out;
}
function setHidden(s: Stroke) {
  s.el.style.strokeDasharray = `${s.length} ${s.length}`;
  s.el.style.strokeDashoffset = String(s.length);
  s.el.style.opacity = "0";
  if (s.fill !== null) s.el.style.fillOpacity = "0";
}
function clear(s: Stroke) {
  s.el.style.strokeDasharray = "";
  s.el.style.strokeDashoffset = "";
  s.el.style.opacity = "";
  s.el.style.fillOpacity = "";
}
const bezier = (e: EasingName) => `cubic-bezier(${easings[e].join(",")})`;
/**
 * Makes any inline SVG draw itself: strokes are measured once, then traced in order with a stagger
 * when the drawing scrolls into view (or as you scroll), and filled shapes fade in as their outline
 * closes. The server renders the finished drawing, and reduced motion keeps it that way.
 */
export const PathDraw = React.forwardRef<HTMLDivElement, PathDrawProps>(function PathDraw(
  {
    trigger = "inView",
    duration = 1.4,
    stagger = 0.12,
    delay = 0,
    ease = "inOut",
    fill = true,
    repeat = false,
    selector = DEFAULT_SELECTOR,
    scrollOffset = DEFAULT_OFFSET,
    container,
    onComplete,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const strokes = React.useRef<Stroke[]>([]);
  const [ready, setReady] = React.useState(0);
  const done = useLatestRef(onComplete);
  const scrolling = trigger === "scroll";
  const active = useInViewTrigger(rootRef, { trigger: trigger === "mount" ? "mount" : "inView", once: !repeat, margin: "0px 0px -10% 0px" });
  // Measure and hide before paint, so client mounts never flash the finished drawing.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const list = measure(root, selector, fill);
    list.forEach(setHidden);
    strokes.current = list;
    setReady((n) => n + 1);
    return () => {
      for (const s of list) {
        s.el.getAnimations?.().forEach((a) => a.cancel());
        clear(s);
      }
      strokes.current = [];
    };
  }, [reduced, selector, fill]);
  // Time-based drawing for "inView" and "mount".
  React.useEffect(() => {
    if (scrolling || reduced || ready === 0) return;
    const list = strokes.current;
    if (!active) {
      if (repeat) list.forEach((s) => (s.el.getAnimations?.().forEach((a) => a.cancel()), setHidden(s)));
      return;
    }
    if (list.length === 0) {
      done.current?.();
      return;
    }
    const ms = Math.max(0, duration) * 1000;
    const animations: Animation[] = [];
    list.forEach((s, i) => {
      const start = (delay + i * Math.max(0, stagger)) * 1000;
      if (typeof s.el.animate !== "function") {
        clear(s);
        return;
      }
      const draw = s.el.animate(
        [
          { strokeDashoffset: String(s.length), opacity: 0 },
          { opacity: 1, offset: 0.001 },
          { strokeDashoffset: "0", opacity: 1 },
        ],
        { duration: ms, delay: start, easing: bezier(ease), fill: "both" },
      );
      animations.push(draw);
      if (s.fill !== null) {
        animations.push(
          s.el.animate([{ fillOpacity: 0 }, { fillOpacity: s.fill }], { duration: ms * 0.5, delay: start + ms * 0.6, easing: bezier("out"), fill: "both" }),
        );
      }
    });
    let cancelled = false;
    Promise.all(animations.map((a) => a.finished)).then(
      () => {
        if (cancelled) return;
        // Settle into plain styles so later resizes or edits cannot reveal dash artifacts.
        for (const s of list) {
          s.el.getAnimations?.().forEach((a) => a.cancel());
          clear(s);
        }
        done.current?.();
      },
      () => {},
    );
    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
    };
  }, [active, ready, scrolling, reduced, duration, stagger, delay, ease, repeat, done]);
  // Scroll-linked drawing.
  const { scrollYProgress } = useScroll({ target: rootRef, container, offset: scrollOffset });
  const finished = React.useRef(false);
  const paint = React.useCallback(
    (p: number) => {
      const list = strokes.current;
      if (list.length === 0) return;
      const step = Math.max(0, stagger);
      const span = Math.max(0.0001, duration);
      const total = (list.length - 1) * step + span;
      const t = Math.min(Math.max(p, 0), 1) * total;
      list.forEach((s, i) => {
        const local = Math.min(Math.max((t - i * step) / span, 0), 1);
        s.el.style.strokeDashoffset = String(s.length * (1 - local));
        s.el.style.opacity = local > 0 ? "" : "0";
        if (s.fill !== null) s.el.style.fillOpacity = String(s.fill * Math.min(Math.max((local - 0.6) / 0.4, 0), 1));
      });
      if (p >= 1 && !finished.current) {
        finished.current = true;
        done.current?.();
      } else if (p < 1) finished.current = false;
    },
    [stagger, duration, done],
  );
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (scrolling && !reduced) paint(p);
  });
  React.useEffect(() => {
    if (scrolling && !reduced && ready > 0) paint(scrollYProgress.get());
  }, [scrolling, reduced, ready, paint, scrollYProgress]);
  return (
    <div
      ref={refs}
      data-trigger={trigger}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, className)}
    />
  );
});
