"use client";
import { motion, useInView } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, TextTag } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SparkleShape = "star" | "diamond" | "dot";

export interface SparklesTextProps extends MotionSafeHTMLProps<HTMLElement> {
  children: React.ReactNode;
  /** Most sparkles alive at once. Default 10. */
  count?: number;
  /** A new sparkle every intervalMs. Default 320. */
  intervalMs?: number;
  /** Sparkle colors, picked at random. Default primary plus two chart hues. */
  colors?: string[];
  /** Sparkle size range in px. Default [8, 18]. */
  size?: [number, number];
  /** Default "star". */
  shape?: SparkleShape;
  /** "always" sparkles while in view; "hover" only while pointed at or focused within. Default "always". */
  trigger?: "always" | "hover";
  /** Rendered tag. Default "span". */
  as?: TextTag;
}

const DEFAULT_COLORS = ["var(--pui-primary)", "var(--pui-chart-2)", "var(--pui-chart-4)"];
const DEFAULT_SIZE: [number, number] = [8, 18];

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  spin: number;
}

/** A four-pointed star with concave sides. */
const STAR = "M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z";
const DIAMOND = "M12 1L19 12L12 23L5 12Z";

function SparkleGlyph({ shape }: { shape: SparkleShape }) {
  if (shape === "dot") return <circle cx="12" cy="12" r="7" fill="currentColor" />;
  return <path d={shape === "star" ? STAR : DIAMOND} fill="currentColor" />;
}

/**
 * Text with sparkles that spawn around it, twinkle (scale 0 -> 1 -> 0 with a quarter turn) and fade
 * (roadmap W6). Sparkles are decorative, client-only and skipped under reduced motion.
 */
export const SparklesText = React.forwardRef<HTMLElement, SparklesTextProps>(function SparklesText(
  {
    children,
    count = 10,
    intervalMs = 320,
    colors = DEFAULT_COLORS,
    size = DEFAULT_SIZE,
    shape = "star",
    trigger = "always",
    as = "span",
    className,
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
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const visible = useDocumentVisible();
  const inView = useInView(localRef, { margin: "60px" });
  const [hovered, setHovered] = React.useState(false);
  const [sparkles, setSparkles] = React.useState<Sparkle[]>([]);
  const nextId = React.useRef(0);
  const active = isClient && !reduced && inView && visible && (trigger === "always" || hovered);
  const colorKey = colors.join("|");
  const [minSize, maxSize] = size;

  React.useEffect(() => {
    if (!active) return;
    const palette = colorKey.split("|").filter(Boolean);
    const spawn = () => {
      // Math.random is fine here: sparkles only exist after mount, never in server HTML.
      const sparkle: Sparkle = {
        id: nextId.current++,
        x: Math.random() * 100,
        y: Math.random() * 110 - 5,
        size: minSize + Math.random() * Math.max(0, maxSize - minSize),
        color: palette[Math.floor(Math.random() * palette.length)] ?? "currentColor",
        life: 0.7 + Math.random() * 0.5,
        spin: Math.random() < 0.5 ? 90 : -90,
      };
      setSparkles((list) => [...list, sparkle].slice(-Math.max(1, count)));
    };
    const first = window.setTimeout(spawn, 0);
    const timer = window.setInterval(spawn, Math.max(40, intervalMs));
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [active, colorKey, count, intervalMs, minSize, maxSize]);

  const Tag = motionTagMap[as];
  return (
    <Tag
      ref={mergedRef}
      data-state={active ? "sparkling" : "idle"}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, () => setHovered(true))}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => setHovered(false))}
      onFocus={composeEventHandlers(onFocus, () => setHovered(true))}
      onBlur={composeEventHandlers(onBlur, () => setHovered(false))}
      className={cn(blockReset, "relative inline-block", className)}
    >
      <span className={cn(blockReset, "relative z-[1]")}>{children}</span>
      {isClient && !reduced ? (
        <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 z-[2]")}>
          {sparkles.map((s) => (
            <motion.svg
              key={s.id}
              viewBox="0 0 24 24"
              focusable="false"
              width={s.size}
              height={s.size}
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0], rotate: [0, s.spin * 0.5, s.spin], opacity: [0, 1, 0] }}
              transition={{ duration: s.life, ease: "easeInOut", times: [0, 0.45, 1] }}
              style={{ left: `${s.x}%`, top: `${s.y}%`, color: s.color, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
              className={cn(blockReset, "absolute block drop-shadow-[0_0_4px_currentColor]")}
            >
              <SparkleGlyph shape={shape} />
            </motion.svg>
          ))}
        </span>
      ) : null}
    </Tag>
  );
});
