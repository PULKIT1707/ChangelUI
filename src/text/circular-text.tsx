"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { toIdPart } from "../lib/ids";
import { blockReset } from "../lib/styles";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface CircularTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The ring text. It is spaced evenly around the full circle. */
  text: string;
  /** Optional center content (an icon, arrow or logo). */
  children?: React.ReactNode;
  /** Radius of the text baseline in px. Default 60. */
  radius?: number;
  /** Font size of the ring text in px. Default 13. */
  fontSize?: number;
  /** Seconds per full turn. 0 stops the spin. Default 20. */
  duration?: number;
  /** Speed multiplier while hovered or focused. 1 disables the speed-up. Default 4. */
  hoverSpeed?: number;
  /** Spin counter-clockwise. */
  reverse?: boolean;
  /** Appended after the text so the seam reads cleanly. Default " • ". */
  separator?: string;
  /** Repeats the text (with separators) this many times around the ring. Default 1. */
  repeat?: number;
}

const RAMP_MS = 400;

/**
 * Text set on a circle with SVG textPath (roadmap W6). It spins slowly and speeds up on hover by
 * ramping the Web Animation's playback rate, so it never jumps back to the start.
 */
export const CircularText = React.forwardRef<HTMLSpanElement, CircularTextProps>(function CircularText(
  {
    text,
    children,
    radius = 60,
    fontSize = 13,
    duration = 20,
    hoverSpeed = 4,
    reverse = false,
    separator = " \u2022 ",
    repeat = 1,
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
  const localRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const ringRef = React.useRef<SVGGElement>(null);
  const animRef = React.useRef<Animation | null>(null);
  const rampRef = React.useRef(0);
  const pathId = `pui-circle-${toIdPart(React.useId())}`;
  const reduced = usePrefersReducedMotion();
  const inView = useInViewTrigger(localRef, { trigger: "inView", once: false });
  const visible = useDocumentVisible();
  const spinning = !reduced && duration > 0;
  const running = spinning && inView && visible;
  const hoverSpeedRef = useLatestRef(hoverSpeed);

  React.useEffect(() => {
    const ring = ringRef.current;
    if (!spinning || !ring || typeof ring.animate !== "function") return;
    const anim = ring.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${reverse ? -360 : 360}deg)` }],
      { duration: duration * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" },
    );
    animRef.current = anim;
    return () => {
      cancelAnimationFrame(rampRef.current);
      anim.cancel();
      animRef.current = null;
    };
  }, [spinning, duration, reverse]);

  React.useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (running) anim.play();
    else anim.pause();
  }, [running, spinning, duration, reverse]);

  // Eases the playback rate toward `target` over RAMP_MS.
  const rampTo = (target: number) => {
    const anim = animRef.current;
    if (!anim) return;
    cancelAnimationFrame(rampRef.current);
    const from = anim.playbackRate;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - start) / RAMP_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      const rate = from + (target - from) * eased;
      if (typeof anim.updatePlaybackRate === "function") anim.updatePlaybackRate(rate);
      else anim.playbackRate = rate;
      if (t < 1) rampRef.current = requestAnimationFrame(frame);
    };
    rampRef.current = requestAnimationFrame(frame);
  };
  const speedUp = () => rampTo(Math.max(hoverSpeedRef.current, 0.01));
  const slowDown = () => rampTo(1);

  const size = Math.ceil((radius + fontSize * 1.2) * 2);
  const c = size / 2;
  const circumference = 2 * Math.PI * radius;
  const unit = `${text}${separator}`;
  const ring = Array.from({ length: Math.max(1, Math.round(repeat)) }, () => unit).join("");
  // Starts at the top (12 o'clock) and runs clockwise.
  const d = `M ${c} ${c - radius} a ${radius} ${radius} 0 1 1 0 ${radius * 2} a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`;

  return (
    <span
      ref={mergedRef}
      data-state={running ? "spinning" : "paused"}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, speedUp)}
      onPointerLeave={composeEventHandlers(onPointerLeave, slowDown)}
      onFocus={composeEventHandlers(onFocus, speedUp)}
      onBlur={composeEventHandlers(onBlur, slowDown)}
      style={{ width: size, height: size, ...style }}
      className={cn(blockReset, "relative inline-grid shrink-0 place-items-center", className)}
    >
      <svg
        role="img"
        aria-label={text}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(blockReset, "col-start-1 row-start-1 overflow-visible")}
      >
        <defs>
          <path id={pathId} d={d} fill="none" />
        </defs>
        <g ref={ringRef} style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}>
          <text fill="currentColor" fontSize={fontSize} aria-hidden="true">
            <textPath href={`#${pathId}`} textLength={circumference - fontSize * 0.25} lengthAdjust="spacing">
              {ring}
            </textPath>
          </text>
        </g>
      </svg>
      {children ? (
        <span className={cn(blockReset, "relative col-start-1 row-start-1 inline-flex items-center justify-center")}>
          {children}
        </span>
      ) : null}
    </span>
  );
});
