"use client";

import { motion, useInView, useScroll, useSpring } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings, springs } from "../lib/motion";
import { blockReset, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Orientation, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TimelineStatus = "complete" | "current" | "upcoming" | "error";

export interface TimelineProps extends React.OlHTMLAttributes<HTMLOListElement> {
  /** Default "vertical". */
  orientation?: Orientation;
  /** Vertical only: "alternate" zig-zags items around a centered line from 640px of container width. Default "start". */
  align?: "start" | "alternate";
  /**
   * "scroll" (default): the line draws as the list scrolls through the viewport. "inView": it draws once
   * when the list enters view. "none": static.
   */
  animate?: "scroll" | "inView" | "none";
}

export interface TimelineItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  title: React.ReactNode;
  /** Visible time text. */
  time?: React.ReactNode;
  /** Machine-readable time for <time dateTime> (ISO). Dates passed as `time` set it automatically. */
  dateTime?: string;
  /** Replaces the dot with an icon badge. */
  icon?: React.ReactNode;
  /** Default "complete". "current" pulses; "upcoming" is hollow. */
  status?: TimelineStatus;
  /** Dot color. Default "primary" ("danger" for status "error"). */
  tone?: Tone;
}

interface TimelineContextValue {
  orientation: Orientation;
  align: "start" | "alternate";
  animate: "scroll" | "inView" | "none";
  reduced: boolean;
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null);
const ItemIndexContext = React.createContext(0);

function useTimeline(): TimelineContextValue {
  const context = React.useContext(TimelineContext);
  if (!context) throw new Error("[changelui] TimelineItem must be used inside Timeline");
  return context;
}

/** Vertical or horizontal timeline whose line draws with scroll and whose dots pop in at each milestone. */
export const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(function Timeline(
  { orientation = "vertical", align = "start", animate = "scroll", className, children, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const listRef = React.useRef<HTMLOListElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(listRef, ref), [ref]);
  const vertical = orientation === "vertical";
  const mode = reduced ? "none" : animate;
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 55%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const inView = useInView(listRef, { once: true, amount: 0.3 });
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const context = React.useMemo(() => ({ orientation, align, animate: mode, reduced }), [orientation, align, mode, reduced]);
  const alternate = vertical && align === "alternate";

  // Horizontal timelines don't scroll with the page, so "scroll" draws once in view there.
  const lineMode = mode === "scroll" && !vertical ? "inView" : mode;
  const lineStyle = lineMode === "scroll" ? { scaleY: smooth } : undefined;
  const lineAnimate =
    lineMode === "scroll"
      ? undefined
      : lineMode === "none"
        ? { scaleX: 1, scaleY: 1 }
        : vertical
          ? { scaleY: inView ? 1 : 0 }
          : { scaleX: inView ? 1 : 0 };

  return (
    <TimelineContext.Provider value={context}>
      <ol
        ref={mergedRef}
        data-orientation={orientation}
        data-align={align}
        {...props}
        className={cn(
          listReset,
          "relative isolate @container",
          vertical ? "flex flex-col" : "flex flex-row overflow-x-auto pb-2",
          className,
        )}
      >
        {/* Track + fill. Vertical start: under the 32px dot column; alternate: centered from @2xl. */}
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute -z-[1] rounded-full bg-pui-border",
            vertical ? "bottom-4 top-4 w-0.5 start-[15px]" : "inset-x-4 top-[15px] h-0.5",
            alternate && "@2xl:start-[calc(50%-1px)]",
          )}
        >
          <motion.span
            initial={lineMode === "inView" ? (vertical ? { scaleY: 0 } : { scaleX: 0 }) : false}
            animate={lineAnimate}
            style={lineStyle}
            transition={lineMode === "inView" ? { duration: 1.2, ease: easings.outExpo } : { duration: 0 }}
            className={cn(
              blockReset,
              "absolute inset-0 block rounded-full bg-linear-to-b from-pui-primary to-(--pui-gradient-2)",
              vertical ? "origin-top" : "origin-left bg-linear-to-r rtl:origin-right",
            )}
          />
        </span>
        {items.map((child, index) => (
          <ItemIndexContext.Provider key={child.key ?? index} value={index}>
            {child}
          </ItemIndexContext.Provider>
        ))}
      </ol>
    </TimelineContext.Provider>
  );
});

