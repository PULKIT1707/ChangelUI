"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { useDrag } from "../lib/drag";
import { ChevronLeftIcon, ChevronRightIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface CarouselProps extends React.HTMLAttributes<HTMLElement> {
  /** Accessible name of the carousel region. */
  "aria-label"?: string;
  /** Move to the next slide every N ms. Pauses on hover, focus, hidden tabs and the pause button. */
  autoplayMs?: number;
  /** Wrap from the last slide to the first (buttons, keys and autoplay). Default false. */
  loop?: boolean;
  /** Where slides snap. Default "start". */
  align?: "start" | "center";
  /** "scale" shrinks and dims slides by their distance from the snap point. Default "none". */
  effect?: "none" | "scale";
  /** Drag to scroll with a mouse (touch and trackpads always scroll natively). Default true. */
  draggable?: boolean;
  /** Called when the active snap changes. */
  onIndexChange?: (index: number) => void;
  /** Label for each slide. Default `(i, n) => \`${i} of ${n}\``. */
  slideLabel?: (position: number, total: number) => string;
}

export type CarouselContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CarouselItemProps = React.HTMLAttributes<HTMLDivElement>;
export interface CarouselButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label"?: string;
}
export interface CarouselDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible name prefix of each dot. Default "Go to slide". */
  dotLabel?: string;
  /** Show the play/pause button when autoplay is on (required by WCAG 2.2.2). Default true. */
  showPlayPause?: boolean;
  pauseLabel?: string;
  playLabel?: string;
}

interface CarouselContextValue {
  contentRef: React.RefObject<HTMLDivElement | null>;
  index: number;
  snaps: number[];
  canPrev: boolean;
  canNext: boolean;
  scrollTo: (index: number) => void;
  prev: () => void;
  next: () => void;
  align: "start" | "center";
  autoplayMs: number | undefined;
  /** Autoplay is on (the user hasn't paused it). */
  playing: boolean;
  /** Autoplay is on and not suspended by hover, focus, a hidden tab or being offscreen. */
  running: boolean;
  setPlaying: (playing: boolean) => void;
  tick: number;
  reduced: boolean;
  dragProps: { onClickCapture: (event: React.MouseEvent) => void };
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel(part: string): CarouselContextValue {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) throw new Error(`${part} must be used inside Carousel.`);
  return ctx;
}

const ITEM = "[data-carousel-item]";

