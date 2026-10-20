"use client";
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type RollingNumberDirection = "auto" | "up" | "down";

export interface RollingNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  /** Intl.NumberFormat options: currency, percent, compact, fraction digits, ... */
  format?: Intl.NumberFormatOptions;
  /** Fixed by default so server and client agree. Default "en-US". */
  locale?: string;
  /** Seconds each digit takes to settle. Default 0.6. */
  duration?: number;
  /** Seconds between neighbouring places, starting from the last digit. Default 0.03. */
  stagger?: number;
  /** Roll direction: follow the change ("auto"), or always roll up or down. Default "auto". */
  direction?: RollingNumberDirection;
  /** Spring bounce, 0 (none) to 1. Default 0.2. */
  bounce?: number;
  /** Announce value changes to screen readers (aria-live="polite"). Default false. */
  announce?: boolean;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const ASCII_ZERO = 48;

interface Glyph {
  key: string;
  char: string;
  digit: number | null;
  /** Digit place counted from the right end (0 = last digit), used for the stagger order. */
  place: number;
}

/**
 * Splits a formatted number into glyphs. Digits are keyed by their place from the right and
 * symbols by their own occurrence from the right, so "999" -> "1,000" keeps the units wheel and
 * "$9.99" -> "$10.00" keeps the "$" and "." in place; only new places enter.
 */
function toGlyphs(text: string): Glyph[] {
  const chars = Array.from(text);
  const glyphs: Glyph[] = [];
  const seen = new Map<string, number>();
  let place = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i] as string;
    const code = char.charCodeAt(0);
    const digit = code >= ASCII_ZERO && code <= ASCII_ZERO + 9 ? code - ASCII_ZERO : null;
    if (digit === null) {
      const n = seen.get(char) ?? 0;
      seen.set(char, n + 1);
      glyphs.push({ key: `s${char}${n}`, char, digit, place });
    } else {
      glyphs.push({ key: `d${place}`, char, digit, place });
      place++;
    }
  }
  return glyphs.reverse();
}

/** Cell offset in cells, wrapped to [-5, 5) so the wheel is continuous. */
function wrapOffset(cell: number, position: number): number {
  return ((((cell - position) % 10) + 15) % 10) - 5;
}

function DigitCell({ cell, position }: { cell: number; position: MotionValue<number> }) {
  const y = useTransform(position, (p) => `${wrapOffset(cell, p) * 100}%`);
  const opacity = useTransform(position, (p) => Math.max(0, 1 - Math.abs(wrapOffset(cell, p)) * 0.85));
  return (
    <motion.span
      className={cn(blockReset, "absolute inset-x-0 top-0 flex h-full items-center justify-center")}
      style={{ y, opacity }}
    >
      {cell}
    </motion.span>
  );
}

interface DigitColumnProps {
  digit: number;
  /** +1 rolls upward through 9 -> 0, -1 rolls downward through 0 -> 9, 0 takes the short way. */
  heading: number;
  delay: number;
  duration: number;
  bounce: number;
  reduced: boolean;
}

function DigitColumn({ digit, heading, delay, duration, bounce, reduced }: DigitColumnProps) {
  const position = useMotionValue(digit);
  // The unwrapped target; it keeps growing or shrinking so every roll travels the right way.
  const target = React.useRef(digit);
  React.useEffect(() => {
    const current = ((Math.round(target.current) % 10) + 10) % 10;
    if (current !== digit) {
      let delta: number;
      if (heading > 0) delta = (digit - current + 10) % 10;
      else if (heading < 0) delta = -((current - digit + 10) % 10);
      else {
        delta = digit - current;
        if (delta > 5) delta -= 10;
        if (delta < -5) delta += 10;
      }
      target.current += delta;
    }
    // Also resumes a roll that a cleanup stopped midway (StrictMode re-runs effects).
    if (position.get() === target.current) return;
    if (reduced) {
      position.set(target.current);
      return;
    }
    const controls = animate(position, target.current, { type: "spring", duration, bounce, delay });
    return () => controls.stop();
  }, [digit, heading, delay, duration, bounce, reduced, position]);
  return (
    // clip-path instead of overflow:hidden: an inline-block with overflow puts its baseline on the
    // bottom edge, which lifts the digits above the symbols ("53" over ".8K"). With clip-path the
    // baseline stays on the in-flow sizer digit, so wheels and symbols share one text baseline.
    <span className={cn(blockReset, "relative inline-block [clip-path:inset(0)]")}>
      {/* In-flow sizer: tabular figures make every digit the same width. */}
      <span className={cn(blockReset, "invisible")}>0</span>
      {DIGITS.map((cell) => (
        <DigitCell key={cell} cell={cell} position={position} />
      ))}
    </span>
  );
}

/**
 * Odometer number: every digit is a 0-9 wheel that rolls to its place, so changes look physical
 * (prices, counters, likes). Unlike NumberTicker it animates per place, not by tweening the value.
 */
export const RollingNumber = React.forwardRef<HTMLSpanElement, RollingNumberProps>(function RollingNumber(
  {
    value,
    format,
    locale = "en-US",
    duration = 0.6,
    stagger = 0.03,
    direction = "auto",
    bounce = 0.2,
    announce = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const formatter = React.useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  const safe = Number.isFinite(value) ? value : 0;
  const text = formatter.format(safe);
  const glyphs = toGlyphs(text);
  // Heading for this change, derived from the previous rendered value (render-phase state update).
  const [previous, setPrevious] = React.useState(safe);
  const [heading, setHeading] = React.useState(0);
  if (previous !== safe) {
    setPrevious(safe);
    setHeading(direction === "up" ? 1 : direction === "down" ? -1 : Math.sign(safe - previous));
  }
  return (
    <span
      ref={ref}
      {...props}
      className={cn(blockReset, "inline-flex items-baseline whitespace-nowrap tabular-nums", className)}
    >
      <span className={cn(blockReset, "sr-only")} aria-live={announce ? "polite" : undefined} aria-atomic="true">
        {text}
      </span>
      <span aria-hidden="true" className={cn(blockReset, "inline-flex items-baseline leading-[1.15]")}>
        <AnimatePresence initial={false} mode="popLayout">
          {glyphs.map((glyph) => (
            <motion.span
              key={glyph.key}
              layout={reduced ? false : "position"}
              initial={reduced ? false : { opacity: 0, y: "-40%", filter: "blur(4px)" }}
              animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: "40%", filter: "blur(4px)" }}
              transition={{ type: "spring", duration, bounce: 0 }}
              className={cn(blockReset, "inline-block")}
            >
              {glyph.digit === null ? (
                glyph.char
              ) : (
                <DigitColumn
                  digit={glyph.digit}
                  heading={heading}
                  delay={reduced ? 0 : glyph.place * stagger}
                  duration={duration}
                  bounce={bounce}
                  reduced={reduced}
                />
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
});
