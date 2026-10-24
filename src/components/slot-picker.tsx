"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronRightIcon, ClockIcon, GlobeIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
/** A bookable start time. Strings are shorthand for an available slot. */
export interface BookingSlot {
  /** ISO 8601 instant, e.g. "2026-10-27T09:30:00Z". Also the slot's value. */
  start: string;
  /** false shows the time as taken. Default true. */
  available?: boolean;
}
export type SlotPeriod = "morning" | "afternoon" | "evening";
export interface SlotPickerProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange"> {
  slots: readonly (string | BookingSlot)[];
  /** Extra days to show even when they have no slots ("YYYY-MM-DD" in the time zone). */
  days?: readonly string[];
  /** Picked slot start. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (start: string | null) => void;
  /** Shown day ("YYYY-MM-DD"). Default: the picked slot's day, else the first day with open slots. */
  day?: string;
  defaultDay?: string;
  onDayChange?: (day: string) => void;
  /** IANA zone for every label and the day grouping. Default: the visitor's zone (UTC on the server). */
  timeZone?: string;
  /** Default "en-US". */
  locale?: string;
  /** 12-hour clock. Default: the locale's preference. */
  hour12?: boolean;
  /** Meeting length in minutes; adds the end time to the summary. */
  duration?: number;
  /** Called by the confirm button; a returned promise shows a pending state, then the confirmed state. */
  onConfirm?: (start: string) => void | Promise<unknown>;
  /** Default "Confirm". */
  confirmLabel?: string;
  /** Default "Booked". */
  confirmedLabel?: string;
  /** Height of the times area in px; it scrolls instead of resizing between days. Default 232. */
  height?: number;
  /** Default { morning: "Morning", afternoon: "Afternoon", evening: "Evening" }. */
  periodLabels?: Partial<Record<SlotPeriod, string>>;
  /** Accessible name for the day list. Default "Day". */
  dayListLabel?: string;
  /** Default "primary". */
  tone?: Tone;
  disabled?: boolean;
}
interface Parsed {
  start: string;
  ms: number;
  available: boolean;
  day: string;
  hour: number;
}
const PERIODS: SlotPeriod[] = ["morning", "afternoon", "evening"];
const PERIOD_LABELS: Record<SlotPeriod, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const periodOf = (hour: number): SlotPeriod => (hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening");
function dayKey(ms: number, timeZone: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(ms);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}
/** Noon UTC of a "YYYY-MM-DD" day, safe to format in any zone without shifting the date. */
const noonUTC = (day: string) => Date.parse(`${day}T12:00:00Z`);
/**
 * Booking time picker. Day chips carry how many times are open, so empty days are obvious before
 * a click; times are grouped into morning, afternoon and evening in the visitor's zone; the times
 * area keeps one height between days; and a summary bar turns the pick into a confirm button that
 * morphs through pending into booked. Empty days offer a jump to the next open day.
 */
export const SlotPicker = React.forwardRef<HTMLDivElement, SlotPickerProps>(function SlotPicker(
  {
    slots,
    days: extraDays,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    day: dayProp,
    defaultDay,
    onDayChange,
    timeZone: zoneProp,
    locale = "en-US",
    hour12,
    duration,
    onConfirm,
    confirmLabel = "Confirm",
    confirmedLabel = "Booked",
    height = 232,
    periodLabels,
    dayListLabel = "Day",
    tone = "primary",
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  // The server cannot know the visitor's zone, so it renders UTC and the client switches after hydration.
  const timeZone = zoneProp ?? (isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  const uid = React.useId();
  const parsed = React.useMemo<Parsed[]>(() => {
    const out: Parsed[] = [];
    for (const s of slots) {
      const slot = typeof s === "string" ? { start: s } : s;
      const ms = Date.parse(slot.start);
      if (!Number.isFinite(ms)) continue;
      out.push({ start: slot.start, ms, available: slot.available !== false, ...dayKey(ms, timeZone) });
    }
    return out.sort((a, b) => a.ms - b.ms);
  }, [slots, timeZone]);
  const dayList = React.useMemo(() => [...new Set([...parsed.map((p) => p.day), ...(extraDays ?? [])])].sort(), [parsed, extraDays]);
  const openCount = (d: string) => parsed.filter((p) => p.day === d && p.available).length;
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const picked = parsed.find((p) => p.start === value) ?? null;
  const fallbackDay = picked?.day ?? dayList.find((d) => openCount(d) > 0) ?? dayList[0] ?? "";
  const [dayState, setDay] = useControllableState<string | undefined>({ value: dayProp, defaultValue: defaultDay, onChange: (d) => d && onDayChange?.(d), name: "day" });
  const day = dayState && dayList.includes(dayState) ? dayState : fallbackDay;
  const [phase, setPhase] = React.useState<"idle" | "pending" | "done">("idle");
  const [message, setMessage] = React.useState("");
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const timesRef = React.useRef<HTMLDivElement>(null);
  const timeFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit", hour12 }), [locale, timeZone, hour12]);
  const weekdayFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }), [locale]);
  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric" }), [locale]);
  const longFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }), [locale]);
  const shortFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }), [locale]);
  const zoneName = React.useMemo(() => {
    const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "shortOffset" }).formatToParts(parsed[0]?.ms ?? 0).find((p) => p.type === "timeZoneName");
    return `${timeZone.replace(/_/g, " ")}${part ? ` (${part.value})` : ""}`;
  }, [locale, timeZone, parsed]);
  const daySlots = parsed.filter((p) => p.day === day);
  const nextOpen = dayList.find((d) => d > day && openCount(d) > 0);
  const range = (p: Parsed) => (duration ? `${timeFmt.format(p.ms)} – ${timeFmt.format(p.ms + duration * 60_000)}` : timeFmt.format(p.ms));
  const chooseDay = (d: string, focus = false) => {
    setDay(d);
    if (focus) tabRefs.current[dayList.indexOf(d)]?.focus();
    if (timesRef.current) timesRef.current.scrollTop = 0;
  };
  const choose = (p: Parsed) => {
    if (disabled || !p.available || phase === "pending") return;
    const next = value === p.start ? null : p.start;
    setValue(next);
    setPhase("idle");
    setMessage(next ? `${shortFmt.format(noonUTC(p.day))}, ${range(p)} selected` : "Selection cleared");
  };
  const confirm = () => {
    if (!picked || phase !== "idle") return;
    const result = onConfirm?.(picked.start);
    const label = `${shortFmt.format(noonUTC(picked.day))}, ${range(picked)}`;
    if (result instanceof Promise) {
      setPhase("pending");
      result.then(
        () => {
          setPhase("done");
          setMessage(`${confirmedLabel}: ${label}`);
        },
        () => {
          setPhase("idle");
          setMessage("Could not book that time. Try again.");
        },
      );
    } else {
      setPhase("done");
      setMessage(`${confirmedLabel}: ${label}`);
    }
  };
  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = dayList.length;
    const target =
      event.key === "ArrowRight" ? (index + 1) % n : event.key === "ArrowLeft" ? (index - 1 + n) % n : event.key === "Home" ? 0 : event.key === "End" ? n - 1 : -1;
    if (target === -1) return;
    event.preventDefault();
    const d = dayList[target];
    if (d) chooseDay(d, true);
  };
  const timeButtons = () => Array.from(timesRef.current?.querySelectorAll<HTMLButtonElement>("button[data-slot]:not(:disabled)") ?? []);
  const onTimeKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 };
    const step = keys[event.key];
    const list = timeButtons();
    const at = list.indexOf(event.currentTarget);
    let target = -1;
    if (step !== undefined) target = Math.min(list.length - 1, Math.max(0, at + step));
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = list.length - 1;
    if (target === -1 || at === -1) return;
    event.preventDefault();
    list[target]?.focus();
  };
  const firstOpen = daySlots.find((p) => p.available)?.start;
  const timeTabStop = picked && picked.day === day ? picked.start : firstOpen;
  const panelId = `${uid}-panel`;
  const labels = { ...PERIOD_LABELS, ...periodLabels };
  const t = reduced ? { duration: 0 } : springs.snappy;
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col text-pui-foreground", toneClasses[tone], disabled && "pointer-events-none opacity-60", className)}
    >
      <div
        role="tablist"
        aria-label={dayListLabel}
        className={cn(blockReset, "-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]")}
      >
        {dayList.map((d, i) => {
          const selected = d === day;
          const open = openCount(d);
          const noon = noonUTC(d);
          return (
            <button
              key={d}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${d}`}
              aria-selected={selected}
              aria-controls={panelId}
              aria-label={`${longFmt.format(noon)}, ${open === 0 ? "no times" : `${open} ${open === 1 ? "time" : "times"} open`}`}
              tabIndex={selected ? 0 : -1}
              data-open={open}
              onClick={() => chooseDay(d)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                controlReset,
                focusRing,
                "relative isolate flex h-[4.5rem] w-16 shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-0.5 rounded-pui-lg border text-center transition-colors duration-(--pui-duration-fast)",
                selected ? "border-transparent text-(--pui-tone-fg)" : "border-pui-border hover:bg-pui-muted/60",
                open === 0 && !selected && "text-pui-muted-foreground",
              )}
            >
              {selected ? (
                <motion.span
                  aria-hidden="true"
                  layoutId={`${uid}-day`}
                  transition={t}
                  className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-lg bg-(--pui-tone) shadow-pui-sm")}
                />
              ) : null}
              <span className={cn(blockReset, "text-[11px] leading-4 font-medium tracking-wide uppercase opacity-80")}>{weekdayFmt.format(noon)}</span>
              <span className={cn(blockReset, "text-lg leading-6 font-semibold tabular-nums")}>{dateFmt.format(noon)}</span>
              <span
                aria-hidden="true"
                className={cn(
                  blockReset,
                  "text-[11px] leading-4 tabular-nums",
                  selected ? "opacity-85" : open === 0 ? "opacity-70" : open <= 2 ? "text-pui-warning-text" : "text-pui-muted-foreground",
                )}
              >
                {open === 0 ? "Full" : `${open} open`}
              </span>
            </button>
          );
        })}
      </div>
      <div
        ref={timesRef}
        role="tabpanel"
        id={panelId}
        aria-labelledby={day ? `${uid}-tab-${day}` : undefined}
        className={cn(blockReset, "relative mt-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]")}
        style={{ height }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${day}|${timeZone}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: reduced ? 0 : durations.fast } }}
            transition={reduced ? { duration: 0 } : { duration: durations.base, ease: easings.out }}
            className={cn(blockReset, "flex flex-col gap-4")}
          >
            {daySlots.some((p) => p.available) ? (
              PERIODS.map((period) => {
                const group = daySlots.filter((p) => periodOf(p.hour) === period);
                if (group.length === 0) return null;
                const headId = `${uid}-${period}`;
                return (
                  <section key={period} aria-labelledby={headId} className={cn(blockReset, "flex flex-col gap-2")}>
                    <h4 id={headId} className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>
                      {labels[period]}
                    </h4>
                    <div className={cn(blockReset, "grid grid-cols-3 gap-1.5")}>
                      {group.map((p) => {
                        const on = p.start === value;
                        return (
                          <button
                            key={p.start}
                            type="button"
                            data-slot=""
                            aria-pressed={on}
                            disabled={!p.available}
                            aria-label={`${timeFmt.format(p.ms)}${p.available ? "" : ", taken"}`}
                            tabIndex={p.start === timeTabStop ? 0 : -1}
                            onClick={() => choose(p)}
                            onKeyDown={onTimeKey}
                            className={cn(
                              controlReset,
                              focusRing,
                              "relative isolate h-9 cursor-pointer rounded-pui-md border text-sm font-medium tabular-nums transition-colors duration-(--pui-duration-fast)",
                              on ? "border-transparent text-(--pui-tone-fg)" : "border-pui-border hover:border-(--pui-tone)/50 hover:bg-(--pui-tone)/6",
                              !p.available && "cursor-not-allowed border-dashed text-pui-muted-foreground line-through decoration-pui-muted-foreground/60",
                            )}
                          >
                            {on ? (
                              <motion.span
                                aria-hidden="true"
                                layoutId={`${uid}-time`}
                                transition={t}
                                className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-md bg-(--pui-tone)")}
                              />
                            ) : null}
                            {timeFmt.format(p.ms)}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className={cn(blockReset, "flex flex-col items-center justify-center gap-3 py-8 text-center")} style={{ minHeight: height - 16 }}>
                <span className={cn(blockReset, "grid size-10 place-items-center rounded-full bg-pui-muted text-pui-muted-foreground")} aria-hidden="true">
                  <ClockIcon className={cn(blockReset, "size-5")} />
                </span>
                <p className={cn(blockReset, "text-sm text-pui-muted-foreground")}>No open times on {day ? longFmt.format(noonUTC(day)) : "this day"}.</p>
                {nextOpen ? (
                  <button
                    type="button"
                    onClick={() => chooseDay(nextOpen, true)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "inline-flex h-8 cursor-pointer items-center gap-1 rounded-pui-full bg-(--pui-tone)/10 px-3 text-xs font-medium text-(--pui-tone-text) hover:bg-(--pui-tone)/16",
                    )}
                  >
                    Next open: {shortFmt.format(noonUTC(nextOpen))}
                    <ChevronRightIcon className={cn(blockReset, "size-3.5")} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={cn(blockReset, "mt-3 flex min-h-12 items-center gap-3 border-t border-pui-border pt-3")}>
        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
          <span className={cn(blockReset, "truncate text-sm font-medium")} data-pui-slot-summary="">
            {picked ? `${shortFmt.format(noonUTC(picked.day))} · ${range(picked)}` : "Pick a time"}
          </span>
          <span className={cn(blockReset, "flex items-center gap-1 truncate text-xs text-pui-muted-foreground")}>
            <GlobeIcon className={cn(blockReset, "size-3 shrink-0")} aria-hidden="true" />
            <span className={cn(blockReset, "truncate")}>{zoneName}</span>
          </span>
        </div>
        <motion.button
          type="button"
          layout={!reduced}
          transition={t}
          disabled={!picked || phase === "pending"}
          aria-disabled={phase === "done" || undefined}
          onClick={confirm}
          data-phase={phase}
          className={cn(
            controlReset,
            focusRing,
            "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-pui-full px-4 text-sm font-medium whitespace-nowrap",
            phase === "done"
              ? "bg-pui-success text-pui-success-foreground"
              : "bg-(--pui-tone) text-(--pui-tone-fg) shadow-[inset_0_1px_0_var(--pui-solid-highlight),var(--pui-shadow-xs)] hover:bg-(--pui-tone)/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={phase}
              className={cn(blockReset, "inline-flex items-center gap-1.5")}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={reduced ? { duration: 0 } : springs.snappy}
            >
              {phase === "pending" ? (
                <>
                  <span aria-hidden="true" className={cn(blockReset, "block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none")} />
                  Booking
                </>
              ) : phase === "done" ? (
                <>
                  <CheckIcon className={cn(blockReset, "size-4")} aria-hidden="true" />
                  {confirmedLabel}
                </>
              ) : (
                confirmLabel
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
    </div>
  );
});
