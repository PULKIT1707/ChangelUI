"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
/** A point of interest, positioned in percent of the media box so it survives any resize. */
export interface Hotspot {
  id: string;
  /** 0-100 from the left edge. */
  x: number;
  /** 0-100 from the top edge. */
  y: number;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Accessible name of the marker. Default: title when it is a string, else "Point {n}". */
  label?: string;
  /** Extra content under the body (price, link, button). */
  footer?: React.ReactNode;
}
export interface ImageHotspotsProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange"> {
  spots: readonly Hotspot[];
  /** Image source. Pass children instead for any other media (SVG, video poster, live UI). */
  src?: string;
  /** Required with src. */
  alt?: string;
  /** Open spot id. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  /** Numbers in the markers (for step-by-step walkthroughs) instead of plus signs. Default false. */
  numbered?: boolean;
  /** Breathing ring on idle markers. Default true. */
  pulse?: boolean;
  /** Prev / next and "n of total" in the card. Default true. */
  stepper?: boolean;
  /** Media box aspect ratio, e.g. "16 / 10". Default: the media's own size. */
  aspectRatio?: string;
  /** Card width in px. Default 256. */
  cardWidth?: number;
  /** Name of the whole figure. Default: alt. */
  label?: string;
  /** Default "primary". */
  tone?: Tone;
}
/**
 * Annotated image: markers pulse until opened, each opens a card anchored beside it (flipping to
 * stay inside the frame, all in CSS percentages, so resizes never misplace it), other markers dim,
 * and arrows step through the points like a guided walkthrough. Escape or a click outside closes.
 */
