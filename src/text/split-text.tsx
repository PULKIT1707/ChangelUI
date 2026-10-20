"use client";
import { motion, type TargetAndTransition, type Transition, type Variants } from "motion/react";
import * as React from "react";
import { staggerDelay } from "../hooks/motion-presets";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings, springs } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { splitGraphemes, splitWords } from "../lib/split";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SplitTextBy = "char" | "word" | "line";
export type SplitTextPreset = "maskUp" | "fadeUp" | "blurIn" | "rotateIn" | "popIn" | "slideLeft";
export type SplitTextFrom = "first" | "last" | "center" | "edges";

export interface SplitTextProps extends TextBaseProps {
  children: string;
  /** Unit that animates. "line" measures the wrapped lines after mount. Default "word". */
  by?: SplitTextBy;
  /** Entrance style. Default "maskUp". */
  preset?: SplitTextPreset;
  /** Seconds between units. Default 0.04 (0.02 for "char"). */
  stagger?: number;
  /** Seconds per unit. Defaults to the preset's own timing; popIn uses a spring when unset. */
  duration?: number;
  /** Which units start first. Default "first". */
  from?: SplitTextFrom;
  /** Called once every unit has finished its entrance. */
  onComplete?: () => void;
}

interface PresetSpec {
  hidden: TargetAndTransition;
  visible: TargetAndTransition;
  duration: number;
  ease: Transition["ease"];
  /** Wrap each unit in an overflow clip so it rises from behind a mask. */
  mask?: boolean;
  /** Rotates around the unit's baseline. */
  perspective?: boolean;
  spring?: Transition;
}