function isoOf(time: React.ReactNode, dateTime?: string): string | undefined {
  if (dateTime) return dateTime;
  if (time instanceof Date) return time.toISOString();
  return undefined;
}

export const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(function TimelineItem(
  { title, time, dateTime, icon, status = "complete", tone, className, children, ...props },
  ref,
) {
  const timeline = useTimeline();
  const index = React.useContext(ItemIndexContext);
  const itemRef = React.useRef<HTMLLIElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(itemRef, ref), [ref]);
  const inView = useInView(itemRef, { once: true, margin: "0px 0px -20% 0px" });
  const animated = timeline.animate !== "none";
  const shown = !animated || inView;
  const vertical = timeline.orientation === "vertical";
  const alternate = vertical && timeline.align === "alternate";
  const flip = alternate && index % 2 === 1;
  const dotTone: Tone = tone ?? (status === "error" ? "danger" : "primary");
  const iso = isoOf(time, dateTime);
  const timeText = time instanceof Date ? time.toLocaleDateString() : time;

  const dot = (
    <span aria-hidden="true" className={cn(blockReset, "relative grid size-8 shrink-0 place-items-center", toneClasses[dotTone])}>
      <motion.span
        initial={animated ? { scale: 0, opacity: 0 } : false}
        animate={shown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={springs.bouncy}
        className={cn(
          blockReset,
          "relative grid place-items-center rounded-full",
          icon ? "size-8 border border-(--pui-tone)/30 bg-pui-surface text-(--pui-tone-text) shadow-(--pui-shadow-xs) [&_svg]:size-4" : "size-3.5",
          !icon && status === "upcoming" && "border-2 border-pui-border bg-pui-background",
          !icon && status !== "upcoming" && "bg-(--pui-tone) shadow-[0_0_0_4px_var(--pui-background)]",
        )}
      >
        {icon}
        {status === "current" ? (
          <span className={cn(blockReset, "absolute -inset-1.5 rounded-full border-2 border-(--pui-tone)/50 motion-safe:animate-ping")} />
        ) : null}
      </motion.span>
    </span>
  );

  const content = (
    <motion.div
      initial={animated ? { opacity: 0, y: vertical ? 10 : 0, x: vertical ? 0 : -6 } : false}
      animate={shown ? { opacity: 1, y: 0, x: 0 } : undefined}
      transition={{ ...springs.smooth, delay: 0.06 }}
      className={cn(
        blockReset,
        "flex min-w-0 flex-col gap-1",
        vertical ? "pb-8 pt-1" : "pe-6 pt-3",
        flip && "@2xl:items-end @2xl:text-end",
      )}
    >
      {time !== undefined ? (
        <time
          dateTime={iso}
          className={cn(blockReset, "text-xs font-medium uppercase tracking-wide text-pui-muted-foreground tabular-nums")}
        >
          {timeText}
        </time>
      ) : null}
      <span
        className={cn(
          blockReset,
          "text-sm font-semibold text-pui-foreground",
          status === "upcoming" && "text-pui-muted-foreground",
        )}
      >
        {title}
      </span>
      {children ? <div className={cn(blockReset, "text-sm leading-relaxed text-pui-muted-foreground")}>{children}</div> : null}
    </motion.div>
  );

  return (
    <li
      ref={mergedRef}
      data-status={status}
      aria-current={status === "current" ? "step" : undefined}
      {...props}
      className={cn(
        blockReset,
        vertical ? "grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4" : "flex w-56 shrink-0 flex-col",
        alternate && "@2xl:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]",
        className,
      )}
    >
      {alternate ? (
        <>
          {/* Narrow containers keep content on the end side; wide ones zig-zag around the line. */}
          <div className={cn(blockReset, "col-start-1 row-start-1 @2xl:col-start-2")}>{dot}</div>
          <div className={cn(blockReset, "col-start-2 row-start-1 min-w-0", flip ? "@2xl:col-start-1" : "@2xl:col-start-3")}>
            {content}
          </div>
        </>
      ) : (
        <>
          {dot}
          {content}
        </>
      )}
    </li>
  );
});
