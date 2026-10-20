"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { motionTagMap } from "../lib/motion-tags";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { splitGraphemes, splitWords } from "../lib/split";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { playKeyframes } from "../lib/waapi";

export interface WavyTextProps extends MotionSafeHTMLProps<HTMLElement> {
  children: string;
  /** Peak offset of each letter in px. Default 6. */
  amplitude?: number;
  /** Waves per 1.6s. Default 1. */
  speed?: number;
  /** Phase step between neighbouring letters, in radians. Default 0.4. */
  phase?: number;
  /**
   * "loop" ripples continuously while in view, "hover" sends one ripple across the letters on
   * pointer enter and keyboard focus. Default "loop".
   */
  trigger?: "loop" | "hover";
  /** Rendered tag. Default "span". */
  as?: TextTag;
}

const BASE_PERIOD = 1.6;

/**
 * Letters riding a sine wave (roadmap W6). The loop is pure CSS keyframes with a phase-shifted
 * negative delay per letter, so it costs no JavaScript per frame; hover plays a one-off ripple.
 */
export const WavyText = React.forwardRef<HTMLElement, WavyTextProps>(function WavyText(
  {
    children,
    amplitude = 6,
    speed = 1,
    phase = 0.4,
    trigger = "loop",
    as = "span",
    className,
    style,
    onPointerEnter,
    onFocus,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const inView = useInViewTrigger(localRef, { trigger: "inView", once: false });
  const period = BASE_PERIOD / Math.max(speed, 0.05);
  const step = (phase / (2 * Math.PI)) * period;
  const loop = trigger === "loop" && !reduced;

  const ripple = () => {
    if (reduced || trigger !== "hover") return;
    const letters = localRef.current?.querySelectorAll<HTMLElement>("[data-wavy-char]") ?? [];
    letters.forEach((el, i) => {
      playKeyframes(
        el,
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${-amplitude * 1.4}px)`, offset: 0.35 },
          { transform: `translateY(${amplitude * 0.35}px)`, offset: 0.7 },
          { transform: "translateY(0)" },
        ],
        { duration: 520 / Math.max(speed, 0.05), delay: i * 28, easing: "ease-in-out" },
      );
    });
  };

  let index = 0;
  const content = splitWords(children).map((token, w) => {
    if (token.space) return token.text;
    return (
      <span key={w} className={cn(blockReset, "inline-block whitespace-nowrap")}>
        {splitGraphemes(token.text).map((char, c) => {
          const i = index++;
          // A negative delay starts each letter part-way through the cycle, so the wave is
          // already formed on the first frame instead of letters waking up one by one.
          const offset = ((i * step) % period) - period;
          return (
            <span
              key={c}
              data-wavy-char=""
              style={loop ? { animationDelay: `${offset.toFixed(3)}s` } : undefined}
              className={cn(blockReset, "inline-block will-change-transform", loop && "animate-pui-wave")}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  });

  const Tag = motionTagMap[as];
  return (
    <Tag
      ref={mergedRef}
      data-trigger={trigger}
      data-state={loop && inView ? "running" : "paused"}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, ripple)}
      onFocus={composeEventHandlers(onFocus, ripple)}
      style={
        {
          "--pui-wave-amp": `${amplitude}px`,
          "--pui-wave-duration": `${period.toFixed(3)}s`,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        blockReset,
        "inline-block",
        // Paused off-screen: the keyframes keep their phase and resume in place.
        loop && "[&[data-state=paused]_[data-wavy-char]]:[animation-play-state:paused]",
        className,
      )}
    >
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <span aria-hidden="true" className={cn(blockReset, "whitespace-pre-wrap")}>
        {content}
      </span>
    </Tag>
  );
});
