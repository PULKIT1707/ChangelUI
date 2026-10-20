"use client";
import { motion, useScroll, useSpring, useTransform, type MotionValue, type UseScrollOptions } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { motionTagMap } from "../lib/motion-tags";
import { splitGraphemes, splitWords } from "../lib/split";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScrollTextRevealProps extends MotionSafeHTMLProps<HTMLElement> {
  children: string;
  /**
   * Scroll range over which the text lights up, as Motion `useScroll` offsets (target edge, then
   * viewport edge). Default ["start 0.9", "end 0.4"].
   */
  offset?: UseScrollOptions["offset"];
  /** Scroll box to follow. It needs a non-static position. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Light up word by word or letter by letter. Default "word". */
  split?: "word" | "char";
  /** Opacity of text that has not been reached yet. Default 0.18. */
  dimOpacity?: number;
  /** Unread text is also slightly blurred. Default false. */
  blur?: boolean;
  /** Ease the progress with a spring, so fast scrolls stay smooth. Default true. */
  smooth?: boolean;
  /** Words (case- and punctuation-insensitive) that light up in the accent color. */
  accent?: string[];
  /** Accent color. Default "var(--pui-primary-text)". */
  accentColor?: string;
  /** Rendered tag. Default "p". */
  as?: TextTag;
}

const DEFAULT_OFFSET: UseScrollOptions["offset"] = ["start 0.9", "end 0.4"];

const normalizeWord = (word: string) =>
  word
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

interface UnitProps {
  progress: MotionValue<number>;
  start: number;
  end: number;
  dim: number;
  blur: boolean;
  accent: string | undefined;
  children: React.ReactNode;
}

/** One word or letter whose opacity follows its own slice of the scroll range. */
function RevealUnit({ progress, start, end, dim, blur, accent, children }: UnitProps) {
  const opacity = useTransform(progress, [start, end], [dim, 1]);
  const filter = useTransform(progress, [start, end], ["blur(3px)", "blur(0px)"]);
  return (
    <motion.span
      style={{ opacity, filter: blur ? filter : undefined, color: accent }}
      className={cn(blockReset, "inline-block")}
    >
      {children}
    </motion.span>
  );
}

/**
 * Apple-style scroll reading: each word brightens from muted to full as the paragraph scrolls
 * through the viewport (roadmap W6). Unlike TextReveal it is scrubbed by scroll, not triggered.
 */
export const ScrollTextReveal = React.forwardRef<HTMLElement, ScrollTextRevealProps>(function ScrollTextReveal(
  {
    children,
    offset = DEFAULT_OFFSET,
    container,
    split = "word",
    dimOpacity = 0.18,
    blur = false,
    smooth = true,
    accent,
    accentColor = "var(--pui-primary-text)",
    as = "p",
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: localRef, container, offset });
  const eased = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.0005 });
  const progress = smooth ? eased : scrollYProgress;
  const accentSet = React.useMemo(() => new Set((accent ?? []).map(normalizeWord)), [accent]);

  const tokens = splitWords(children);
  const total = tokens.reduce(
    (sum, t) => sum + (t.space ? 0 : split === "char" ? splitGraphemes(t.text).length : 1),
    0,
  );
  const dim = reduced ? 1 : Math.min(Math.max(dimOpacity, 0), 1);
  // Units overlap a little so the light spreads like a soft edge rather than ticking on.
  const span = total > 0 ? 1 / total : 1;
  const slice = (i: number): [number, number] => [i * span, Math.min(1, (i + 1.6) * span)];

  let index = 0;
  const content = tokens.map((token, w) => {
    if (token.space) return token.text;
    const tint = accentSet.has(normalizeWord(token.text)) ? accentColor : undefined;
    if (split === "word") {
      const [start, end] = slice(index++);
      return (
        <RevealUnit key={w} progress={progress} start={start} end={end} dim={dim} blur={blur && !reduced} accent={tint}>
          {token.text}
        </RevealUnit>
      );
    }
    return (
      <span key={w} className={cn(blockReset, "inline-block whitespace-nowrap")}>
        {splitGraphemes(token.text).map((char, c) => {
          const [start, end] = slice(index++);
          return (
            <RevealUnit key={c} progress={progress} start={start} end={end} dim={dim} blur={blur && !reduced} accent={tint}>
              {char}
            </RevealUnit>
          );
        })}
      </span>
    );
  });

  const Tag = motionTagMap[as];
  return (
    <Tag ref={mergedRef} data-split={split} {...props} className={cn(blockReset, "relative", className)}>
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <span aria-hidden="true" className={cn(blockReset, "whitespace-pre-wrap")}>
        {content}
      </span>
    </Tag>
  );
});
