"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps, Orientation } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ExpandingCardsItem {
  /** Stable key. Default: the index. */
  id?: React.Key;
  title: string;
  /** Image URL for the panel background. */
  image?: string;
  /** Alt text for the image. Default "" (decorative, the title names the panel). */
  imageAlt?: string;
  /** Shown below the title while the panel is expanded. Keep it non-interactive (it sits in a button). */
  content?: React.ReactNode;
  /** Small visual in the collapsed panel, e.g. an icon or a number. */
  icon?: React.ReactNode;
  /** Panel color when there is no image (any CSS color, e.g. "var(--pui-chart-2)"). */
  accent?: string;
}

export interface ExpandingCardsProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "onChange"> {
  items: ExpandingCardsItem[];
  /** Controlled expanded index. */
  index?: number;
  /** Default 0. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** "hover" expands on hover and focus (and click on touch); "click" waits for a click or Enter. Default "hover". */
  trigger?: "hover" | "click";
  /** Default "horizontal". Vertical stacks the panels as rows. */
  orientation?: Orientation;
  /** flex-grow of the expanded panel vs 1 for the others. Default 4. */
  grow?: number;
  /** Class for each panel button. */
  panelClassName?: string;
}

/**
 * An accordion gallery: a row of image panels where the hovered, focused or clicked one grows to
 * show its caption. Panels are buttons with aria-expanded and arrow-key roving focus.
 */
export const ExpandingCards = React.forwardRef<HTMLDivElement, ExpandingCardsProps>(function ExpandingCards(
  {
    items,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    trigger = "hover",
    orientation = "horizontal",
    grow = 4,
    panelClassName,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useControllableState({
    value: indexProp,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
  });
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);
  const horizontal = orientation === "horizontal";
  const count = items.length;

  const move = (event: React.KeyboardEvent<HTMLButtonElement>, from: number) => {
    const prev = horizontal ? "ArrowLeft" : "ArrowUp";
    const next = horizontal ? "ArrowRight" : "ArrowDown";
    let to: number | null = null;
    if (event.key === next) to = (from + 1) % count;
    else if (event.key === prev) to = (from - 1 + count) % count;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = count - 1;
    if (to === null) return;
    event.preventDefault();
    buttons.current[to]?.focus();
    if (trigger === "hover") setActive(to);
  };

  const layoutTransition = reduced ? { duration: 0 } : springs.layout;
  return (
    <div
      ref={ref}
      data-orientation={orientation}
      {...props}
      className={cn(
        blockReset,
        "flex gap-2",
        horizontal ? "h-80 flex-row" : "h-[28rem] flex-col",
        className,
      )}
    >
      {items.map((item, i) => {
        const expanded = i === active;
        return (
          <motion.button
            key={item.id ?? i}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            aria-expanded={expanded}
            data-state={expanded ? "open" : "closed"}
            tabIndex={expanded ? 0 : -1}
            initial={false}
            animate={{ flexGrow: expanded ? grow : 1 }}
            transition={layoutTransition}
            style={
              !item.image && item.accent
                ? {
                    background: `linear-gradient(160deg, color-mix(in oklch, ${item.accent} 80%, var(--pui-surface)), color-mix(in oklch, ${item.accent} 35%, var(--pui-surface)))`,
                  }
                : undefined
            }
            onPointerEnter={(event) => {
              if (trigger === "hover" && event.pointerType === "mouse") setActive(i);
            }}
            onFocus={() => {
              if (trigger === "hover") setActive(i);
            }}
            onClick={() => setActive(i)}
            onKeyDown={(event) => move(event, i)}
            className={cn(
              controlReset,
              focusRing,
              "group relative isolate min-h-0 min-w-0 basis-0 cursor-pointer overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted text-left",
              panelClassName,
            )}
          >
            {item.image ? (
              <motion.img
                src={item.image}
                alt={item.imageAlt ?? ""}
                draggable={false}
                loading="lazy"
                initial={false}
                animate={{ scale: expanded || reduced ? 1 : 1.12 }}
                transition={reduced ? { duration: 0 } : { duration: 0.7, ease: easings.out }}
                className={cn(blockReset, "pointer-events-none absolute inset-0 -z-10 block size-full object-cover select-none")}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                blockReset,
                "pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-pui-overlay to-transparent transition-opacity duration-(--pui-duration-slow)",
                expanded ? "opacity-100" : "opacity-60",
              )}
            />
            {/* Collapsed label: vertical text in a row, a short chip in a column. */}
            <span
              aria-hidden={expanded}
              className={cn(
                blockReset,
                "absolute flex items-center gap-2 rounded-pui-md bg-pui-surface/80 px-2 py-1.5 text-sm font-medium text-pui-surface-foreground shadow-pui-sm backdrop-blur-md transition-opacity duration-(--pui-duration-base)",
                horizontal ? "bottom-3 left-1/2 -translate-x-1/2 [writing-mode:vertical-rl] rotate-180" : "top-1/2 left-3 -translate-y-1/2",
                expanded ? "opacity-0" : "opacity-100",
              )}
            >
              {item.icon ? <span className={cn(blockReset, "inline-flex [writing-mode:horizontal-tb]")}>{item.icon}</span> : null}
              <span className={cn(blockReset, "truncate")}>{item.title}</span>
            </span>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.span
                  key="caption"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: reduced ? { duration: 0.15 } : { delay: 0.08, ...springs.smooth },
                  }}
                  exit={{ opacity: 0, y: reduced ? 0 : 8, transition: { duration: durations.fast } }}
                  className={cn(
                    blockReset,
                    "absolute right-3 bottom-3 left-3 flex flex-col gap-1 rounded-pui-lg bg-pui-surface/85 p-3 text-pui-surface-foreground shadow-pui-md backdrop-blur-md",
                  )}
                >
                  <span className={cn(blockReset, "flex items-center gap-2 text-base font-semibold")}>
                    {item.icon}
                    {item.title}
                  </span>
                  {item.content ? (
                    <span className={cn(blockReset, "line-clamp-3 text-sm text-pui-muted-foreground")}>{item.content}</span>
                  ) : null}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
});
