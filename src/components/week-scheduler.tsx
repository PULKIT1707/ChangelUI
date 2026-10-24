"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../lib/icons";
import { durations, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { useMinuteClock } from "../lib/use-minute-clock";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Default "primary". */
  tone?: Tone;
  /** Second line, e.g. a room or a guest. */
  description?: string;
  /** Can't be moved, resized, renamed or deleted. */
  readOnly?: boolean;
}

export interface WeekSchedulerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  events?: ScheduleEvent[];
  defaultEvents?: ScheduleEvent[];
  onEventsChange?: (events: ScheduleEvent[]) => void;
  /** Any day in the week to show (defaultDate, onDateChange). Default: today, on the client. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** 0 = Sunday, 1 = Monday. Default 1. */
  weekStartsOn?: 0 | 1;
  /** 7: full week, 5: work week (both start on weekStartsOn). 3 or 1: a short range starting at `date`, for narrow screens. Default 7. */
  days?: 1 | 3 | 5 | 7;
  /** First visible hour. Default 7. */
  dayStart?: number;
  /** Last visible hour (exclusive end). Default 20. */
  dayEnd?: number;
  /** Snap and keyboard step in minutes. Default 15. */
  step?: number;
  /** Length of a clicked (not dragged) new event, in minutes. Default 30. */
  defaultDuration?: number;
  /** px per hour. Default 48. */
  hourHeight?: number;
  /** Max height of the scrolling grid in px. Default 520. */
  height?: number;
  /** No creating, moving, resizing, renaming or deleting. */
  readOnly?: boolean;
  /** Default "New event". */
  newEventTitle?: string;
  /** Adjust a new event before it is added; return false to cancel it. */
  onEventCreate?: (event: ScheduleEvent) => ScheduleEvent | false | void;
  onEventClick?: (event: ScheduleEvent) => void;
  /** Reference time for the now line (ms). Default: the client clock. */
  now?: number;
  /** Prev / Today / Next and the range label. Default true. */
  showNav?: boolean;
  locale?: string;
}

const MIN = 60_000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const addDays = (ms: number, n: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()).getTime();
};
const atMinutes = (dayMs: number, minutes: number) => {
  const d = new Date(dayMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes).getTime();
};
const minutesOf = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Midnight of the first day of the week that contains `date`. */
export function weekStart(date: Date | number, weekStartsOn: 0 | 1 = 1): Date {
  const ms = startOfDay(typeof date === "number" ? date : date.getTime());
  const dow = new Date(ms).getDay();
  return new Date(addDays(ms, -((dow - weekStartsOn + 7) % 7)));
}

export interface ScheduleSegment {
  event: ScheduleEvent;
  /** Minutes from midnight, clipped to the day. */
  top: number;
  bottom: number;
  column: number;
  columns: number;
}

/** Lays out one day's events: clips to the day, then splits overlapping clusters into side-by-side columns. */
export function layoutDay(events: ScheduleEvent[], dayMs: number): ScheduleSegment[] {
  const dayEndMs = addDays(dayMs, 1);
  const segs = events
    .filter((e) => e.start.getTime() < dayEndMs && e.end.getTime() > dayMs)
    .map((event) => ({
      event,
      top: event.start.getTime() <= dayMs ? 0 : minutesOf(event.start.getTime()),
      bottom: event.end.getTime() >= dayEndMs ? 1440 : minutesOf(event.end.getTime()),
      column: 0,
      columns: 1,
    }))
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);
  let cluster: ScheduleSegment[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols: number[] = [];
    for (const s of cluster) {
      let c = cols.findIndex((end) => end <= s.top);
      if (c === -1) {
        c = cols.length;
        cols.push(s.bottom);
      } else cols[c] = s.bottom;
      s.column = c;
    }
    for (const s of cluster) s.columns = cols.length;
    cluster = [];
  };
  for (const s of segs) {
    if (s.top >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.bottom);
  }
  flush();
  return segs;
}

type DragKind = "create" | "move" | "start" | "end";
interface Drag {
  kind: DragKind;
  id: string;
  pointerId: number;
  originX: number;
  originY: number;
  moved: boolean;
  /** create: anchor minute; move: grab offset in minutes. */
  anchor: number;
  anchorDay: number;
  duration: number;
  start: number;
  end: number;
  locked: boolean;
}

