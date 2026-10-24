"use client";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ReadingRailSection {
  /** id of the heading (or section) inside the article. */
  id: string;
  /** Shown next to the node and used as the link name. */
  label: string;
}

export interface ReadingRailProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "children"> {
  /** Sections in document order. Each id must match an element inside the children. */
  sections: ReadingRailSection[];
  /** The article. */
  children: React.ReactNode;
  /** Scroll container to track. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Rail side. Default "left". */
  side?: "left" | "right";
  /** A section is active once its top passes this many px from the top of the viewport. Default 96. */
  offset?: number;
  /** Sticky distance of the rail from the top, px. Default 24. */
  stickyTop?: number;
  /** Rail height, px. Default 320. */
  railHeight?: number;
  /** Rail column width, px (labels truncate to fit). Default 176. */
  width?: number;
  /** "active": only the current label until the rail is hovered or focused; "always"; "none". Default "active". */
  labels?: "active" | "always" | "none";
  /** Smooth the fill with a spring. Default true. */
  spring?: boolean;
  /** Show "N min left" under the rail. Default true. */
  showTimeLeft?: boolean;
  /** Reading speed for the time estimate. Default 230. */
  wordsPerMinute?: number;
  /** Accessible name of the navigation. Default "Reading progress". */
  navLabel?: string;
  /** Formats the time-left line. Default "4 min left" / "Done". */
  formatTimeLeft?: (minutes: number) => string;
  /** Called with the active section id whenever it changes. */
  onActiveChange?: (id: string) => void;
}

/** Minimum gap between two nodes, px, so labels never overlap. */
const MIN_GAP = 22;
const defaultTimeLeft = (minutes: number) => (minutes <= 0 ? "Done" : `${minutes} min left`);

/**
 * Spreads nodes at their proportional positions (0..1) over `height` px, keeping at least MIN_GAP
 * between neighbours: a forward pass pushes nodes down, a backward pass pulls them back inside.
 */
export function layoutRailNodes(positions: readonly number[], height: number, gap = MIN_GAP): number[] {
  const out = positions.map((p) => Math.min(Math.max(p, 0), 1) * height);
  for (let i = 1; i < out.length; i += 1) out[i] = Math.max(out[i] ?? 0, (out[i - 1] ?? 0) + gap);
  const last = out.length - 1;
  if (last >= 0 && (out[last] ?? 0) > height) out[last] = height;
  for (let i = last - 1; i >= 0; i -= 1) out[i] = Math.min(out[i] ?? 0, (out[i + 1] ?? 0) - gap);
  return out.map((y) => Math.max(0, y));
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 0.5);
}

/**
 * Sticky tracing rail beside long content: the beam fills as you read, each section lights a node
 * when you pass it, the current heading stays labelled, and every node jumps to its section.
 */
