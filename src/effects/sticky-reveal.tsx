"use client";
import { AnimatePresence, motion, useSpring } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface StickyRevealItem {
  /** Stable key. Default: the index. */
  id?: React.Key;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Shown in the sticky panel while this block is active (give images alt text). */
  media: React.ReactNode;
  /** Small label above the title, e.g. "01" or "Step one". */
  eyebrow?: React.ReactNode;
}

export interface StickyRevealProps extends MotionSafeHTMLProps<HTMLDivElement> {
  items: StickyRevealItem[];
  /** Scroll box the section lives in. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Panel side on wide screens. Default "right". */
  side?: "left" | "right";
  /** Distance from the top of the viewport (or container) where the panel sticks, in px. Default 24. */
  stickyTop?: number;
  /** Show the progress rail beside the blocks. Default true. */
  indicator?: boolean;
  /** Called when the block at the reading line changes. */
  onActiveChange?: (index: number) => void;
  /** Class for each text block (set its min height to tune pacing). */
  blockClassName?: string;
  /** Class for the sticky media panel (size, radius, background). */
  panelClassName?: string;
}

/**
 * Sticky scroll storytelling: text blocks scroll on one side while a sticky panel on the other
 * crossfades to the media of the block at the reading line. On narrow screens each block shows its
 * own media inline, so the story still reads in order.
 */
export const StickyReveal = React.forwardRef<HTMLDivElement, StickyRevealProps>(function StickyReveal(
  {
    items,
    container,
    side = "right",
    stickyTop = 24,
    indicator = true,
    onActiveChange,
    blockClassName,
    panelClassName,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);
  const blockRefs = React.useRef<(HTMLElement | null)[]>([]);
  const onActiveChangeRef = useLatestRef(onActiveChange);
  const count = items.length;
  const fill = useSpring(count > 0 ? 1 / count : 0, springs.smooth);

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<number>();
    // A thin reading line around 45% of the viewport height: the block crossing it is active.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size === 0) return;
        const next = Math.max(...visible);
        if (next === activeRef.current) return;
        activeRef.current = next;
        setActive(next);
        onActiveChangeRef.current?.(next);
      },
      { root: container?.current ?? null, rootMargin: "-45% 0px -54% 0px", threshold: 0 },
    );
    for (const el of blockRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [container, count, onActiveChangeRef]);

  React.useEffect(() => {
    fill.set(count > 0 ? (active + 1) / count : 0);
  }, [active, count, fill]);

  const current = items[Math.min(active, Math.max(count - 1, 0))];
  const panel = (
    <div
      className={cn(blockReset, "hidden md:block", side === "left" ? "md:order-first" : "md:order-last")}
    >
      <div
        style={{ top: stickyTop }}
        className={cn(
          blockReset,
          "sticky aspect-[4/3] w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted shadow-pui-lg",
          panelClassName,
        )}
      >
        <AnimatePresence initial={false}>
          {current ? (
            <motion.div
              key={current.id ?? active}
              data-index={active}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: reduced ? 0.15 : 0.25 } }}
              transition={reduced ? { duration: 0.15 } : springs.smooth}
              className={cn(blockReset, "absolute inset-0 [&>img]:size-full [&>img]:object-cover")}
            >
              {current.media}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      data-active={active}
      {...props}
      className={cn(blockReset, "relative grid gap-8 md:grid-cols-2 md:gap-12", className)}
    >
      <div className={cn(blockReset, "relative flex flex-col", indicator && "pl-6")}>
        {indicator ? (
          <div
            aria-hidden="true"
            className={cn(blockReset, "absolute top-0 bottom-0 left-0 w-0.5 rounded-full bg-pui-border")}
          >
            <motion.div
              style={{ scaleY: fill }}
              className={cn(blockReset, "absolute inset-0 origin-top rounded-full bg-pui-primary")}
            />
          </div>
        ) : null}
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <section
              key={item.id ?? index}
              ref={(el) => {
                blockRefs.current[index] = el;
              }}
              data-index={index}
              data-state={isActive ? "active" : "inactive"}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                blockReset,
                "flex min-h-[60vh] flex-col justify-center gap-3 py-10 transition-opacity duration-(--pui-duration-slow) ease-(--pui-ease-out) md:opacity-40 md:data-[state=active]:opacity-100",
                blockClassName,
              )}
            >
              {item.eyebrow ? (
                <span className={cn(blockReset, "text-xs font-semibold tracking-widest text-pui-primary-text uppercase")}>
                  {item.eyebrow}
                </span>
              ) : null}
              <h3 className={cn(blockReset, "text-2xl font-semibold tracking-tight text-pui-foreground")}>{item.title}</h3>
              {item.body ? (
                <div className={cn(blockReset, "text-base leading-relaxed text-pui-muted-foreground")}>{item.body}</div>
              ) : null}
              <div
                className={cn(
                  blockReset,
                  "mt-3 aspect-[4/3] w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted md:hidden [&>img]:size-full [&>img]:object-cover",
                )}
              >
                {item.media}
              </div>
            </section>
          );
        })}
      </div>
      {panel}
    </div>
  );
});