const presets: Record<SplitTextPreset, PresetSpec> = {
  maskUp: { hidden: { y: "110%" }, visible: { y: "0%" }, duration: 0.7, ease: easings.outExpo, mask: true },
  fadeUp: { hidden: { opacity: 0, y: "0.45em" }, visible: { opacity: 1, y: "0em" }, duration: 0.5, ease: easings.out },
  blurIn: {
    hidden: { opacity: 0, y: 8, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
    duration: 0.6,
    ease: easings.out,
  },
  rotateIn: {
    hidden: { opacity: 0, rotateX: -80, y: "0.3em", transformPerspective: 800 },
    visible: { opacity: 1, rotateX: 0, y: "0em", transformPerspective: 800 },
    duration: 0.65,
    ease: easings.outExpo,
    perspective: true,
  },
  popIn: {
    hidden: { opacity: 0, scale: 0.4 },
    visible: { opacity: 1, scale: 1 },
    duration: 0.45,
    ease: easings.spring,
    spring: springs.bouncy,
  },
  slideLeft: {
    hidden: { opacity: 0, x: "0.6em" },
    visible: { opacity: 1, x: "0em" },
    duration: 0.55,
    ease: easings.outExpo,
  },
};

interface Unit {
  key: string;
  text: string;
}

/** One rendered piece: a run of whitespace, or a word made of one or more animated units. */
interface Piece {
  key: string;
  space?: string;
  units: Unit[];
}

function buildPieces(text: string, by: "char" | "word"): Piece[] {
  return splitWords(text).map((token, i) => {
    if (token.space) return { key: `s${i}`, space: token.text, units: [] };
    if (by === "word") return { key: `w${i}`, units: [{ key: `w${i}`, text: token.text }] };
    return {
      key: `w${i}`,
      units: splitGraphemes(token.text).map((char, j) => ({ key: `w${i}c${j}`, text: char })),
    };
  });
}

/** Groups the word pieces into lines from their measured offsetTop. */
function measureLines(root: HTMLElement): number[] | null {
  const words = root.querySelectorAll<HTMLElement>("[data-split-word]");
  if (words.length === 0) return null;
  const lines: number[] = [];
  let line = -1;
  let top = Number.NEGATIVE_INFINITY;
  for (const word of words) {
    // A new line starts when a word sits clearly below the previous one.
    if (word.offsetTop > top + word.offsetHeight / 2) {
      line += 1;
      top = word.offsetTop;
    }
    lines.push(line);
  }
  return lines;
}

function sameLines(a: number[] | null, b: number[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Kinetic headline primitive (roadmap W6): splits text by character, word or wrapped line and
 * staggers a preset entrance (mask-up, fade-up, blur-in, rotate-in, pop-in, slide-left) across
 * the units, from either end, the center or the edges.
 */
export const SplitText = React.forwardRef<HTMLElement, SplitTextProps>(function SplitText(
  {
    children,
    by = "word",
    preset = "maskUp",
    stagger,
    duration,
    from = "first",
    onComplete,
    as = "p",
    trigger = "inView",
    once = true,
    delay = 0,
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const layerRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const onCompleteRef = useLatestRef(onComplete);
  const spec = presets[preset];

  const pieces = React.useMemo(() => buildPieces(children, by === "char" ? "char" : "word"), [children, by]);
  const wordCount = pieces.filter((p) => !p.space).length;

  // Line mode: a ResizeObserver measures which line each word wrapped onto. The callback (not the
  // effect body) sets state, and the groups re-measure whenever the width changes.
  const [lines, setLines] = React.useState<number[] | null>(null);
  React.useEffect(() => {
    const layer = layerRef.current;
    const root = localRef.current;
    if (by !== "line" || !layer || !root) return;
    const update = () => {
      const next = measureLines(layer);
      setLines((prev) => (sameLines(prev, next) ? prev : next));
    };
    if (typeof ResizeObserver === "undefined") {
      const id = requestAnimationFrame(update);
      return () => cancelAnimationFrame(id);
    }
    // The layer is inline (ResizeObserver ignores inline boxes), so watch the root and its parent.
    const ro = new ResizeObserver(update);
    ro.observe(root);
    if (root.parentElement) ro.observe(root.parentElement);
    return () => ro.disconnect();
  }, [by, children]);
  const lineReady = by !== "line" || (lines !== null && lines.length === wordCount);

  // Once played, later re-groupings (resizes in line mode) render settled instead of replaying.
  const [played, setPlayed] = React.useState(false);
  const shown = active && lineReady;

  const total =
    by === "line"
      ? (lines?.[lines.length - 1] ?? 0) + 1
      : by === "word"
        ? wordCount
        : pieces.reduce((n, p) => n + p.units.length, 0);
  const each = stagger ?? (by === "char" ? 0.02 : by === "line" ? 0.1 : 0.04);

  const unitVariants: Variants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : {
        hidden: spec.hidden,
        visible: (i: number) => ({
          ...spec.visible,
          transition: {
            ...(spec.spring && duration === undefined
              ? spec.spring
              : { duration: duration ?? spec.duration, ease: spec.ease }),
            delay: delay + staggerDelay(i, total, { each, from }),
          },
        }),
      };

  const masked = spec.mask && !reduced;
  const unitClass = cn(blockReset, "inline-block", spec.perspective && "origin-bottom");
  const renderUnit = (unit: Unit, order: number) => {
    const node = (
      <motion.span key={unit.key} custom={order} variants={unitVariants} className={unitClass}>
        {unit.text}
      </motion.span>
    );
    if (!masked) return node;
    return (
      <span key={unit.key} className={cn(blockReset, "-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom")}>
        {node}
      </span>
    );
  };

  let content: React.ReactNode;
  if (by === "line" && lines && lineReady) {
    const groups: React.ReactNode[][] = [];
    let w = 0;
    for (const piece of pieces) {
      if (piece.space) continue;
      const line = lines[w] ?? 0;
      (groups[line] ??= []).push(
        <span key={piece.key} data-split-word="" className={cn(blockReset, "inline-block whitespace-pre")}>
          {piece.units[0]?.text}
        </span>,
      );
      w += 1;
    }
    content = groups.map((words, line) => {
      const spaced: React.ReactNode[] = [];
      words.forEach((word, i) => {
        if (i > 0) spaced.push(" ");
        spaced.push(word);
      });
      const inner = (
        // Lines are shrink-to-fit inline-blocks: when the width narrows, their words wrap inside
        // them, the offsets change and the next measurement regroups the lines.
        <motion.span custom={line} variants={unitVariants} className={unitClass}>
          {spaced}
        </motion.span>
      );
      return (
        <React.Fragment key={line}>
          {line > 0 ? " " : null}
          <span
            className={cn(
              blockReset,
              "inline-block",
              masked && "-mb-[0.12em] overflow-hidden pb-[0.12em] align-bottom",
            )}
          >
            {inner}
          </span>
        </React.Fragment>
      );
    });
  } else {
    let order = 0;
    content = pieces.map((piece) => {
      if (piece.space) return piece.space;
      if (by !== "char") {
        const unit = piece.units[0];
        if (!unit) return null;
        // Line mode before measuring renders plain measurable words, kept hidden.
        if (by === "line") {
          return (
            <span key={piece.key} data-split-word="" className={cn(blockReset, "inline-block opacity-0")}>
              {unit.text}
            </span>
          );
        }
        return renderUnit(unit, order++);
      }
      return (
        <span key={piece.key} className={cn(blockReset, "inline-block whitespace-nowrap")}>
          {piece.units.map((unit) => renderUnit(unit, order++))}
        </span>
      );
    });
  }

  const MotionTag = motionTagMap[as];
  return (
    <MotionTag
      ref={mergedRef}
      data-state={shown ? "visible" : "hidden"}
      data-by={by}
      data-preset={preset}
      {...props}
      className={cn(blockReset, className)}
    >
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <motion.span
        ref={layerRef}
        aria-hidden="true"
        initial={played ? false : "hidden"}
        animate={shown ? "visible" : "hidden"}
        onAnimationComplete={(definition) => {
          if (definition !== "visible") return;
          setPlayed(true);
          onCompleteRef.current?.();
        }}
        className={cn(blockReset, "inline whitespace-pre-wrap")}
      >
        {content}
      </motion.span>
    </MotionTag>
  );
});