function itemsOf(content: HTMLElement): HTMLElement[] {
  return Array.from(content.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`));
}

/** Scroll position for each item, clamped and de-duplicated, so trailing items that can't snap share one dot. */
function computeSnaps(content: HTMLElement, align: "start" | "center"): number[] {
  const max = content.scrollWidth - content.clientWidth;
  const pad = parseFloat(getComputedStyle(content).scrollPaddingLeft) || 0;
  const snaps: number[] = [];
  for (const item of itemsOf(content)) {
    const raw = align === "center" ? item.offsetLeft + item.offsetWidth / 2 - content.clientWidth / 2 : item.offsetLeft - pad;
    const snap = Math.round(Math.min(max, Math.max(0, raw)));
    if (!snaps.length || Math.abs(snap - (snaps[snaps.length - 1] as number)) > 2) snaps.push(snap);
  }
  return snaps.length ? snaps : [0];
}

function nearest(snaps: number[], left: number): number {
  let best = 0;
  for (let i = 1; i < snaps.length; i++) {
    if (Math.abs((snaps[i] as number) - left) < Math.abs((snaps[best] as number) - left)) best = i;
  }
  return best;
}

/**
 * A native scroll-snap carousel: fast, touch-friendly and accessible, with mouse drag-to-scroll,
 * morphing dots that double as an autoplay timer, an optional scale-by-distance effect and loop.
 */
export const Carousel = React.forwardRef<HTMLElement, CarouselProps>(function Carousel(
  {
    autoplayMs,
    loop = false,
    align = "start",
    effect = "none",
    draggable = true,
    onIndexChange,
    slideLabel = (position, total) => `${position} of ${total}`,
    className,
    children,
    onKeyDown,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [snaps, setSnaps] = React.useState<number[]>([0]);
  const [index, setIndex] = React.useState(0);
  const [edges, setEdges] = React.useState({ start: true, end: false });
  // null until the user presses play/pause: autoplay starts on its own unless motion is reduced.
  const [paused, setPaused] = React.useState<boolean | null>(null);
  const playing = Boolean(autoplayMs) && (paused === null ? !reduced : !paused);
  const setPlaying = React.useCallback((next: boolean) => setPaused(!next), []);
  const [hovered, setHovered] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const [inView, setInView] = React.useState(true);
  const [tick, setTick] = React.useState(0);
  const latest = useLatestRef({ align, effect, onIndexChange, slideLabel, reduced, snaps, index, loop });

  // Measure snaps, active index and edges; apply the scale effect. Runs on scroll (rAF) and resize.
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let frame = 0;
    let lastIndex = -1;
    let currentSnaps = computeSnaps(content, latest.current.align);
    const paint = () => {
      frame = 0;
      const left = content.scrollLeft;
      const max = content.scrollWidth - content.clientWidth;
      const i = nearest(currentSnaps, left);
      if (i !== lastIndex) {
        lastIndex = i;
        setIndex(i);
        latest.current.onIndexChange?.(i);
      }
      setEdges((prev) => {
        const start = left <= 1;
        const end = left >= max - 1;
        return prev.start === start && prev.end === end ? prev : { start, end };
      });
      const items = itemsOf(content);
      const scale = latest.current.effect === "scale" && !latest.current.reduced;
      const center = left + content.clientWidth / 2;
      items.forEach((item) => {
        const inner = item.firstElementChild as HTMLElement | null;
        if (!inner) return;
        if (!scale) {
          inner.style.transform = "";
          inner.style.opacity = "";
          return;
        }
        const mid = item.offsetLeft + item.offsetWidth / 2;
        const d = Math.min(1, Math.abs(mid - center) / Math.max(1, item.offsetWidth));
        inner.style.transform = `scale(${1 - d * 0.1})`;
        inner.style.opacity = String(1 - d * 0.45);
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      currentSnaps = computeSnaps(content, latest.current.align);
      setSnaps((prev) => (prev.length === currentSnaps.length && prev.every((v, i) => v === currentSnaps[i]) ? prev : currentSnaps));
      const items = itemsOf(content);
      items.forEach((item, i) => {
        if (item.hasAttribute("data-auto-label")) item.setAttribute("aria-label", latest.current.slideLabel(i + 1, items.length));
      });
      schedule();
    };
    measure();
    content.addEventListener("scroll", schedule, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(content);
    const mutation = typeof MutationObserver === "undefined" ? null : new MutationObserver(measure);
    mutation?.observe(content, { childList: true });
    return () => {
      content.removeEventListener("scroll", schedule);
      resize?.disconnect();
      mutation?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [latest, align, effect, reduced]);

  // Pause autoplay while the carousel is offscreen.
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { threshold: 0.25 });
    io.observe(content);
    return () => io.disconnect();
  }, []);

  const scrollTo = React.useCallback(
    (target: number) => {
      const content = contentRef.current;
      const list = latest.current.snaps;
      if (!content || !list.length) return;
      const i = Math.min(list.length - 1, Math.max(0, target));
      content.scrollTo({ left: list[i], behavior: latest.current.reduced ? "auto" : "smooth" });
      setTick((t) => t + 1);
    },
    [latest],
  );

  const step = React.useCallback(
    (delta: number) => {
      const { snaps: list, index: current, loop: wraps } = latest.current;
      let target = current + delta;
      if (target < 0) target = wraps ? list.length - 1 : 0;
      if (target > list.length - 1) target = wraps ? 0 : list.length - 1;
      scrollTo(target);
    },
    [latest, scrollTo],
  );

  const autoplayActive = Boolean(autoplayMs) && playing && !hovered && !focusWithin && visible && inView;

  React.useEffect(() => {
    if (!autoplayActive || !autoplayMs) return;
    const timer = setTimeout(() => step(1), autoplayMs);
    return () => clearTimeout(timer);
  }, [autoplayActive, autoplayMs, step, index, tick]);

  // Mouse drag-to-scroll. Snap is switched off during the drag, then the nearest snap (biased by
  // the release velocity) is scrolled to.
  const dragged = React.useRef(false);
  const dragStart = React.useRef(0);
  useDrag(
    contentRef,
    {
      onStart: ({ event }) => {
        const content = contentRef.current;
        if (event.pointerType !== "mouse" || !content) return false;
        dragged.current = true;
        dragStart.current = content.scrollLeft;
        content.style.scrollSnapType = "none";
        content.style.scrollBehavior = "auto";
        content.style.cursor = "grabbing";
      },
      onMove: ({ dx }) => {
        const content = contentRef.current;
        if (content) content.scrollLeft = dragStart.current - dx;
      },
      onEnd: ({ vx }) => {
        const content = contentRef.current;
        if (!content) return;
        const projected = content.scrollLeft - vx * 0.25;
        const target = nearest(latest.current.snaps, projected);
        content.style.cursor = "";
        content.scrollTo({ left: latest.current.snaps[target], behavior: latest.current.reduced ? "auto" : "smooth" });
        // Restore snapping once the smooth scroll settles.
        window.setTimeout(() => {
          content.style.scrollSnapType = "";
          content.style.scrollBehavior = "";
        }, 450);
        setTick((t) => t + 1);
        // The click that ends a drag fires before this timer, so only that one is swallowed.
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      },
    },
    { axis: "x", enabled: draggable },
  );

  const ctx = React.useMemo<CarouselContextValue>(
    () => ({
      contentRef,
      index,
      snaps,
      canPrev: loop ? snaps.length > 1 : !edges.start,
      canNext: loop ? snaps.length > 1 : !edges.end,
      scrollTo,
      prev: () => step(-1),
      next: () => step(1),
      align,
      autoplayMs,
      playing,
      running: autoplayActive,
      setPlaying,
      tick,
      reduced,
      dragProps: {
        onClickCapture: (event) => {
          // A drag ends with a click on the slide under the pointer; swallow it.
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
          }
          dragged.current = false;
        },
      },
    }),
    [index, snaps, loop, edges, scrollTo, step, align, autoplayMs, playing, autoplayActive, setPlaying, tick, reduced],
  );

  return (
    <CarouselContext.Provider value={ctx}>
      <section
        ref={ref}
        aria-roledescription="carousel"
        data-align={align}
        data-effect={effect}
        {...props}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          const target = event.target as HTMLElement;
          if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
          if (event.key === "ArrowRight") step(1);
          else if (event.key === "ArrowLeft") step(-1);
          else return;
          event.preventDefault();
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHovered(false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if ((event.target as HTMLElement).matches(":focus-visible")) setFocusWithin(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
        }}
        className={cn(blockReset, "group/carousel relative", className)}
      >
        {children}
        <span aria-live={autoplayActive ? "off" : "polite"} aria-atomic="true" className={cn(blockReset, "sr-only")}>
          {slideLabel(index + 1, snaps.length)}
        </span>
      </section>
    </CarouselContext.Provider>
  );
});

/** The scroll-snap track. Set the gap with a gap-* class and the slide width on each CarouselItem. */
export const CarouselContent = React.forwardRef<HTMLDivElement, CarouselContentProps>(function CarouselContent(
  { className, onClickCapture, ...props },
  ref,
) {
  const carousel = useCarousel("CarouselContent");
  const merged = React.useMemo(() => mergeRefs(carousel.contentRef, ref), [carousel.contentRef, ref]);
  return (
    <div
      ref={merged}
      tabIndex={0}
      {...props}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        carousel.dragProps.onClickCapture(event);
      }}
      className={cn(
        blockReset,
        "relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-pui-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        carousel.reduced ? undefined : "scroll-smooth",
        focusRing,
        className,
      )}
    />
  );
});

/** One slide. The default width is the full track; use basis-* classes for several per view. */
export const CarouselItem = React.forwardRef<HTMLDivElement, CarouselItemProps>(function CarouselItem(
  { className, children, ...props },
  ref,
) {
  const carousel = useCarousel("CarouselItem");
  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      data-carousel-item=""
      data-auto-label={props["aria-label"] || props["aria-labelledby"] ? undefined : ""}
      {...props}
      className={cn(
        blockReset,
        "min-w-0 shrink-0 grow-0 basis-full",
        carousel.align === "center" ? "snap-center" : "snap-start",
        className,
      )}
    >
      <div className={cn(blockReset, "h-full origin-center transition-[transform,opacity] duration-75 ease-linear")}>{children}</div>
    </div>
  );
});

const navButton =
  "absolute top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-pui-border bg-pui-surface/90 text-pui-surface-foreground shadow-pui-md backdrop-blur-md transition-[opacity,background-color,scale] duration-(--pui-duration-fast) hover:bg-pui-surface active:scale-95 disabled:pointer-events-none disabled:opacity-0 [&_svg]:size-4";

/** Previous button, centered on the start edge by default. */
export const CarouselPrevious = React.forwardRef<HTMLButtonElement, CarouselButtonProps>(function CarouselPrevious(
  { className, children, onClick, ...props },
  ref,
) {
  const carousel = useCarousel("CarouselPrevious");
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Previous slide"
      disabled={!carousel.canPrev}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.prev();
      }}
      className={cn(controlReset, navButton, "left-2", focusRing, className)}
    >
      {children ?? <ChevronLeftIcon aria-hidden="true" />}
    </button>
  );
});

/** Next button, centered on the end edge by default. */
export const CarouselNext = React.forwardRef<HTMLButtonElement, CarouselButtonProps>(function CarouselNext(
  { className, children, onClick, ...props },
  ref,
) {
  const carousel = useCarousel("CarouselNext");
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Next slide"
      disabled={!carousel.canNext}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.next();
      }}
      className={cn(controlReset, navButton, "right-2", focusRing, className)}
    >
      {children ?? <ChevronRightIcon aria-hidden="true" />}
    </button>
  );
});

/**
 * One dot per snap point. The active dot stretches into a pill on a spring; while autoplaying it
 * fills like a progress bar. Includes the required pause button when autoplay is on.
 */
export const CarouselDots = React.forwardRef<HTMLDivElement, CarouselDotsProps>(function CarouselDots(
  { dotLabel = "Go to slide", showPlayPause = true, pauseLabel = "Pause autoplay", playLabel = "Start autoplay", className, ...props },
  ref,
) {
  const carousel = useCarousel("CarouselDots");
  const { snaps, index, autoplayMs, playing, running, reduced } = carousel;
  if (snaps.length < 2 && !autoplayMs) return null;
  return (
    <div ref={ref} {...props} className={cn(blockReset, "flex items-center justify-center gap-1", className)}>
      {autoplayMs && showPlayPause ? (
        <button
          type="button"
          aria-label={playing ? pauseLabel : playLabel}
          aria-pressed={!playing}
          onClick={() => carousel.setPlaying(!playing)}
          className={cn(
            controlReset,
            "me-1 grid size-6 cursor-pointer place-items-center rounded-full text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
            focusRing,
          )}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3">
            {playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            ) : (
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            )}
          </svg>
        </button>
      ) : null}
      {snaps.map((_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${dotLabel} ${i + 1}`}
            aria-current={active ? "true" : undefined}
            onClick={() => carousel.scrollTo(i)}
            className={cn(controlReset, "group/dot grid h-6 cursor-pointer place-items-center px-0.5", focusRing, "rounded-full")}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ width: active ? 24 : 8 }}
              transition={reduced ? { duration: 0 } : springs.snappy}
              className={cn(
                blockReset,
                "relative block h-2 overflow-hidden rounded-full transition-colors duration-(--pui-duration-base)",
                active ? "bg-pui-primary/30" : "bg-pui-border group-hover/dot:bg-pui-muted-foreground",
              )}
            >
              {active ? (
                <motion.span
                  key={`${index}-${carousel.tick}-${running ? "r" : "s"}`}
                  className={cn(blockReset, "absolute inset-0 origin-left rounded-full bg-pui-primary")}
                  initial={running && !reduced ? { scaleX: 0 } : false}
                  animate={{ scaleX: 1 }}
                  transition={running && !reduced ? { duration: (autoplayMs ?? 0) / 1000, ease: "linear" } : { duration: 0 }}
                />
              ) : null}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
});
