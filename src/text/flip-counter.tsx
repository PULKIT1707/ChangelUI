"use client";
import * as React from "react";
import { cssEasing } from "../hooks/motion-presets";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type FlipCounterCharset = "digits" | "alpha" | "alnum";

export interface FlipCounterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: string | number;
  /**
   * Characters each tile cycles through, in order. A preset name or your own string. Characters
   * outside it flip straight to their target. Default "digits".
   */
  charset?: FlipCounterCharset | (string & {});
  /** One flip, in ms. Multi-step flips run each step a little faster. Default 300. */
  flipMs?: number;
  /** Delay between neighbouring tiles starting, in ms. Default 40. */
  staggerMs?: number;
  /** Most intermediate flips on the way to a new character. Default 6. */
  maxSteps?: number;
  /** Pads with blank tiles on the left up to this many tiles. */
  minLength?: number;
  /** Characters rendered as plain separators instead of tiles. Default ":.,/-". */
  separators?: string;
  /** "solid" uses inverted tiles (a classic board), "surface" uses the card surface. Default "solid". */
  variant?: "solid" | "surface";
  /** Default "md". Font size of the root also scales the tiles (they are sized in em). */
  size?: Size;
  /** Announce value changes politely to screen readers. Default false. */
  announce?: boolean;
}