const DRAFT_ID = "__pui-new__";
/** Overlaps cascade once each would get less than this many px side by side. */
const CASCADE_BELOW = 110;
/** Inset per cascaded overlap, px. */
const CASCADE_OFFSET = 14;
/** Narrowest an event gets (or the column, if narrower), px. */
const MIN_EVENT_WIDTH = 72;
const PEEK_WIDTH = 224;
const PEEK_DELAY = 350;

/**
 * A week you can draw on: drag across empty time to create an event (it opens for a title right
 * away), drag an event to move it across hours and days, drag its edges to resize, all snapped to
 * `step`. Overlapping events sit side by side, a now line marks the current minute, and the grid
 * scrolls to working hours. Keyboard: Add event creates one at the next free slot; on an event,
 * arrows move it by step or a day, Shift+arrows resize, Enter renames, Delete removes, each
 * change announced. The ref goes to the root.
 */
export const WeekScheduler = React.forwardRef<HTMLDivElement, WeekSchedulerProps>(function WeekScheduler(
  {
    events: eventsProp,
    defaultEvents,
    onEventsChange,
    date: dateProp,
    defaultDate,
    onDateChange,
    weekStartsOn = 1,
    days = 7,
    dayStart = 7,
    dayEnd = 20,
    step = 15,
    defaultDuration = 30,
    hourHeight = 48,
    height = 520,
    readOnly = false,
    newEventTitle = "New event",
    onEventCreate,
    onEventClick,
    now: nowProp,
    showNav = true,
    locale,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const clock = useMinuteClock();
  const now = nowProp ?? clock;
  const [events, setEvents] = useControllableState<ScheduleEvent[]>({ value: eventsProp, defaultValue: () => defaultEvents ?? [], onChange: onEventsChange, name: "events" });
  const [anchorState, setAnchorState] = React.useState<number | null>(() => defaultDate?.getTime() ?? null);
  // The server and the hydration pass render an empty week, so zones and clocks can't mismatch.
  const isClient = useIsClient();
  const anchor = isClient ? (dateProp?.getTime() ?? anchorState ?? now) : null;
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const dragRef = useLatestRef(drag);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const eventRefs = React.useRef(new Map<string, HTMLDivElement>());
  const focusAfter = React.useRef<string | null>(null);
  const editInput = React.useRef<HTMLInputElement | null>(null);

  const firstMin = dayStart * 60;
  const lastMin = dayEnd * 60;
  const pxPerMin = hourHeight / 60;
  const gridHeight = (lastMin - firstMin) * pxPerMin;
  const snap = (m: number) => Math.round(m / step) * step;

  // Full and work weeks start on weekStartsOn; short ranges (1 or 3 days) start on the anchor day.
  const week = anchor === null ? null : days >= 5 ? weekStart(anchor, weekStartsOn).getTime() : startOfDay(anchor);
  const pageDays = days >= 5 ? 7 : days;
  const pageNoun = days >= 5 ? "week" : days === 1 ? "day" : `${days} days`;
  const dayList = React.useMemo(() => (week === null ? [] : Array.from({ length: days }, (_, i) => addDays(week, i))), [week, days]);

  const fmt = React.useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      dayNum: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      long: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }),
      short: new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }),
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
      hour: new Intl.DateTimeFormat(locale, { hour: "numeric" }),
      range: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }),
    }),
    [locale],
  );

  const describe = (e: { title: string; start: number; end: number }) =>
    `${e.title}, ${fmt.short.format(e.start)}, ${fmt.time.format(e.start)} to ${fmt.time.format(e.end)}`;

  // Scroll to working hours (or the now line) once the week first renders, but never past the
  // first event in range: it stays fully visible with a little padding above it.
  const scrolled = React.useRef(false);
  useIsomorphicLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolled.current || week === null) return;
    scrolled.current = true;
    const rangeEnd = addDays(week, days);
    let target = now !== null && now >= week && now < rangeEnd ? minutesOf(now) - 90 : Math.max(firstMin, 8 * 60);
    for (const e of events) {
      const s = e.start.getTime();
      const end = e.end.getTime();
      if (end <= week || s >= rangeEnd) continue;
      // Same-day events that end before the first visible hour aren't on the grid.
      if (startOfDay(end) === startOfDay(s) && minutesOf(end) <= firstMin) continue;
      target = Math.min(target, s < week ? firstMin : clamp(minutesOf(s), firstMin, lastMin));
    }
    el.scrollTop = Math.max(0, (target - firstMin) * pxPerMin - 12);
  }, [week, now, days, firstMin, lastMin, pxPerMin, events]);

  const ready = week !== null;
  // Day column width drives the overlap layout (side by side when wide, cascaded when narrow).
  const [colWidth, setColWidth] = React.useState<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => setColWidth(grid.getBoundingClientRect().width / days || null);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [days, ready]);

  // Hover / focus card with the full details, for events too small to show them.
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [peek, setPeek] = React.useState<{ id: string; left: number; top: number } | null>(null);
  const peekTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(peekTimer.current), []);
  const showPeek = (eventId: string, el: HTMLElement, delay: number) => {
    clearTimeout(peekTimer.current);
    const place = () => {
      const box = contentRef.current;
      const scroller = scrollRef.current;
      if (!box || !scroller || !el.isConnected) return;
      const c = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = r.left - c.left;
      const y = r.top - c.top;
      const left = x + r.width + 8 + PEEK_WIDTH <= c.width ? x + r.width + 8 : Math.max(4, x - 8 - PEEK_WIDTH);
      const top = clamp(y, scroller.scrollTop + 4, Math.max(scroller.scrollTop + 4, scroller.scrollTop + scroller.clientHeight - 96));
      setPeek({ id: eventId, left, top });
    };
    if (delay > 0) peekTimer.current = setTimeout(place, delay);
    else place();
  };
  const hidePeek = () => {
    clearTimeout(peekTimer.current);
    setPeek(null);
  };

  useIsomorphicLayoutEffect(() => {
    const input = editInput.current;
    if (!editing || !input) return;
    input.focus();
    input.select();
  }, [editing]);

  useIsomorphicLayoutEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    eventRefs.current.get(target)?.focus();
  });

  const commit = (next: ScheduleEvent[], message: string) => {
    setEvents(next);
    setAnnouncement(message);
  };

  const updateEvent = (eventId: string, patch: Partial<ScheduleEvent>, message?: (e: ScheduleEvent) => string) => {
    let changed: ScheduleEvent | null = null;
    const next = events.map((e) => {
      if (e.id !== eventId) return e;
      changed = { ...e, ...patch };
      return changed;
    });
    if (changed) commit(next, message ? message(changed) : "");
  };

  const createEvent = (start: number, end: number) => {
    let ev: ScheduleEvent = { id: `evt-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`, title: newEventTitle, start: new Date(start), end: new Date(end) };
    const adjusted = onEventCreate?.(ev);
    if (adjusted === false) return;
    if (adjusted) ev = adjusted;
    commit([...events, ev], `Created ${describe({ title: ev.title, start: ev.start.getTime(), end: ev.end.getTime() })}`);
    setSelected(ev.id);
    setEditing(ev.id);
  };

  const pointToSlot = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const rtl = getComputedStyle(grid).direction === "rtl";
    const x = rtl ? rect.right - clientX : clientX - rect.left;
    const day = clamp(Math.floor((x / rect.width) * days), 0, days - 1);
    const minute = firstMin + (clientY - rect.top) / pxPerMin;
    return { day, minute };
  };

  const onGridPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || week === null || event.button !== 0 || event.target !== event.currentTarget) return;
    const slot = pointToSlot(event.clientX, event.clientY);
    if (!slot) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = clamp(Math.floor(slot.minute / step) * step, firstMin, lastMin - step);
    const dayMs = dayList[slot.day] ?? week;
    setSelected(null);
    setDrag({
      kind: "create",
      id: DRAFT_ID,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
      anchor: start,
      anchorDay: slot.day,
      duration: defaultDuration,
      start: atMinutes(dayMs, start),
      end: atMinutes(dayMs, Math.min(lastMin, start + defaultDuration)),
      locked: false,
    });
  };

  const onEventPointerDown = (event: React.PointerEvent<HTMLElement>, ev: ScheduleEvent, kind: "move" | "start" | "end") => {
    if (event.button !== 0 || week === null) return;
    event.stopPropagation();
    hidePeek();
    setSelected(ev.id);
    const slot = pointToSlot(event.clientX, event.clientY);
    if (!slot) return;
    // Capture on the grid: the event may re-mount in another day column mid-drag.
    gridRef.current?.setPointerCapture(event.pointerId);
    const s = ev.start.getTime();
    const e = ev.end.getTime();
    const dayMs = dayList[slot.day] ?? week;
    const grab = slot.minute - (s - dayMs) / MIN;
    setDrag({
      kind,
      id: ev.id,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
      anchor: grab,
      anchorDay: slot.day,
      duration: (e - s) / MIN,
      start: s,
      end: e,
      locked: readOnly || ev.readOnly === true,
    });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.locked || d.pointerId !== event.pointerId || week === null) return;
    const moved = d.moved || Math.hypot(event.clientX - d.originX, event.clientY - d.originY) > 3;
    if (!moved) return;
    const slot = pointToSlot(event.clientX, event.clientY);
    if (!slot) return;
    const minute = clamp(snap(slot.minute), firstMin, lastMin);
    let { start, end } = d;
    if (d.kind === "create") {
      const dayMs = dayList[d.anchorDay] ?? week;
      const a = d.anchor;
      const lo = Math.min(a, minute);
      const hi = Math.max(a + step, minute);
      start = atMinutes(dayMs, minute < a ? lo : a);
      end = atMinutes(dayMs, minute < a ? a + step : hi);
    } else if (d.kind === "move") {
      const dayMs = dayList[slot.day] ?? week;
      const top = clamp(snap(slot.minute - d.anchor), firstMin, Math.max(firstMin, lastMin - d.duration));
      start = atMinutes(dayMs, top);
      end = start + d.duration * MIN;
    } else if (d.kind === "end") {
      const dayMs = startOfDay(d.start);
      end = Math.max(d.start + step * MIN, atMinutes(dayMs, minute));
    } else {
      const dayMs = startOfDay(d.end);
      start = Math.min(d.end - step * MIN, atMinutes(dayMs, minute));
    }
    if (start !== d.start || end !== d.end || !d.moved) setDrag({ ...d, moved: true, start, end });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== event.pointerId) return;
    setDrag(null);
    if (d.kind === "create") {
      createEvent(d.start, d.end);
      return;
    }
    const ev = events.find((e) => e.id === d.id);
    if (!ev) return;
    if (!d.moved) {
      onEventClick?.(ev);
      return;
    }
    if (d.start === ev.start.getTime() && d.end === ev.end.getTime()) return;
    updateEvent(d.id, { start: new Date(d.start), end: new Date(d.end) }, (c) => `${d.kind === "move" ? "Moved" : "Resized"} ${describe({ title: c.title, start: d.start, end: d.end })}`);
  };

  const onEventKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, ev: ScheduleEvent) => {
    if (editing === ev.id) return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      onEventClick?.(ev);
      if (!readOnly && !ev.readOnly) setEditing(ev.id);
      return;
    }
    if (event.key === "Escape") {
      setSelected(null);
      return;
    }
    if (readOnly || ev.readOnly) return;
    const s = ev.start.getTime();
    const e = ev.end.getTime();
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      const index = events.findIndex((x) => x.id === ev.id);
      commit(events.filter((x) => x.id !== ev.id), `Deleted ${ev.title}`);
      const neighbour = events[index + 1] ?? events[index - 1];
      if (neighbour) focusAfter.current = neighbour.id;
      return;
    }
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-step, 0],
      ArrowDown: [step, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    const [mins, dayShift] = d;
    if (event.shiftKey && mins !== 0) {
      const nextEnd = Math.max(s + step * MIN, e + mins * MIN);
      if (minutesOf(nextEnd) > lastMin && startOfDay(nextEnd) === startOfDay(s)) return;
      updateEvent(ev.id, { end: new Date(nextEnd) }, (c) => `Resized ${describe({ title: c.title, start: s, end: nextEnd })}`);
    } else {
      let ns = addDays(s, dayShift) + mins * MIN;
      const dur = e - s;
      const sm = minutesOf(ns);
      if (mins !== 0 && (sm < firstMin || sm + dur / MIN > lastMin || startOfDay(ns) !== startOfDay(addDays(s, dayShift)))) return;
      if (week !== null && (ns < week || ns >= addDays(week, days))) ns = s;
      if (ns === s) return;
      updateEvent(ev.id, { start: new Date(ns), end: new Date(ns + dur) }, (c) => `Moved ${describe({ title: c.title, start: ns, end: ns + dur })}`);
    }
    focusAfter.current = ev.id;
  };

  const addFromKeyboard = () => {
    if (week === null) return;
    const todayIndex = now !== null ? dayList.findIndex((d) => d === startOfDay(now)) : -1;
    const dayIndex = todayIndex === -1 ? 0 : todayIndex;
    const dayMs = dayList[dayIndex] ?? week;
    let start = todayIndex !== -1 && now !== null ? Math.ceil(minutesOf(now) / step) * step : Math.max(firstMin, 9 * 60);
    // Next slot on that day that no event covers.
    const busy = layoutDay(events, dayMs);
    for (let guard = 0; guard < 200 && start + defaultDuration <= lastMin; guard++) {
      const hit = busy.find((b) => b.top < start + defaultDuration && b.bottom > start);
      if (!hit) break;
      start = Math.ceil(hit.bottom / step) * step;
    }
    start = clamp(start, firstMin, lastMin - defaultDuration);
    createEvent(atMinutes(dayMs, start), atMinutes(dayMs, start + defaultDuration));
  };

  const finishEdit = (ev: ScheduleEvent, title: string | null) => {
    setEditing(null);
    focusAfter.current = ev.id;
    const t = title?.trim();
    if (t && t !== ev.title) updateEvent(ev.id, { title: t }, () => `Renamed to ${t}`);
  };

  const goWeek = (dir: -1 | 0 | 1) => {
    const base = anchor ?? now;
    if (base === null) return;
    const next = dir === 0 ? (now ?? base) : addDays(base, dir * pageDays);
    if (dateProp === undefined) setAnchorState(next);
    onDateChange?.(new Date(next));
  };

  // Events as shown, with the drag draft applied.
  const shown = React.useMemo(() => {
    if (!drag || !drag.moved) return events;
    if (drag.kind === "create") return [...events, { id: DRAFT_ID, title: newEventTitle, start: new Date(drag.start), end: new Date(drag.end) }];
    return events.map((e) => (e.id === drag.id ? { ...e, start: new Date(drag.start), end: new Date(drag.end) } : e));
  }, [events, drag, newEventTitle]);

  const todayMs = now !== null ? startOfDay(now) : null;
  const nowMin = now !== null ? minutesOf(now) : null;
  const rangeLabel = dayList.length > 0 ? fmt.range.formatRange(dayList[0] ?? 0, dayList[dayList.length - 1] ?? 0) : "\u00a0";
  const hours = Array.from({ length: dayEnd - dayStart }, (_, i) => dayStart + i);
  const gridTemplate = { gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` };
  const peekEvent = peek && !drag && editing !== peek.id ? (events.find((x) => x.id === peek.id) ?? null) : null;

  return (
    <div
      ref={ref}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-pui-foreground shadow-pui-xs", className)}
    >
      {showNav || !readOnly ? (
        <div className={cn(blockReset, "flex flex-wrap items-center justify-between gap-2 border-b border-pui-border px-3 py-2")}>
          {showNav ? (
            <div className={cn(blockReset, "flex items-center gap-1")}>
              <button type="button" onClick={() => goWeek(0)} className={cn(controlReset, navButton, "px-2.5")}>
                Today
              </button>
              <button type="button" aria-label={`Previous ${pageNoun}`} onClick={() => goWeek(-1)} className={cn(controlReset, navButton, "w-8 justify-center px-0")}>
                <ChevronLeftIcon className="size-4 rtl:rotate-180" />
              </button>
              <button type="button" aria-label={`Next ${pageNoun}`} onClick={() => goWeek(1)} className={cn(controlReset, navButton, "w-8 justify-center px-0")}>
                <ChevronRightIcon className="size-4 rtl:rotate-180" />
              </button>
              <h3 aria-live="polite" className={cn(blockReset, "ms-2 text-sm font-semibold text-pui-foreground tabular-nums")}>
                {rangeLabel}
              </h3>
            </div>
          ) : (
            <span className={cn(blockReset)} />
          )}
          {!readOnly ? (
            <button type="button" onClick={addFromKeyboard} disabled={week === null} className={cn(controlReset, navButton, "gap-1.5 border-transparent bg-pui-primary px-2.5 text-pui-primary-foreground hover:bg-pui-primary/90 hover:text-pui-primary-foreground")}>
              <PlusIcon className="size-3.5" />
              Add event
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={cn(blockReset, "flex border-b border-pui-border bg-pui-muted/30")}>
        <div aria-hidden="true" className={cn(blockReset, "w-14 shrink-0")} />
        <div className={cn(blockReset, "grid flex-1")} style={gridTemplate}>
          {(dayList.length > 0 ? dayList : Array.from({ length: days }, () => null)).map((d, i) => {
            const isToday = d !== null && d === todayMs;
            return (
              <div key={d ?? i} className={cn(blockReset, "flex flex-col items-center gap-0.5 border-s border-pui-border/70 py-1.5 first:border-s-0")}>
                <span className={cn(blockReset, "text-[0.6875rem] font-medium tracking-wide uppercase", isToday ? "text-pui-primary-text" : "text-pui-muted-foreground")}>
                  {d !== null ? fmt.weekday.format(d) : "\u00a0"}
                </span>
                <span
                  className={cn(
                    blockReset,
                    "flex size-7 items-center justify-center rounded-pui-full text-sm font-semibold tabular-nums",
                    isToday ? "bg-pui-primary text-pui-primary-foreground" : "text-pui-foreground",
                  )}
                >
                  {d !== null ? fmt.dayNum.format(d) : "\u00a0"}
                </span>
                {d !== null ? <span className={cn(blockReset, "sr-only")}>{fmt.long.format(d)}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div ref={scrollRef} className={cn(blockReset, "relative overflow-y-auto overscroll-contain")} style={{ maxHeight: height }}>
        <div ref={contentRef} className={cn(blockReset, "relative flex")} style={{ height: gridHeight }}>
          <div aria-hidden="true" className={cn(blockReset, "relative w-14 shrink-0")}>
            {hours.map((h, i) =>
              i === 0 ? null : (
                <span
                  key={h}
                  className={cn(blockReset, "absolute end-2 -translate-y-1/2 text-[0.6875rem] text-pui-muted-foreground tabular-nums")}
                  style={{ top: i * hourHeight }}
                >
                  {fmt.hour.format(new Date(2000, 0, 1, h))}
                </span>
              ),
            )}
            {nowMin !== null && todayMs !== null && dayList.includes(todayMs) && nowMin >= firstMin && nowMin <= lastMin ? (
              <span
                className={cn(blockReset, "absolute end-1 z-10 -translate-y-1/2 rounded-pui-sm bg-pui-danger px-1 text-[0.625rem] font-semibold text-pui-danger-foreground tabular-nums")}
                style={{ top: (nowMin - firstMin) * pxPerMin }}
              >
                {fmt.time.format(now ?? 0)}
              </span>
            ) : null}
          </div>
          {/* Pointer target for drawing new events. Keyboard users create events with Add event. */}
          <div
            ref={gridRef}
            role="presentation"
            onPointerDown={onGridPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
            className={cn(blockReset, "relative grid flex-1 touch-pan-y select-none", !readOnly && "cursor-crosshair")}
            style={{
              ...gridTemplate,
              backgroundImage: "linear-gradient(to bottom, var(--pui-border) 1px, transparent 1px)",
              backgroundSize: `100% ${hourHeight}px`,
            }}
          >
            {dayList.map((dayMs) => {
              const segs = layoutDay(shown, dayMs);
              const isToday = dayMs === todayMs;
              return (
                <div
                  key={dayMs}
                  role="group"
                  aria-label={fmt.long.format(dayMs)}
                  className={cn(blockReset, "pointer-events-none relative border-s border-pui-border/70 first:border-s-0", isToday && "bg-pui-primary/[0.035]")}
                >
                  <AnimatePresence initial={false}>
                    {segs.map((seg) => {
                      const ev = seg.event;
                      const top = (clamp(seg.top, firstMin, lastMin) - firstMin) * pxPerMin;
                      const bottom = (clamp(seg.bottom, firstMin, lastMin) - firstMin) * pxPerMin;
                      const h = Math.max(bottom - top, 14);
                      if (seg.bottom <= firstMin || seg.top >= lastMin) return null;
                      const isDraft = ev.id === DRAFT_ID;
                      const dragging = drag?.moved === true && drag.id === ev.id;
                      const isSelected = selected === ev.id;
                      const locked = readOnly || ev.readOnly === true;
                      const compact = h < 34;
                      const s = ev.start.getTime();
                      const e = ev.end.getTime();
                      const stacked = seg.columns > 1;
                      // Overlaps sit side by side while each gets ~110px; below that they cascade: every
                      // later event is inset by up to 14px and layered on top, with a minimum width.
                      const cascade = stacked && colWidth !== null && colWidth / seg.columns < CASCADE_BELOW;
                      let inset: string;
                      let width: string;
                      let widthPx: number | null;
                      if (cascade && colWidth !== null) {
                        const full = colWidth - 4;
                        const minW = Math.min(full, MIN_EVENT_WIDTH);
                        const offset = clamp((full - minW) / (seg.columns - 1), 0, CASCADE_OFFSET);
                        inset = `${2 + seg.column * offset}px`;
                        widthPx = full - seg.column * offset;
                        width = `${widthPx}px`;
                      } else {
                        // Side by side: each column starts at its share; all but the last widen under the next.
                        const share = 100 / seg.columns;
                        const leftPct = seg.column * share;
                        const widthPct = seg.column === seg.columns - 1 ? share : Math.min(100 - leftPct, share * 1.7);
                        inset = `calc(${leftPct}% + 2px)`;
                        width = `calc(${widthPct}% - 4px)`;
                        widthPx = colWidth !== null ? (colWidth * widthPct) / 100 - 4 : null;
                      }
                      // Title first; the time line only where it fits, the description only in tall events.
                      const lines = Math.max(1, Math.floor((h - 10) / 16));
                      const roomy = widthPx === null || widthPx >= 56;
                      const showTime = compact ? widthPx === null || widthPx >= 120 : lines >= 2 && roomy;
                      const showDescription = !compact && Boolean(ev.description) && lines >= 4 && roomy;
                      const titleLines = compact ? 1 : clamp(lines - (showTime ? 1 : 0) - (showDescription ? 1 : 0), 1, 3);
                      return (
                        <motion.div
                          key={`${ev.id}-${dayMs}`}
                          ref={(el: HTMLDivElement | null) => {
                            if (isDraft) return;
                            // A day move mounts the new copy before the old one finishes leaving.
                            if (el) eventRefs.current.set(ev.id, el);
                            else if (!eventRefs.current.get(ev.id)?.isConnected) eventRefs.current.delete(ev.id);
                          }}
                          role={isDraft ? undefined : "button"}
                          tabIndex={isDraft ? -1 : 0}
                          aria-label={isDraft ? undefined : describe({ title: ev.title, start: s, end: e })}
                          aria-description={ev.description}
                          aria-pressed={isDraft ? undefined : isSelected}
                          aria-disabled={locked || undefined}
                          aria-describedby={isDraft ? undefined : `${id}-hint`}
                          onPointerDown={isDraft ? undefined : (pe: React.PointerEvent<HTMLDivElement>) => onEventPointerDown(pe, ev, "move")}
                          onKeyDown={isDraft ? undefined : (ke: React.KeyboardEvent<HTMLDivElement>) => onEventKeyDown(ke, ev)}
                          onFocus={(fe: React.FocusEvent<HTMLDivElement>) => {
                            if (isDraft) return;
                            setSelected(ev.id);
                            if (fe.currentTarget.matches(":focus-visible")) showPeek(ev.id, fe.currentTarget, 0);
                          }}
                          onBlur={hidePeek}
                          onPointerEnter={isDraft ? undefined : (pe: React.PointerEvent<HTMLDivElement>) => pe.pointerType === "mouse" && showPeek(ev.id, pe.currentTarget, PEEK_DELAY)}
                          onPointerLeave={hidePeek}
                          // Mid-drag the event hops between day columns: no enter or exit fades then.
                          initial={dragging ? false : reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                          animate={{ opacity: isDraft ? 0.85 : 1, scale: dragging && !reduced ? 1.02 : 1 }}
                          exit={dragging ? { opacity: 0, transition: { duration: 0 } } : reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                          transition={reduced ? { duration: durations.fast } : springs.snappy}
                          className={cn(
                            blockReset,
                            focusRing,
                            "pointer-events-auto absolute flex flex-col overflow-hidden rounded-pui-md border-s-[3px] px-1.5 text-start",
                            "border-(--pui-tone) bg-[color-mix(in_oklab,var(--pui-tone)_14%,var(--pui-background))] text-(--pui-tone-text)",
                            toneClasses[ev.tone ?? "primary"],
                            compact ? "flex-row items-center gap-1 py-0" : "py-1",
                            locked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                            isSelected && "z-10 shadow-pui-md ring-1 ring-(--pui-tone)/50",
                            dragging && "z-20 shadow-pui-lg",
                            isDraft && "z-20 border-dashed",
                            stacked && !cascade && "shadow-[0_0_0_1px_var(--pui-background)]",
                            cascade && seg.column > 0 && "shadow-[0_0_0_1px_var(--pui-background),0_4px_10px_-2px_color-mix(in_oklab,var(--pui-foreground)_22%,transparent)]",
                            cascade && seg.column === 0 && "shadow-[0_0_0_1px_var(--pui-background)]",
                          )}
                          style={{ top: top + 1, height: h - 2, insetInlineStart: inset, width, zIndex: isSelected || dragging || isDraft ? undefined : seg.column + 1 }}
                        >
                          {editing === ev.id ? (
                            <input
                              ref={editInput}
                              aria-label="Event title"
                              defaultValue={ev.title}
                              onPointerDown={(pe) => pe.stopPropagation()}
                              onKeyDown={(ke) => {
                                ke.stopPropagation();
                                if (ke.key === "Enter") finishEdit(ev, ke.currentTarget.value);
                                if (ke.key === "Escape") finishEdit(ev, null);
                              }}
                              onBlur={(be) => finishEdit(ev, be.currentTarget.value)}
                              className={cn(controlReset, "w-full min-w-0 rounded-pui-sm bg-pui-background/80 px-1 text-xs font-semibold text-pui-foreground outline-hidden")}
                            />
                          ) : (
                            <span
                              className={cn(blockReset, "min-w-0 shrink-0 text-xs leading-4 font-semibold", titleLines === 1 ? "truncate" : "overflow-hidden [overflow-wrap:anywhere]")}
                              style={titleLines > 1 ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: titleLines } : undefined}
                            >
                              {ev.title}
                            </span>
                          )}
                          {showTime ? (
                            <span className={cn(blockReset, "truncate text-[0.6875rem] leading-4 opacity-80 tabular-nums")}>
                              {fmt.time.format(s)}
                              {compact ? "" : ` – ${fmt.time.format(e)}`}
                            </span>
                          ) : null}
                          {showDescription ? <span className={cn(blockReset, "truncate text-[0.6875rem] leading-4 opacity-70")}>{ev.description}</span> : null}
                          {!locked && !isDraft ? (
                            <>
                              <span
                                aria-hidden="true"
                                onPointerDown={(pe) => onEventPointerDown(pe, ev, "start")}
                                className={cn(blockReset, "absolute inset-x-0 top-0 h-1.5 cursor-ns-resize")}
                              />
                              <span
                                aria-hidden="true"
                                onPointerDown={(pe) => onEventPointerDown(pe, ev, "end")}
                                className={cn(blockReset, "absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize justify-center")}
                              >
                                <span className={cn(blockReset, "mt-0.5 h-0.5 w-5 rounded-pui-full bg-(--pui-tone)/50 opacity-0 transition-opacity", isSelected && "opacity-100")} />
                              </span>
                            </>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {isToday && nowMin !== null && nowMin >= firstMin && nowMin <= lastMin ? (
                    <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-pui-danger")} style={{ top: (nowMin - firstMin) * pxPerMin - 1 }}>
                      <span className={cn(blockReset, "absolute -start-1 -top-[3px] size-2 rounded-pui-full bg-pui-danger")} />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <AnimatePresence>
            {peekEvent ? (
              <motion.div
                key="peek"
                aria-hidden="true"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: durations.fast } }}
                transition={reduced ? { duration: durations.fast } : springs.snappy}
                className={cn(
                  blockReset,
                  "pointer-events-none absolute z-40 flex flex-col gap-0.5 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2 text-pui-surface-foreground shadow-pui-lg",
                  toneClasses[peekEvent.tone ?? "primary"],
                )}
                style={{ left: peek?.left ?? 0, top: peek?.top ?? 0, width: PEEK_WIDTH }}
              >
                <span className={cn(blockReset, "flex items-start gap-1.5 text-sm leading-5 font-semibold text-pui-foreground")}>
                  <span aria-hidden="true" className={cn(blockReset, "mt-1.5 size-2 shrink-0 rounded-pui-full bg-(--pui-tone)")} />
                  <span className={cn(blockReset, "min-w-0 [overflow-wrap:anywhere]")}>{peekEvent.title}</span>
                </span>
                <span className={cn(blockReset, "ps-3.5 text-xs text-pui-muted-foreground tabular-nums")}>
                  {fmt.short.format(peekEvent.start)} · {fmt.time.format(peekEvent.start)} – {fmt.time.format(peekEvent.end)}
                </span>
                {peekEvent.description ? <span className={cn(blockReset, "ps-3.5 text-xs text-pui-foreground")}>{peekEvent.description}</span> : null}
                {peekEvent.readOnly || readOnly ? <span className={cn(blockReset, "ps-3.5 text-[0.6875rem] text-pui-muted-foreground")}>Can't be edited</span> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <span id={`${id}-hint`} className={cn(blockReset, "sr-only")}>
        {readOnly ? "Enter opens the event." : "Arrow keys move by step or a day, Shift with up or down resizes, Enter renames, Delete removes."}
      </span>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});

const navButton = cn(
  controlReset,
  focusRing,
  "inline-flex h-8 cursor-pointer items-center rounded-pui-md border border-pui-border text-xs font-medium text-pui-foreground transition-colors hover:bg-pui-muted disabled:cursor-not-allowed disabled:opacity-50",
);
