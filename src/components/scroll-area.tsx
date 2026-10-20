"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";

export interface ScrollAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onScroll"> {
  /** Scroll axis. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Fade the content at edges that have more to scroll. Default true. */
  fade?: boolean;
  /** Fade length in px. Default 32. */
  fadeSize?: number;
  /**
   * "hover" (default): the thumb shows while hovered or scrolling. "scroll": only while scrolling.
   * "always": always visible. "never": native scrolling only, no overlay bar.
   */
  scrollbar?: "hover" | "scroll" | "always" | "never";
  /** Ms the bar stays after scrolling stops. Default 800. */
  hideDelayMs?: number;
  /** Accessible name of the scrollable region (it becomes focusable when it overflows). */
  label?: string;
  /** Class names for the scrolling viewport (set max-h / h here or on the root). */
  viewportClassName?: string;
  /** Ref to the scrolling element (for scrollTo, virtualizers, scroll-linked hooks). */
  viewportRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

type Axis = "y" | "x";

/** Native scrolling with thin overlay scrollbars and edge fades that follow the scroll position. */
export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    orientation = "vertical",
    fade = true,
    fadeSize = 32,
    scrollbar = "hover",
    hideDelayMs = 800,
    label,
    viewportClassName,
    viewportRef,
    onScroll,
    className,
    children,
    ...props
  },
  ref,
) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const bars = { y: React.useRef<HTMLDivElement>(null), x: React.useRef<HTMLDivElement>(null) };
  const thumbs = { y: React.useRef<HTMLDivElement>(null), x: React.useRef<HTMLDivElement>(null) };
  const rootRef = React.useRef<HTMLDivElement>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [overflow, setOverflow] = React.useState({ x: false, y: false });
  const mergedViewportRef = React.useMemo(() => mergeRefs(viewport, viewportRef), [viewportRef]);
  const mergedRootRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const axes: Axis[] = orientation === "both" ? ["y", "x"] : orientation === "horizontal" ? ["x"] : ["y"];
  const axesKey = axes.join("");

  /** Writes thumb geometry and fade sizes straight to the DOM (no re-render per scroll frame). */
  const sync = React.useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    for (const axis of axesKey.split("") as Axis[]) {
      const size = axis === "y" ? el.clientHeight : el.clientWidth;
      const content = axis === "y" ? el.scrollHeight : el.scrollWidth;
      const raw = axis === "y" ? el.scrollTop : el.scrollLeft;
      const pos = Math.abs(raw); // RTL horizontal scrollLeft is negative.
      const max = Math.max(0, content - size);
      const bar = bars[axis].current;
      const thumb = thumbs[axis].current;
      if (bar && thumb && content > 0) {
        const track = axis === "y" ? bar.clientHeight : bar.clientWidth;
        const length = Math.max(24, (size / content) * track);
        const offset = max > 0 ? (pos / max) * (track - length) : 0;
        thumb.style[axis === "y" ? "height" : "width"] = `${length}px`;
        thumb.style.transform = axis === "y" ? `translateY(${offset}px)` : `translateX(${raw < 0 ? -offset : offset}px)`;
      }
      const start = Math.min(fadeSize, pos);
      const end = Math.min(fadeSize, Math.max(0, max - pos));
      el.style.setProperty(axis === "y" ? "--pui-fade-top" : "--pui-fade-start", `${start}px`);
      el.style.setProperty(axis === "y" ? "--pui-fade-bottom" : "--pui-fade-end", `${end}px`);
    }
    // bars and thumbs hold stable ref objects.
  }, [axesKey, fadeSize]);

  useIsomorphicLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => {
      sync();
      const next = { x: el.scrollWidth > el.clientWidth + 1, y: el.scrollHeight > el.clientHeight + 1 };
      setOverflow((prev) => (prev.x === next.x && prev.y === next.y ? prev : next));
    };
    if (typeof ResizeObserver === "undefined") {
      sync();
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [sync]);

  // Bars mount once overflow is known; size their thumbs right away.
  useIsomorphicLayoutEffect(() => {
    sync();
  }, [overflow, sync]);

  React.useEffect(() => () => clearTimeout(hideTimer.current), []);

  const flagScrolling = () => {
    const root = rootRef.current;
    if (!root) return;
    root.setAttribute("data-scrolling", "");
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => root.removeAttribute("data-scrolling"), hideDelayMs);
  };

  const dragThumb = (axis: Axis) => (event: React.PointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    const bar = bars[axis].current;
    const thumb = thumbs[axis].current;
    if (!el || !bar || !thumb || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    const start = axis === "y" ? event.clientY : event.clientX;
    const startScroll = axis === "y" ? el.scrollTop : el.scrollLeft;
    const track = (axis === "y" ? bar.clientHeight : bar.clientWidth) - (axis === "y" ? thumb.offsetHeight : thumb.offsetWidth);
    const max = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    const root = rootRef.current;
    root?.setAttribute("data-dragging", "");
    const move = (e: PointerEvent) => {
      const delta = ((axis === "y" ? e.clientY : e.clientX) - start) * (track > 0 ? max / track : 0);
      if (axis === "y") el.scrollTop = startScroll + delta;
      else el.scrollLeft = startScroll + delta;
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      root?.removeAttribute("data-dragging");
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const jump = (axis: Axis) => (event: React.PointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    const thumb = thumbs[axis].current;
    if (!el || !thumb || event.target !== event.currentTarget) return;
    const rect = thumb.getBoundingClientRect();
    const before = axis === "y" ? event.clientY < rect.top : event.clientX < rect.left;
    const page = (axis === "y" ? el.clientHeight : el.clientWidth) * 0.9;
    el.scrollBy({ [axis === "y" ? "top" : "left"]: before ? -page : page, behavior: "smooth" });
  };

  const scrollable = overflow.x || overflow.y;
  const maskY = "linear-gradient(to bottom, transparent, #000 var(--pui-fade-top, 0px), #000 calc(100% - var(--pui-fade-bottom, 0px)), transparent)"; // pui-allow-color
  const maskX = "linear-gradient(to right, transparent, #000 var(--pui-fade-start, 0px), #000 calc(100% - var(--pui-fade-end, 0px)), transparent)"; // pui-allow-color
  const mask = !fade ? undefined : orientation === "both" ? `${maskY}, ${maskX}` : orientation === "horizontal" ? maskX : maskY;

  return (
    <div
      ref={mergedRootRef}
      data-orientation={orientation}
      data-scrollbar={scrollbar}
      {...props}
      className={cn(blockReset, "group/scroll relative flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
    >
      <div
        ref={mergedViewportRef}
        role={label ? "region" : undefined}
        aria-label={label}
        tabIndex={scrollable ? 0 : undefined}
        onScroll={(event) => {
          sync();
          flagScrolling();
          onScroll?.(event);
        }}
        style={
          mask
            ? { maskImage: mask, WebkitMaskImage: mask, maskComposite: orientation === "both" ? "intersect" : undefined, WebkitMaskComposite: orientation === "both" ? "source-in" : undefined }
            : undefined
        }
        className={cn(
          blockReset,
          "min-h-0 flex-1 overscroll-contain outline-hidden",
          scrollbar !== "never" && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
          orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
          orientation === "both" && "overflow-auto",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-pui-ring",
          viewportClassName,
        )}
      >
        {children}
      </div>
      {scrollbar !== "never"
        ? axes.map((axis) =>
            overflow[axis] ? (
              <div
                key={axis}
                ref={bars[axis]}
                aria-hidden="true"
                onPointerDown={jump(axis)}
                className={cn(
                  blockReset,
                  "absolute z-[1] flex touch-none p-0.5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
                  axis === "y" ? "inset-y-0 end-0 w-2.5 flex-col" : "inset-x-0 bottom-0 h-2.5 flex-row",
                  axis === "y" && orientation === "both" && "bottom-2.5",
                  scrollbar === "always"
                    ? "opacity-100"
                    : scrollbar === "hover"
                      ? "opacity-0 group-hover/scroll:opacity-100 group-data-[scrolling]/scroll:opacity-100 group-data-[dragging]/scroll:opacity-100"
                      : "opacity-0 group-data-[scrolling]/scroll:opacity-100 group-data-[dragging]/scroll:opacity-100",
                )}
              >
                <div
                  ref={thumbs[axis]}
                  onPointerDown={dragThumb(axis)}
                  className={cn(
                    blockReset,
                    "relative shrink-0 rounded-full bg-pui-foreground/25 transition-colors duration-150 hover:bg-pui-foreground/45",
                    "group-data-[dragging]/scroll:bg-pui-foreground/50",
                    "before:absolute before:-inset-1 before:content-['']",
                    axis === "y" ? "w-full" : "h-full",
                  )}
                />
              </div>
            ) : null,
          )
        : null}
    </div>
  );
});
