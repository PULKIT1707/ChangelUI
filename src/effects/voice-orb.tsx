"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceOrbProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** What the assistant is doing. Default "idle". */
  state?: VoiceOrbState;
  /**
   * Live input or output level, 0 to 1 (for example the RMS of a Web Audio AnalyserNode). Without it,
   * "listening" and "speaking" use a gentle built-in rhythm.
   */
  level?: number;
  /** Diameter in px. Default 160. */
  size?: number;
  /** Screen-reader text per state. Defaults: "Ready", "Listening", "Thinking", "Speaking". */
  labels?: Partial<Record<VoiceOrbState, string>>;
}

const DEFAULT_LABELS: Record<VoiceOrbState, string> = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };
const POINTS = 10;
const VIEW = 200;
const R = 62;

/** Per-state amplitude, wobble speed and spin speed. */
const MOODS: Record<VoiceOrbState, { amp: number; speed: number; spin: number; scale: number }> = {
  idle: { amp: 0.035, speed: 0.6, spin: 0.05, scale: 0.92 },
  listening: { amp: 0.06, speed: 1.4, spin: 0.12, scale: 1 },
  thinking: { amp: 0.08, speed: 2.2, spin: 0.9, scale: 0.86 },
  speaking: { amp: 0.09, speed: 1.8, spin: 0.2, scale: 1 },
};

/** Closed Catmull-Rom spline through the points, as cubic Beziers. */
function blobPath(radii: readonly number[]): string {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [VIEW / 2 + Math.cos(a) * r, VIEW / 2 + Math.sin(a) * r] as const;
  });
  const at = (i: number) => pts[(i + n) % n] ?? pts[0]!;
  let d = `M${at(0)[0].toFixed(2)} ${at(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${(x1 + (x2 - x0) / 6).toFixed(2)} ${(y1 + (y2 - y0) / 6).toFixed(2)} ${(x2 - (x3 - x1) / 6).toFixed(2)} ${(y2 - (y3 - y1) / 6).toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return `${d}Z`;
}

function radiiAt(time: number, amp: number, energy: number): number[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const wave = Math.sin(time * 1.3 + i * 1.9) * 0.6 + Math.sin(time * 2.1 - i * 2.7) * 0.4;
    return R * (1 + wave * (amp + energy * 0.12));
  });
}

const STATIC_PATH = blobPath(radiiAt(0, 0, 0));

/**
 * A living orb for voice and AI assistants. It breathes when idle, swells with the live audio level
 * while listening, spins its colors while thinking and pulses while speaking, so people can tell at
 * a glance whether they are being heard. The state is announced politely to screen readers.
 */
export const VoiceOrb = React.forwardRef<HTMLDivElement, VoiceOrbProps>(function VoiceOrb(
  { state = "idle", level, size = 160, labels, className, style, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();
  const id = React.useId().replace(/:/g, "");
  const blobRef = React.useRef<SVGPathElement>(null);
  const glowRef = React.useRef<SVGPathElement>(null);
  const spinRef = React.useRef<SVGGElement>(null);
  const ringRef = React.useRef<SVGCircleElement>(null);
  const live = useLatestRef({ state, level });
  const text = { ...DEFAULT_LABELS, ...labels }[state];
  const animate = !reduced && visible;

  React.useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let angle = 0;
    let energy = 0;
    let scale = MOODS[live.current.state].scale;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const { state: s, level: lv } = live.current;
      const mood = MOODS[s];
      time += dt * mood.speed;
      angle = (angle + dt * mood.spin * 60) % 360;
      const synthetic = s === "speaking" ? 0.35 + 0.35 * Math.abs(Math.sin(now / 180) * Math.sin(now / 410)) : s === "listening" ? 0.15 + 0.1 * Math.sin(now / 300) : 0;
      const target = s === "listening" || s === "speaking" ? Math.min(Math.max(lv ?? synthetic, 0), 1) : 0;
      // Fast attack, slow release, like a VU meter.
      energy += (target - energy) * Math.min(1, dt * (target > energy ? 18 : 5));
      scale += (mood.scale + energy * 0.1 - scale) * Math.min(1, dt * 6);
      const d = blobPath(radiiAt(time, mood.amp, energy));
      const transform = `translate(100 100) scale(${scale.toFixed(4)}) translate(-100 -100)`;
      blobRef.current?.setAttribute("d", d);
      blobRef.current?.setAttribute("transform", transform);
      glowRef.current?.setAttribute("d", d);
      glowRef.current?.setAttribute("transform", transform);
      spinRef.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 100)`);
      if (ringRef.current) {
        ringRef.current.setAttribute("r", (R * scale * (1.08 + energy * 0.28)).toFixed(2));
        ringRef.current.style.opacity = String(s === "listening" ? 0.25 + energy * 0.6 : s === "speaking" ? energy * 0.4 : 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, live]);

  const staticScale = MOODS[state].scale;
  const staticTransform = `translate(100 100) scale(${staticScale}) translate(-100 -100)`;

  return (
    <div
      ref={ref}
      role="status"
      data-state={state}
      data-motion={animate ? "animated" : "static"}
      {...props}
      className={cn(blockReset, "relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, ...style }}
    >
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true" className={cn(blockReset, "absolute inset-0 size-full overflow-visible")}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--color-pui-gradient-1)" }} />
            <stop offset="55%" style={{ stopColor: "var(--color-pui-gradient-2)" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-pui-gradient-3)" }} />
          </linearGradient>
          <radialGradient id={`${id}-shine`} cx="0.35" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="white" stopOpacity={0.55} />
            <stop offset="45%" stopColor="white" stopOpacity={0.08} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <path ref={blobRef} d={STATIC_PATH} transform={staticTransform} />
          </clipPath>
          <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <circle
          ref={ringRef}
          cx="100"
          cy="100"
          r={(R * staticScale * 1.12).toFixed(2)}
          fill="none"
          strokeWidth="2"
          className="stroke-pui-primary transition-opacity duration-300"
          style={{ opacity: !animate && state === "listening" ? 0.45 : 0 }}
        />
        <path ref={glowRef} d={STATIC_PATH} transform={staticTransform} fill={`url(#${id}-fill)`} filter={`url(#${id}-blur)`} opacity={0.55} />
        <g clipPath={`url(#${id}-clip)`}>
          <g ref={spinRef}>
            <rect x="0" y="0" width={VIEW} height={VIEW} fill={`url(#${id}-fill)`} />
            <circle cx="60" cy="150" r="56" style={{ fill: "var(--color-pui-gradient-3)" }} opacity={0.7} filter={`url(#${id}-blur)`} />
            <circle cx="150" cy="55" r="48" style={{ fill: "var(--color-pui-gradient-1)" }} opacity={0.8} filter={`url(#${id}-blur)`} />
          </g>
          <rect x="0" y="0" width={VIEW} height={VIEW} fill={`url(#${id}-shine)`} />
        </g>
      </svg>
      <span className={cn(blockReset, "sr-only")}>{text}</span>
    </div>
  );
});