const charsets: Record<FlipCounterCharset, string> = {
  digits: " 0123456789",
  alpha: " ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  alnum: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};

const sizeClass: Record<Size, string> = { sm: "text-2xl", md: "text-5xl", lg: "text-7xl" };

/** Characters to show on the way from `from` to `to` (excluding `from`, ending at `to`). */
function flipPath(from: string, to: string, charset: string, maxSteps: number): string[] {
  if (from === to) return [];
  const a = charset.indexOf(from);
  const b = charset.indexOf(to);
  if (a < 0 || b < 0) return [to];
  const n = charset.length;
  const distance = (b - a + n) % n;
  const steps = Math.min(distance, Math.max(maxSteps, 1));
  const path: string[] = [];
  for (let s = 1; s <= steps; s++) {
    // Spread the steps evenly over the distance, so long jumps still pass through the charset.
    const offset = Math.round((s * distance) / steps);
    path.push(charset[(a + offset) % n] ?? to);
  }
  return path;
}

interface TileState {
  target: string;
  shown: string;
  queue: string[];
  /** Bumps on every flip so the leaves remount with fresh nodes. */
  step: number;
  /** The queue started from rest, so the first flip waits for the stagger delay. */
  fresh: boolean;
}

const display = (c: string) => (c === " " ? "\u00a0" : c);

interface TileProps {
  char: string;
  charset: string;
  maxSteps: number;
  flipMs: number;
  delayMs: number;
  reduced: boolean;
  variant: "solid" | "surface";
}

function FlipTile({ char, charset, maxSteps, flipMs, delayMs, reduced, variant }: TileProps) {
  const [state, setState] = React.useState<TileState>({ target: char, shown: char, queue: [], step: 0, fresh: false });
  let current = state;
  if (state.target !== char) {
    // Prev-prop-in-state: keep the flip in progress and route the rest of the way to the new char.
    const head = state.queue[0];
    const fromChar = head ?? state.shown;
    const rest = reduced ? [] : flipPath(fromChar, char, charset, maxSteps);
    const queue = reduced ? [] : head !== undefined ? [head, ...rest] : rest;
    current = {
      target: char,
      shown: reduced ? char : state.shown,
      queue,
      step: state.step,
      fresh: head === undefined,
    };
    setState(current);
  }
  const topLeaf = React.useRef<HTMLSpanElement>(null);
  const bottomLeaf = React.useRef<HTMLSpanElement>(null);
  const next = current.queue[0];
  const flipping = next !== undefined;
  const multi = current.queue.length > 1;
  const stepMs = multi ? Math.max(flipMs * 0.55, 60) : flipMs;
  const step = current.step;
  const fresh = current.fresh;

  React.useEffect(() => {
    if (!flipping) return;
    const done = () =>
      setState((s) =>
        s.step !== step
          ? s
          : { ...s, shown: s.queue[0] ?? s.shown, queue: s.queue.slice(1), step: s.step + 1, fresh: false },
      );
    const top = topLeaf.current;
    const bottom = bottomLeaf.current;
    if (!top || !bottom || typeof top.animate !== "function") {
      const id = window.setTimeout(done, 0);
      return () => clearTimeout(id);
    }
    const wait = fresh ? delayMs : 0;
    const half = stepMs / 2;
    // The top leaf falls and darkens as it turns away from the light; the bottom leaf lands.
    const a = top.animate(
      [
        { transform: "rotateX(0deg)", filter: "brightness(1)" },
        { transform: "rotateX(-90deg)", filter: "brightness(0.6)" },
      ],
      { duration: half, delay: wait, easing: "cubic-bezier(0.55, 0, 0.9, 0.4)", fill: "both" },
    );
    const b = bottom.animate(
      [
        { transform: "rotateX(90deg)", filter: "brightness(1.25)" },
        { transform: "rotateX(0deg)", filter: "brightness(1)" },
      ],
      { duration: half, delay: wait + half, easing: cssEasing("out"), fill: "both" },
    );
    b.onfinish = done;
    return () => {
      a.cancel();
      b.cancel();
    };
  }, [flipping, step, fresh, delayMs, stepMs]);

  const face = cn(
    blockReset,
    "absolute inset-x-0 overflow-hidden",
    variant === "solid" ? "bg-pui-foreground text-pui-background" : "bg-pui-surface text-pui-surface-foreground",
  );
  const topHalf = cn(face, "top-0 h-1/2 rounded-t-[0.12em]");
  const bottomHalf = cn(face, "bottom-0 h-1/2 rounded-b-[0.12em]");
  // Each half shows the full-height glyph, clipped to its own half. The glyph is set a little
  // smaller than the tile's em so even wide letters (M, W) keep inner padding on both sides.
  const glyph = (c: string, half: "top" | "bottom") => (
    <span
      className={cn(
        blockReset,
        "absolute inset-x-0 flex h-[200%] items-center justify-center text-[0.84em] leading-none",
        half === "top" ? "top-0" : "bottom-0",
      )}
    >
      {display(c)}
    </span>
  );
  const upper = flipping ? next : current.shown;

  return (
    <span
      data-flipping={flipping ? "" : undefined}
      className={cn(
        blockReset,
        "relative inline-block h-[1.36em] w-[0.96em] rounded-[0.12em] [perspective:4em]",
        variant === "solid"
          ? "shadow-pui-md"
          : "shadow-pui-sm ring-1 ring-pui-border",
      )}
    >
      {/* Static faces: the next char's top behind the falling leaf, the current char's bottom below. */}
      <span className={topHalf}>{glyph(upper, "top")}</span>
      <span className={bottomHalf}>{glyph(current.shown, "bottom")}</span>
      {flipping ? (
        <React.Fragment key={current.step}>
          <span ref={topLeaf} className={cn(topHalf, "z-[2] origin-bottom [backface-visibility:hidden]")}>
            {glyph(current.shown, "top")}
          </span>
          <span
            ref={bottomLeaf}
            style={{ transform: "rotateX(90deg)" }}
            className={cn(bottomHalf, "z-[2] origin-top [backface-visibility:hidden]")}
          >
            {glyph(next, "bottom")}
          </span>
        </React.Fragment>
      ) : null}
      {/* Hinge gap. */}
      <span
        className={cn(
          blockReset,
          "absolute inset-x-0 top-1/2 z-[3] h-[0.03em] -translate-y-1/2",
          variant === "solid" ? "bg-pui-background/60" : "bg-pui-border",
        )}
      />
    </span>
  );
}

/**
 * Split-flap display (roadmap W6): each character is a tile whose top half falls to reveal the
 * next character, cycling through the charset like an airport departures board.
 */
export const FlipCounter = React.forwardRef<HTMLSpanElement, FlipCounterProps>(function FlipCounter(
  {
    value,
    charset = "digits",
    flipMs = 300,
    staggerMs = 40,
    maxSteps = 6,
    minLength = 0,
    separators = ":.,/-",
    variant = "solid",
    size = "md",
    announce = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const set = charset in charsets ? charsets[charset as FlipCounterCharset] : charset;
  const upper = set === charsets.alpha || set === charsets.alnum;
  const raw = upper ? String(value).toUpperCase() : String(value);
  const chars = Array.from(raw);
  while (chars.length < minLength) chars.unshift(" ");
  const total = chars.length;

  return (
    <span
      ref={ref}
      data-variant={variant}
      {...props}
      className={cn(blockReset, "inline-flex items-center font-semibold tabular-nums", sizeClass[size], className)}
    >
      <span className={cn(blockReset, "sr-only")} aria-live={announce ? "polite" : undefined} aria-atomic="true">
        {raw}
      </span>
      <span aria-hidden="true" className={cn(blockReset, "inline-flex items-center gap-[0.08em]")}>
        {chars.map((c, i) => {
          // Keyed from the right so digits keep their tile when the value grows on the left.
          const key = total - i;
          if (separators.includes(c)) {
            return (
              <span key={`s${key}`} className={cn(blockReset, "inline-block px-[0.04em] leading-none text-current opacity-70")}>
                {c}
              </span>
            );
          }
          return (
            <FlipTile
              key={`t${key}`}
              char={c}
              charset={set}
              maxSteps={maxSteps}
              flipMs={flipMs}
              delayMs={i * staggerMs}
              reduced={reduced}
              variant={variant}
            />
          );
        })}
      </span>
    </span>
  );
});
