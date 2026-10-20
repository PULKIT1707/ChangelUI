"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps, Trigger } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScrambleTextProps extends Omit<TextBaseProps, "trigger"> {
  text: string;
  /** Random glyph pool. */
  characters?: string;
  /** Total seconds. Default 0.8. */
  duration?: number;
  /** Time per scramble frame. Default 40. */
  speedMs?: number;
  /** "hover" re-scrambles on pointerenter or focus within. Default "inView". */
  trigger?: Trigger | "hover";
  onComplete?: () => void;
}

const DEFAULT_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

/** Resolves text left to right out of random glyphs (design 7.2 #40). Server output equals `text`. */
export const ScrambleText = React.forwardRef<HTMLElement, ScrambleTextProps>(function ScrambleText(
  {
    text,
    characters = DEFAULT_CHARACTERS,
    duration = 0.8,
    speedMs = 40,
    trigger = "inView",
    once = true,
    delay = 0,
    onComplete,
    as = "span",
    onPointerEnter,
    onFocus,
    className,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const active = useInViewTrigger(rootRef, { trigger: trigger === "hover" ? "mount" : trigger, once });
  const reduced = usePrefersReducedMotion();
  const onCompleteRef = useLatestRef(onComplete);
  const [run, setRun] = React.useState(0);
  const shouldRun = trigger === "hover" ? run > 0 : active;

  React.useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Any earlier run that was cancelled mid-scramble ends on the real text.
    el.textContent = text;
    if (!shouldRun || reduced) return;
    const pool = characters.length > 0 ? characters : DEFAULT_CHARACTERS;
    const total = Math.max(duration * 1000, 1);
    let raf = 0;
    let start = -1;
    let last = -Infinity;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const elapsed = now - start;
      if (elapsed >= total) {
        el.textContent = text;
        onCompleteRef.current?.();
        return;
      }
      if (now - last >= speedMs) {
        last = now;
        const resolved = Math.floor((elapsed / total) * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i] as string;
          out += i < resolved || /\s/.test(ch) ? ch : pool[Math.floor(Math.random() * pool.length)];
        }
        el.textContent = out;
      }
      raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [shouldRun, run, reduced, text, characters, duration, speedMs, delay, onCompleteRef]);

  const rescramble = trigger === "hover" ? () => setRun((n) => n + 1) : undefined;
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={mergedRef}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, rescramble)}
      onFocus={composeEventHandlers(onFocus, rescramble)}
      className={cn(blockReset, className)}
    >
      <span className={cn(blockReset, "sr-only")}>{text}</span>
      <span ref={textRef} aria-hidden="true" className={cn(blockReset, "whitespace-pre-wrap")}>
        {text}
      </span>
    </MotionTag>
  );
});
