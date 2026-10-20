"use client";

import { AnimatePresence, motion, type TargetAndTransition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type WordRotateVariant = "slide" | "flip" | "blur";

export interface WordRotateProps extends Omit<TextBaseProps, "trigger" | "once"> {
  words: string[];
  /** Time each word stays. Default 2500. */
  intervalMs?: number;
  /** Default "slide". */
  variant?: WordRotateVariant;
  /** Seconds per transition. Default 0.4. */
  duration?: number;
  /** Stops the rotation (WCAG 2.2.2 pause control). */
  paused?: boolean;
  /**
   * "widest" (default) reserves the width of the longest word, so surrounding text never
   * reflows or changes line count as words change. "auto" animates the width to each word.
   */
  sizing?: "widest" | "auto";
  onIndexChange?: (index: number) => void;
}

const wordMotion: Record<
  WordRotateVariant,
  { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }
> = {
  slide: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: "0%", opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  flip: {
    initial: { rotateX: 90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 },
  },
  blur: {
    initial: { filter: "blur(8px)", opacity: 0 },
    animate: { filter: "blur(0px)", opacity: 1 },
    exit: { filter: "blur(8px)", opacity: 0 },
  },
};

/** Rotates through words with a slide, flip or blur transition (design 7.2 #37). */
export const WordRotate = React.forwardRef<HTMLElement, WordRotateProps>(function WordRotate(
  {
    words,
    intervalMs = 2500,
    variant = "slide",
    duration = 0.4,
    paused = false,
    sizing = "widest",
    onIndexChange,
    as = "span",
    delay = 0,
    className,
    style,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const inView = useInViewTrigger(localRef, { trigger: "inView", once: false });
  const visible = useDocumentVisible();
  const reduced = usePrefersReducedMotion();
  const onIndexChangeRef = useLatestRef(onIndexChange);

  const key = words.join("\u0000");
  const [state, setState] = React.useState({ key, index: 0 });
  // Reset when the words change (prev-prop-in-state, design 6).
  let index = state.index;
  if (state.key !== key) {
    index = 0;
    setState({ key, index: 0 });
  }
  const indexRef = useLatestRef(index);
  const count = words.length;
  const running = !paused && inView && visible && count > 1;

  React.useEffect(() => {
    if (!running) return;
    let interval = 0;
    const tick = () => {
      const next = (indexRef.current + 1) % count;
      setState({ key, index: next });
      onIndexChangeRef.current?.(next);
    };
    const start = setTimeout(() => {
      tick();
      interval = window.setInterval(tick, intervalMs);
    }, intervalMs + delay * 1000);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [running, count, intervalMs, delay, key, indexRef, onIndexChangeRef]);

  if (count === 0) return null;
  const word = words[index] ?? "";
  const m = wordMotion[variant];
  const transition = reduced ? { duration: 0 } : { duration, ease: easings.out };
  const MotionTag = motionTagMap[as];
  const widest = sizing === "widest";

  const animated = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={`${index}:${word}`}
        initial={m.initial}
        animate={m.animate}
        exit={m.exit}
        transition={transition}
        className={cn(blockReset, "inline-block whitespace-nowrap")}
      >
        {word}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <MotionTag
      ref={mergedRef}
      data-variant={variant}
      data-sizing={sizing}
      data-state={running ? "running" : "paused"}
      {...props}
      style={{ perspective: variant === "flip" ? "600px" : undefined, ...style }}
      className={cn(blockReset, "relative inline-flex", className)}
    >
      <span className={cn(blockReset, "sr-only")}>{word}</span>
      {widest ? (
        // Every word sits invisibly in the same grid cell, so the box is always as wide as the
        // longest word and the line never reflows. The visible word animates on top of them.
        <span aria-hidden="true" className={cn(blockReset, "relative inline-grid")}>
          {words.map((w, i) => (
            <span
              key={`${i}:${w}`}
              className={cn(blockReset, "invisible col-start-1 row-start-1 whitespace-nowrap")}
            >
              {w}
            </span>
          ))}
          <span
            className={cn(
              blockReset,
              "relative col-start-1 row-start-1 inline-flex",
              variant === "slide" && "overflow-hidden",
            )}
          >
            {animated}
          </span>
        </span>
      ) : (
        <motion.span
          aria-hidden="true"
          layout={!reduced}
          transition={transition}
          className={cn(blockReset, "relative inline-flex", variant === "slide" && "overflow-hidden")}
        >
          {animated}
        </motion.span>
      )}
    </MotionTag>
  );
});