export const ImageHotspots = React.forwardRef<HTMLDivElement, ImageHotspotsProps>(function ImageHotspots(
  {
    spots,
    src,
    alt,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    numbered = false,
    pulse = true,
    stepper = true,
    aspectRatio,
    cardWidth = 256,
    label,
    tone = "primary",
    children,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const uid = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const markers = React.useRef(new Map<string, HTMLButtonElement>());
  const [active, setActive] = useControllableState<string | null>({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const [seen, setSeen] = React.useState<ReadonlySet<string>>(() => new Set());
  const index = spots.findIndex((s) => s.id === active);
  const current = index === -1 ? undefined : spots[index];
  useClickOutside(rootRef, () => setActive(null), { enabled: current !== undefined });
  const nameOf = (s: Hotspot, i: number) => s.label ?? (typeof s.title === "string" ? s.title : `Point ${i + 1}`);
  const open = (id: string | null, focus = false) => {
    setActive(id);
    if (id) {
      setSeen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      if (focus) markers.current.get(id)?.focus();
    }
  };
  const step = (delta: number, focus: boolean) => {
    if (spots.length === 0) return;
    const from = index === -1 ? (delta > 0 ? -1 : 0) : index;
    const next = spots[(from + delta + spots.length) % spots.length];
    if (next) open(next.id, focus);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && current) {
      event.preventDefault();
      const id = current.id;
      open(null);
      markers.current.get(id)?.focus();
      return;
    }
    const inMarker = (event.target as HTMLElement).hasAttribute("data-pui-hotspot");
    if (!inMarker) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      step(1, true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1, true);
    }
  };
  const t = reduced ? { duration: 0 } : springs.layout;
  return (
    <div
      ref={refs}
      role="group"
      aria-label={label ?? alt}
      data-tone={tone}
      data-state={current ? "open" : "closed"}
      {...props}
      className={cn(blockReset, "relative isolate w-full", toneClasses[tone], className)}
      style={{ aspectRatio, ...style }}
    >
      <div className={cn(blockReset, "relative size-full overflow-hidden rounded-pui-xl [&>img]:block [&>img]:size-full [&>img]:object-cover [&>svg]:block [&>svg]:size-full")}>
        {children ?? (src ? <img src={src} alt={alt ?? ""} draggable={false} className={cn(blockReset, "block size-full object-cover select-none")} /> : null)}
        <motion.span
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute inset-0 block bg-pui-background")}
          initial={false}
          animate={{ opacity: current ? 0.28 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.25 }}
        />
      </div>
      {spots.map((s, i) => {
        const on = s.id === active;
        const dim = current !== undefined && !on;
        const x = Math.min(100, Math.max(0, s.x));
        const y = Math.min(100, Math.max(0, s.y));
        const cardId = `${uid}-card-${i}`;
        // Open toward the roomier side so the card stays inside the frame.
        const right = x <= 55;
        const below = y <= 50;
        return (
          <React.Fragment key={s.id}>
            <button
              ref={(el) => {
                if (el) markers.current.set(s.id, el);
                else markers.current.delete(s.id);
              }}
              type="button"
              data-pui-hotspot=""
              data-active={on ? "" : undefined}
              aria-expanded={on}
              aria-controls={on ? cardId : undefined}
              aria-label={`${nameOf(s, i)}${numbered ? `, step ${i + 1} of ${spots.length}` : ""}`}
              onClick={() => open(on ? null : s.id)}
              onKeyDown={onKeyDown}
              className={cn(
                controlReset,
                focusRing,
                "absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition-opacity duration-(--pui-duration-base)",
                dim && "opacity-55 hover:opacity-100 focus-visible:opacity-100",
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {pulse && !reduced && !on && !seen.has(s.id) ? (
                <motion.span
                  aria-hidden="true"
                  className={cn(blockReset, "absolute inset-1 block rounded-full bg-(--pui-tone)")}
                  initial={{ scale: 1, opacity: 0.55 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: i * 0.25 }}
                />
              ) : null}
              <motion.span
                aria-hidden="true"
                className={cn(
                  blockReset,
                  "relative grid size-6 place-items-center rounded-full border-2 border-pui-background bg-(--pui-tone) text-[11px] font-semibold text-(--pui-tone-fg) shadow-pui-md",
                )}
                initial={false}
                animate={{ scale: on ? 1.12 : 1, rotate: on && !numbered && !reduced ? 45 : 0 }}
                transition={reduced ? { duration: 0 } : springs.snappy}
              >
                {numbered ? i + 1 : <PlusIcon className={cn(blockReset, "size-3.5")} strokeWidth={2.75} />}
              </motion.span>
            </button>
            <AnimatePresence>
              {on ? (
                <motion.div
                  key={s.id}
                  id={cardId}
                  role="region"
                  aria-label={nameOf(s, i)}
                  className={cn(
                    blockReset,
                    "absolute z-20 flex max-w-[calc(100%-1rem)] flex-col gap-1.5 rounded-pui-lg border border-pui-border bg-pui-surface p-3.5 text-left text-pui-surface-foreground shadow-pui-lg",
                  )}
                  style={{
                    width: cardWidth,
                    left: right ? `calc(${x}% + 22px)` : undefined,
                    right: right ? undefined : `calc(${100 - x}% + 22px)`,
                    top: below ? `calc(${y}% - 18px)` : undefined,
                    bottom: below ? undefined : `calc(${100 - y}% - 18px)`,
                    transformOrigin: `${right ? "left" : "right"} ${below ? "top" : "bottom"}`,
                  }}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, x: right ? -6 : 6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                  transition={t}
                >
                  <div className={cn(blockReset, "flex items-start justify-between gap-2")}>
                    <p className={cn(blockReset, "text-sm leading-5 font-semibold")}>{s.title}</p>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => open(null, true)}
                      onKeyDown={onKeyDown}
                      className={cn(
                        controlReset,
                        focusRing,
                        "-mt-1 -mr-1.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-pui-sm text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground",
                      )}
                    >
                      <XIcon className={cn(blockReset, "size-3.5")} aria-hidden="true" />
                    </button>
                  </div>
                  {s.body ? <div className={cn(blockReset, "text-xs leading-5 text-pui-muted-foreground")}>{s.body}</div> : null}
                  {s.footer ? <div className={cn(blockReset, "pt-1")}>{s.footer}</div> : null}
                  {stepper && spots.length > 1 ? (
                    <div className={cn(blockReset, "mt-1 flex items-center justify-between gap-2 border-t border-pui-border pt-2")}>
                      <span className={cn(blockReset, "text-[11px] text-pui-muted-foreground tabular-nums")}>
                        {i + 1} of {spots.length}
                      </span>
                      <span className={cn(blockReset, "flex gap-1")}>
                        <button
                          type="button"
                          aria-label="Previous point"
                          onClick={() => step(-1, true)}
                          onKeyDown={onKeyDown}
                          className={cn(
                            controlReset,
                            focusRing,
                            "grid size-7 cursor-pointer place-items-center rounded-pui-sm border border-pui-border hover:bg-pui-muted",
                          )}
                        >
                          <ChevronLeftIcon className={cn(blockReset, "size-3.5")} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next point"
                          onClick={() => step(1, true)}
                          onKeyDown={onKeyDown}
                          className={cn(
                            controlReset,
                            focusRing,
                            "grid size-7 cursor-pointer place-items-center rounded-pui-sm border border-pui-border hover:bg-pui-muted",
                          )}
                        >
                          <ChevronRightIcon className={cn(blockReset, "size-3.5")} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </React.Fragment>
        );
      })}
    </div>
  );
});
