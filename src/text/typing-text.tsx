"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TypingCursor = "line" | "block" | "underscore" | "none";

export interface TypingTextProps extends TextBaseProps {
  /** One string, or several typed in turn (type -> pause -> delete -> next). */
  text: string | string[];
  /** Default 50. */
  typeSpeedMs?: number;
  /** Default 30. */
  deleteSpeedMs?: number;
  /** Pause on a fully typed item. Default 1500. */
  pauseMs?: number;
  /** Default: true when `text` is an array. */
  loop?: boolean;
  /** Default "line". */
  cursor?: TypingCursor;
  /** Blink the cursor (motion-safe). Default true. */
  blinkCursor?: boolean;
  /** Called when a non-looping sequence finishes. */
  onComplete?: () => void;
}

const cursorClasses: Record<Exclude<TypingCursor, "none">, string> = {
  line: "ml-0.5 h-[1.1em] w-[2px] translate-y-[0.15em] bg-current",
  block: "ml-0.5 h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-current/70",
  underscore: "ml-0.5 h-[2px] w-[0.6em] bg-current",
};

interface TypingState {
  key: string;
  index: number;
  count: number;
  deleting: boolean;
  started: boolean;
  done: boolean;
}

const initialState = (key: string): TypingState => ({
  key,
  index: 0,
  count: 0,
  deleting: false,
  started: false,
  done: false,
});

/** Typewriter text with a blinking cursor; cycles through several strings (design 7.2 #34). */
export const TypingText = React.forwardRef<HTMLElement, TypingTextProps>(function TypingText(
  {
    text,
    typeSpeedMs = 50,
    deleteSpeedMs = 30,
    pauseMs = 1500,
    loop,
    cursor = "line",
    blinkCursor = true,
    onComplete,
    as = "span",
    trigger = "inView",
    once = true,
    delay = 0,
    className,
    ...props
  },
  ref,
) {
  const items = Array.isArray(text) ? text : [text];
  const shouldLoop = loop ?? Array.isArray(text);
  // A string key, so an inline array literal does not reset the sequence on every parent render.
  const key = items.join("\u0000");
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const onCompleteRef = useLatestRef(onComplete);

  const [state, setState] = React.useState(() => initialState(key));
  // Reset when the text changes: store the previous key in state and compare during render (design 6).
  let current = state;
  if (state.key !== key) {
    current = initialState(key);
    setState(current);
  }

  const item = items[current.index] ?? "";

  React.useEffect(() => {
    if (!active || reduced || current.done) return;
    const isLast = current.index >= items.length - 1;
    let ms: number;
    let next: TypingState;
    if (!current.deleting) {
      if (current.count < item.length) {
        ms = current.started ? typeSpeedMs : delay * 1000 + typeSpeedMs;
        next = { ...current, count: current.count + 1, started: true };
      } else if (isLast && !shouldLoop) {
        const id = setTimeout(() => {
          setState({ ...current, done: true, started: true });
          onCompleteRef.current?.();
        }, 0);
        return () => clearTimeout(id);
      } else {
        ms = pauseMs;
        next = { ...current, deleting: true, started: true };
      }
    } else if (current.count > 0) {
      ms = deleteSpeedMs;
      next = { ...current, count: current.count - 1 };
    } else {
      ms = typeSpeedMs;
      next = { ...current, index: (current.index + 1) % items.length, deleting: false };
    }
    const id = setTimeout(() => setState(next), ms);
    return () => clearTimeout(id);
  }, [
    active,
    reduced,
    current,
    item,
    items.length,
    shouldLoop,
    typeSpeedMs,
    deleteSpeedMs,
    pauseMs,
    delay,
    onCompleteRef,
  ]);

  const shown = reduced ? item : item.slice(0, current.count);
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={mergedRef}
      data-state={current.done ? "complete" : "typing"}
      {...props}
      className={cn(blockReset, className)}
    >
      <span className={cn(blockReset, "sr-only")}>{item}</span>
      <span aria-hidden="true" className={cn(blockReset, "whitespace-pre-wrap")}>
        {shown}
        {cursor === "none" ? null : (
          <span
            data-pui-cursor=""
            className={cn(
              blockReset,
              "inline-block align-baseline",
              cursorClasses[cursor],
              blinkCursor && !reduced && "motion-safe:animate-pui-blink",
            )}
          />
        )}
      </span>
    </MotionTag>
  );
});
