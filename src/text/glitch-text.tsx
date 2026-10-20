"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { motionTagMap } from "../lib/motion-tags";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface GlitchTextProps extends MotionSafeHTMLProps<HTMLElement> {
  children: string;
  /**
   * "hover" glitches on pointer hover and keyboard focus inside, "loop" bursts every
   * `intervalMs` while in view. Default "hover".
   */
  trigger?: "hover" | "loop";
  /** Glitches continuously while true, whatever the trigger (error states, live demos). */
  active?: boolean;
  /** Scales the offsets and slice jumps, 0.25-3. Default 1. */
  intensity?: number;
  /** Time between loop bursts, in ms. Default 3000. */
  intervalMs?: number;
  /** Length of one burst, in ms. Default 320. */
  burstMs?: number;
  /** The two split channels. Default the chart red and cyan tokens. */
  colors?: [string, string];
  /** Rendered tag. Default "span". */
  as?: TextTag;
}

const STEP_MS = 60;

function slice(el: HTMLElement | null, amount: number, sign: number): void {
  if (!el) return;
  // A random horizontal band, shifted sideways: the classic torn-scanline look.
  const top = Math.random() * 85;
  const height = 6 + Math.random() * 30;
  const bottom = Math.max(0, 100 - top - height);
  const x = sign * (1 + Math.random() * 4) * amount;
  el.style.clipPath = `inset(${top.toFixed(1)}% 0 ${bottom.toFixed(1)}% 0)`;
  el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  el.style.opacity = "1";
}

function rest(el: HTMLElement | null): void {
  if (!el) return;
  el.style.clipPath = "";
  el.style.transform = "";
  el.style.opacity = "0";
}

/**
 * RGB-split glitch (roadmap W6): two colored copies tear into random horizontal slices and jitter
 * sideways in short 60ms steps, on hover, on a loop or while `active`.
 */
export const GlitchText = React.forwardRef<HTMLElement, GlitchTextProps>(function GlitchText(
  {
    children,
    trigger = "hover",
    active = false,
    intensity = 1,
    intervalMs = 3000,
    burstMs = 320,
    colors = ["var(--pui-chart-4)", "var(--pui-chart-2)"],
    as = "span",
    className,
    style,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const mainRef = React.useRef<HTMLSpanElement>(null);
  const redRef = React.useRef<HTMLSpanElement>(null);
  const cyanRef = React.useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInViewTrigger(localRef, { trigger: "inView", once: false });
  const visible = useDocumentVisible();
  const [hovered, setHovered] = React.useState(false);
  const amount = Math.min(Math.max(intensity, 0.25), 3);
  const amountRef = useLatestRef(amount);

  const continuous = !reduced && visible && (active || (trigger === "hover" && hovered));
  const looping = !reduced && visible && inView && trigger === "loop" && !active;

  // Runs `durationMs` of glitch steps (Infinity for continuous), then rests.
  const run = React.useCallback(
    (durationMs: number) => {
      const start = performance.now();
      let timer = 0;
      const step = () => {
        const a = amountRef.current;
        slice(redRef.current, a, -1);
        slice(cyanRef.current, a, 1);
        const main = mainRef.current;
        if (main) {
          const jitter = Math.random() < 0.35 ? (Math.random() - 0.5) * 3 * a : 0;
          main.style.transform = jitter ? `translate3d(${jitter.toFixed(2)}px, 0, 0)` : "";
        }
        if (performance.now() - start + STEP_MS < durationMs) timer = window.setTimeout(step, STEP_MS);
        else timer = window.setTimeout(stop, STEP_MS);
      };
      const stop = () => {
        rest(redRef.current);
        rest(cyanRef.current);
        if (mainRef.current) mainRef.current.style.transform = "";
      };
      step();
      return () => {
        clearTimeout(timer);
        stop();
      };
    },
    [amountRef],
  );

  React.useEffect(() => {
    if (!continuous) return;
    return run(Number.POSITIVE_INFINITY);
  }, [continuous, run]);

  React.useEffect(() => {
    if (!looping) return;
    let cancelBurst: (() => void) | undefined;
    const id = window.setInterval(() => {
      cancelBurst?.();
      cancelBurst = run(burstMs);
    }, Math.max(intervalMs, burstMs + 100));
    return () => {
      clearInterval(id);
      cancelBurst?.();
    };
  }, [looping, intervalMs, burstMs, run]);

  const copy = cn(
    blockReset,
    "pointer-events-none absolute inset-0 whitespace-pre opacity-0 select-none will-change-[clip-path,transform]",
  );

  const Tag = motionTagMap[as];
  return (
    <Tag
      ref={mergedRef}
      data-state={continuous ? "glitching" : looping ? "looping" : "idle"}
      data-trigger={trigger}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, () => setHovered(true))}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => setHovered(false))}
      onFocus={composeEventHandlers(onFocus, () => setHovered(true))}
      onBlur={composeEventHandlers(onBlur, () => setHovered(false))}
      style={
        {
          "--pui-glitch-a": colors[0],
          "--pui-glitch-b": colors[1],
          ...style,
        } as React.CSSProperties
      }
      className={cn(blockReset, "relative inline-block isolate", className)}
    >
      <span ref={mainRef} className={cn(blockReset, "relative z-[1] inline-block whitespace-pre")}>
        {children}
      </span>
      {reduced ? null : (
        <>
          <span ref={redRef} aria-hidden="true" className={cn(copy, "text-(color:--pui-glitch-a)")}>
            {children}
          </span>
          <span ref={cyanRef} aria-hidden="true" className={cn(copy, "z-[2] text-(color:--pui-glitch-b)")}>
            {children}
          </span>
        </>
      )}
    </Tag>
  );
});