export const ReadingRail = React.forwardRef<HTMLDivElement, ReadingRailProps>(function ReadingRail(
  {
    sections,
    children,
    container,
    side = "left",
    offset = 96,
    stickyTop = 24,
    railHeight = 320,
    width = 176,
    labels = "active",
    spring = true,
    showTimeLeft = true,
    wordsPerMinute = 230,
    navLabel = "Reading progress",
    formatTimeLeft = defaultTimeLeft,
    onActiveChange,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const articleRef = React.useRef<HTMLDivElement>(null);
  const linkRefs = React.useRef<(HTMLAnchorElement | null)[]>([]);
  const [active, setActive] = React.useState(0);
  // Server and first client render: nodes evenly spaced, so markup matches before measuring.
  // Keyed on the ids, so an inline sections array does not re-measure on every render.
  const idKey = sections.map((section) => section.id).join("\u0000");
  const count = sections.length;
  const even = React.useMemo(
    () => Array.from({ length: count }, (_, i) => (count > 1 ? i / (count - 1) : 0)),
    [count],
  );
  const [ratios, setRatios] = React.useState<number[]>(even);
  const [words, setWords] = React.useState(0);
  const [read, setRead] = React.useState(0);
  const latest = useLatestRef({ sections, container, offset, onActiveChange, active });

  const { scrollYProgress } = useScroll({ target: articleRef, container, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });
  const fill = spring && !reduced ? smooth : scrollYProgress;
  const headY = useTransform(fill, (p) => p * railHeight);

  const find = React.useCallback((id: string): HTMLElement | null => {
    const article = articleRef.current;
    if (!article) return null;
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
    return article.querySelector<HTMLElement>(`#${escaped}`) ?? document.getElementById(id);
  }, []);

  const updateActive = React.useCallback(() => {
    const { sections: list, container: box, offset: off } = latest.current;
    const top = box?.current ? box.current.getBoundingClientRect().top : 0;
    let next = 0;
    list.forEach((section, i) => {
      const el = find(section.id);
      if (el && el.getBoundingClientRect().top - top <= off) next = i;
    });
    // The last section may be too short to reach the line: finishing the article activates it.
    if (scrollYProgress.get() >= 0.995 && list.length > 0) next = list.length - 1;
    if (next !== latest.current.active) {
      setActive(next);
      const id = list[next]?.id;
      if (id) latest.current.onActiveChange?.(id);
    }
    setRead(Math.round(scrollYProgress.get() * 100) / 100);
  }, [find, latest, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", updateActive);

  useIsomorphicLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const measure = () => {
      const box = article.getBoundingClientRect();
      if (box.height <= 0) return;
      const next = latest.current.sections.map((section, i) => {
        const el = find(section.id);
        return el ? (el.getBoundingClientRect().top - box.top) / box.height : (even[i] ?? 0);
      });
      setRatios((prev) => (sameNumbers(prev, next) ? prev : next));
      setWords((article.textContent ?? "").split(/\s+/).filter(Boolean).length);
      updateActive();
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(article);
    return () => observer.disconnect();
  }, [even, idKey, find, latest, updateActive]);

  const nodes = layoutRailNodes(ratios.length === sections.length ? ratios : even, railHeight);
  const minutesLeft = words > 0 ? Math.ceil((words * (1 - read)) / Math.max(1, wordsPerMinute)) : null;

  const jump = (index: number) => {
    const section = sections[index];
    const el = section ? find(section.id) : null;
    if (!el) return;
    const box = container?.current;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const delta = el.getBoundingClientRect().top - (box ? box.getBoundingClientRect().top : 0) - offset + 2;
    if (box) box.scrollTo({ top: box.scrollTop + delta, behavior });
    else window.scrollTo({ top: window.scrollY + delta, behavior });
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const last = sections.length - 1;
    const target =
      event.key === "ArrowDown"
        ? Math.min(last, index + 1)
        : event.key === "ArrowUp"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    linkRefs.current[target]?.focus();
  };

  const right = side === "right";
  const showLabels = labels !== "none";

  const rail = (
    <nav
      aria-label={navLabel}
      data-labels={labels}
      className={cn(blockReset, "group/rail sticky self-start")}
      style={{ top: stickyTop, width: showLabels ? width : 28 }}
    >
      <div className={cn(blockReset, "relative")} style={{ height: railHeight }}>
        {/* Track, fill and the glowing head of the beam. */}
        <div
          aria-hidden="true"
          className={cn(blockReset, "absolute inset-y-0 w-0.5 rounded-pui-full bg-pui-border", right ? "right-[13px]" : "left-[13px]")}
        >
          <motion.div
            className={cn(blockReset, "absolute inset-0 origin-top rounded-pui-full bg-linear-to-b from-pui-beam-from to-pui-beam-to")}
            style={{ scaleY: fill }}
          />
          <motion.div
            className={cn(
              blockReset,
              "absolute -left-[3px] -top-1 size-2 rounded-pui-full bg-pui-beam-to shadow-[0_0_10px_2px_var(--pui-beam-to)]",
            )}
            style={{ y: headY }}
          />
        </div>
        <ol className={cn(listReset, "absolute inset-0")}>
          {sections.map((section, i) => {
            const isActive = i === active;
            const passed = i <= active;
            return (
              <li key={section.id} className={cn(blockReset, "absolute inset-x-0 h-0")} style={{ top: nodes[i] ?? 0 }}>
                <a
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  tabIndex={isActive ? 0 : -1}
                  title={labels === "none" ? section.label : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    jump(i);
                  }}
                  onKeyDown={(event) => onKeyDown(event, i)}
                  className={cn(
                    blockReset,
                    "absolute inset-x-0 -top-2.5 flex h-5 items-center gap-2 rounded-pui-sm text-xs no-underline",
                    right ? "flex-row-reverse" : "flex-row",
                    focusRing,
                  )}
                >
                  <span aria-hidden="true" className={cn(blockReset, "relative grid w-7 shrink-0 place-items-center")}>
                    <motion.span
                      className={cn(
                        blockReset,
                        "block size-2.5 rounded-pui-full border-2 transition-colors duration-(--pui-duration-base)",
                        passed ? "border-pui-beam-to bg-pui-beam-to" : "border-pui-border bg-pui-background",
                      )}
                      animate={reduced ? undefined : { scale: isActive ? 1.25 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                    {isActive && !reduced ? (
                      <motion.span
                        key={section.id}
                        className={cn(blockReset, "absolute size-2.5 rounded-pui-full border-2 border-pui-beam-to")}
                        initial={{ scale: 1, opacity: 0.7 }}
                        animate={{ scale: 2.4, opacity: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null}
                  </span>
                  {showLabels ? (
                    <span
                      className={cn(
                        blockReset,
                        "min-w-0 truncate transition-[opacity,color] duration-(--pui-duration-base) motion-reduce:transition-none",
                        right ? "text-right" : "text-left",
                        isActive ? "font-semibold text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                        labels === "active" && !isActive
                          ? "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
                          : "opacity-100",
                      )}
                    >
                      {section.label}
                    </span>
                  ) : (
                    <span className={cn(blockReset, "sr-only")}>{section.label}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      {showTimeLeft && showLabels ? (
        <p
          className={cn(
            blockReset,
            "mt-4 text-[11px] font-medium tabular-nums text-pui-muted-foreground",
            right ? "pr-9 text-right" : "pl-9",
          )}
        >
          {/* Words are counted after mount, so the server renders an empty line of the same height. */}
          {minutesLeft === null ? "\u00a0" : formatTimeLeft(minutesLeft)}
        </p>
      ) : null}
    </nav>
  );

  return (
    <div
      ref={ref}
      data-side={side}
      {...props}
      style={{
        gridTemplateColumns: right ? `minmax(0,1fr) ${showLabels ? width : 28}px` : `${showLabels ? width : 28}px minmax(0,1fr)`,
        ...style,
      }}
      className={cn(blockReset, "grid items-start gap-6", className)}
    >
      {right ? null : rail}
      <div ref={articleRef} className={cn(blockReset, "min-w-0")}>
        {children}
      </div>
      {right ? rail : null}
    </div>
  );
});
