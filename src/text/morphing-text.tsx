"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { motionTagMap } from "../lib/motion-tags";
import { mergeRefs } from "../lib/compose";
import { toIdPart } from "../lib/ids";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface MorphingTextProps extends MotionSafeHTMLProps<HTMLElement> {
  words: string[];
  /** Time each word rests before morphing, in ms. Default 2500. */
  intervalMs?: number;
  /** Length of one morph, in ms. Default 1000. */
  morphMs?: number;
  /** Stops on the current word (WCAG 2.2.2 pause control). */
  paused?: boolean;
  /**
   * Edge hardness of the liquid threshold, 1-10. Higher is crisper and more blobby, lower is
   * softer. Default 6.
   */
  threshold?: number;
  /** Horizontal alignment inside the reserved width of the longest word. Default "center". */
  align?: "start" | "center" | "end";
  /** Rendered tag. Default "span". */
  as?: TextTag;
  /** Start delay in seconds before the first morph. Default 0. */
  delay?: number;
  onIndexChange?: (index: number) => void;
}

/** inOut cubic, matching easings.inOut closely enough for a per-frame progress curve. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Blur grows without bound as a layer's weight falls to 0, so the threshold filter melts it into
 * the other word instead of fading it. Opacity follows a softened curve so the overlap stays dense.
 */
function layerStyle(el: HTMLElement | null, weight: number): void {
  if (!el) return;
  const w = Math.min(Math.max(weight, 0), 1);
  const blur = w <= 0 ? 100 : Math.min(8 / w - 8, 100);
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
  el.style.opacity = `${(w ** 0.4 * 100).toFixed(1)}%`;
}

const alignClass = { start: "justify-items-start text-start", center: "justify-items-center text-center", end: "justify-items-end text-end" };

/**
 * Words that melt into each other (roadmap W6): two layers cross-blur through an SVG alpha
 * threshold, so the shapes merge like liquid instead of crossfading.
 */
export const MorphingText = React.forwardRef<HTMLElement, MorphingTextProps>(function MorphingText(
  {
    words,
    intervalMs = 2500,
    morphMs = 1000,
    paused = false,
    threshold = 6,
    align = "center",
    as = "span",
    delay = 0,
    onIndexChange,
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const currentRef = React.useRef<HTMLSpanElement>(null);
  const nextRef = React.useRef<HTMLSpanElement>(null);
  const filterId = `pui-morph-${toIdPart(React.useId())}`;
  const inView = useInViewTrigger(localRef, { trigger: "inView", once: false });
  const visible = useDocumentVisible();
  const reduced = usePrefersReducedMotion();
  const onIndexChangeRef = useLatestRef(onIndexChange);

  const key = words.join("\u0000");
  const [state, setState] = React.useState({ key, index: 0 });
  let index = state.index;
  if (state.key !== key) {
    index = 0;
    setState({ key, index: 0 });
  }
  const count = words.length;
  const running = !paused && inView && visible && count > 1;
  const nextIndex = (index + 1) % Math.max(count, 1);
  const firstRef = React.useRef(true);

  React.useEffect(() => {
    if (!running) return;
    const wait = intervalMs + (firstRef.current ? delay * 1000 : 0);
    firstRef.current = false;
    let raf = 0;
    const advance = () => {
      setState({ key, index: nextIndex });
      onIndexChangeRef.current?.(nextIndex);
    };
    const timer = window.setTimeout(() => {
      if (reduced) {
        advance();
        return;
      }
      const start = performance.now();
      const frame = (now: number) => {
        const t = Math.min((now - start) / morphMs, 1);
        const p = easeInOut(t);
        layerStyle(nextRef.current, p);
        layerStyle(currentRef.current, 1 - p);
        if (t < 1) raf = requestAnimationFrame(frame);
        else advance();
      };
      raf = requestAnimationFrame(frame);
    }, wait);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      // An interrupted morph snaps back to the resting word.
      layerStyle(currentRef.current, 1);
      layerStyle(nextRef.current, 0);
    };
  }, [running, index, nextIndex, intervalMs, morphMs, delay, reduced, key, onIndexChangeRef]);

  if (count === 0) return null;
  const word = words[index] ?? "";
  const hard = Math.min(Math.max(threshold, 1), 10);
  // Alpha' = alpha * slope - offset: a steep ramp around alpha 0.4 that keeps a hint of antialiasing.
  const slope = 4 + hard * 6;
  const matrix = `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${slope} ${(-slope * 0.42).toFixed(2)}`;
  const layer = cn(blockReset, "col-start-1 row-start-1 whitespace-nowrap will-change-[filter,opacity]");

  const Tag = motionTagMap[as];
  return (
    <Tag
      ref={mergedRef}
      data-state={running ? "running" : "paused"}
      {...props}
      className={cn(blockReset, "relative inline-flex", className)}
    >
      <span className={cn(blockReset, "sr-only")}>{word}</span>
      <svg aria-hidden="true" focusable="false" className={cn(blockReset, "absolute h-0 w-0")}>
        <defs>
          <filter id={filterId}>
            <feColorMatrix in="SourceGraphic" type="matrix" values={matrix} />
          </filter>
        </defs>
      </svg>
      <span
        aria-hidden="true"
        style={reduced ? undefined : { filter: `url(#${filterId})` }}
        className={cn(blockReset, "relative inline-grid", alignClass[align])}
      >
        {words.map((w, i) => (
          <span key={`${i}:${w}`} className={cn(blockReset, "invisible col-start-1 row-start-1 whitespace-nowrap")}>
            {w}
          </span>
        ))}
        {/* Keyed by index, so each cycle gets fresh nodes with clean inline styles. */}
        <span key={`a${index}`} ref={currentRef} className={layer}>
          {word}
        </span>
        {count > 1 ? (
          <span key={`b${index}`} ref={nextRef} style={{ opacity: 0 }} className={layer}>
            {words[nextIndex]}
          </span>
        ) : null}
      </span>
    </Tag>
  );
});
