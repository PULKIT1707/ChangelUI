"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon, InfoIcon, PencilIcon, PlusIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { useMinuteClock } from "../lib/use-minute-clock";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Avatar } from "./avatar";

export interface ActivityActor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ActivityChange {
  /** Field label, e.g. "Status". */
  field: string;
  /** Previous value; omit when the field was empty. */
  from?: React.ReactNode;
  /** New value; omit when the field was cleared. */
  to?: React.ReactNode;
}

export type ActivityKind = "change" | "comment" | "create" | "system";

export interface ActivityEvent {
  id: string;
  /** Omit for system events. */
  actor?: ActivityActor;
  /** Default "change". */
  kind?: ActivityKind;
  at: number | string | Date;
  /** Verb phrase after the actor: "changed the status", "commented", "created the issue". */
  action?: React.ReactNode;
  /** Field changes shown as from → to chips. */
  changes?: ActivityChange[];
  /** Comment body for kind "comment". */
  comment?: React.ReactNode;
  /** Replaces the node icon. */
  icon?: React.ReactNode;
}

export type ActivityFilter = "all" | "comments" | "history";

export interface ActivityFeedProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Any order; the feed sorts them by time. */
  events: ActivityEvent[];
  /** Default "newest". */
  order?: "newest" | "oldest";
  /** Fold back-to-back changes by one person into one expandable row. Default true. */
  collapseBursts?: boolean;
  /** Max gap between two changes of one burst, in ms. Default 15 minutes. */
  burstWindow?: number;
  /** Day headings (Today, Yesterday, dates). Default true. */
  groupByDay?: boolean;
  filter?: ActivityFilter;
  defaultFilter?: ActivityFilter;
  onFilterChange?: (filter: ActivityFilter) => void;
  /** Show the All / Comments / History switch. Default true. */
  showFilter?: boolean;
  /** Reference time for Today/Yesterday. Default: the client clock after hydration. */
  now?: number;
  /** IANA zone for days and times. Default: the user's (UTC on the server). */
  timeZone?: string;
  locale?: string;
  /** Accessible name and heading. Default "Activity". */
  label?: string;
  /** Hide the visible heading (the name stays). Default false. */
  hideLabel?: boolean;
  /** Shown when nothing matches the filter. */
  emptyMessage?: React.ReactNode;
}

export type ActivityRow =
  | { type: "single"; event: ActivityEvent; time: number }
  | { type: "burst"; id: string; events: { event: ActivityEvent; time: number }[]; time: number };

export interface ActivityDay {
  key: string;
  time: number;
  rows: ActivityRow[];
}

const toTime = (t: ActivityEvent["at"]) => (t instanceof Date ? t.getTime() : typeof t === "string" ? Date.parse(t) : t);
const kindOf = (e: ActivityEvent): ActivityKind => e.kind ?? "change";

function dayKey(time: number, timeZone: string | undefined): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
}

/** Groups sorted events into days, folding consecutive changes by one actor into bursts. */
export function groupActivity(
  events: ActivityEvent[],
  options: { order?: "newest" | "oldest"; collapseBursts?: boolean; burstWindow?: number; groupByDay?: boolean; timeZone?: string } = {},
): ActivityDay[] {
  const { order = "newest", collapseBursts = true, burstWindow = 15 * 60_000, groupByDay = true, timeZone } = options;
  const sorted = events
    .map((event) => ({ event, time: toTime(event.at) }))
    .filter((e) => Number.isFinite(e.time))
    .sort((a, b) => (order === "newest" ? b.time - a.time : a.time - b.time));
  const days: ActivityDay[] = [];
  for (const item of sorted) {
    const key = groupByDay ? dayKey(item.time, timeZone) : "all";
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, time: item.time, rows: [] };
      days.push(day);
    }
    const last = day.rows[day.rows.length - 1];
    const canFold =
      collapseBursts &&
      kindOf(item.event) === "change" &&
      item.event.actor !== undefined &&
      last !== undefined &&
      Math.abs(last.time - item.time) <= burstWindow;
    const lastEvent = last?.type === "single" ? last.event : last?.type === "burst" ? last.events[last.events.length - 1]?.event : undefined;
    if (canFold && lastEvent && kindOf(lastEvent) === "change" && lastEvent.actor?.id === item.event.actor?.id) {
      if (last.type === "single") {
        day.rows[day.rows.length - 1] = { type: "burst", id: `burst-${last.event.id}`, events: [{ event: last.event, time: last.time }, item], time: item.time };
      } else if (last.type === "burst") {
        last.events.push(item);
        last.time = item.time;
      }
      continue;
    }
    day.rows.push({ type: "single", event: item.event, time: item.time });
  }
  return days;
}

const nodeBase = cn(
  blockReset,
  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-pui-full border border-pui-border bg-pui-background text-pui-muted-foreground [&_svg]:size-3",
);

function Node({ event }: { event: ActivityEvent }) {
  const kind = kindOf(event);
  if (event.icon) return <span className={nodeBase}>{event.icon}</span>;
  if (kind === "comment" && event.actor) return <Avatar size="xs" name={event.actor.name} src={event.actor.avatarUrl} className="relative z-10 ring-2 ring-pui-background" />;
  if (kind === "create")
    return (
      <span className={cn(nodeBase, "border-pui-success/40 bg-pui-success/12 text-pui-success-text")}>
        <PlusIcon />
      </span>
    );
  if (kind === "system")
    return (
      <span className={nodeBase}>
        <InfoIcon />
      </span>
    );
  return (
    <span className={nodeBase}>
      <PencilIcon />
    </span>
  );
}

function ChangeChips({ changes }: { changes: ActivityChange[] }) {
  return (
    <ul className={cn(listReset, "mt-1.5 flex flex-col gap-1")}>
      {changes.map((c, i) => (
        <li key={i} className={cn(blockReset, "flex flex-wrap items-center gap-1.5 text-xs")}>
          <span className={cn(blockReset, "text-pui-muted-foreground")}>{c.field}</span>
          {c.from !== undefined && c.from !== null && c.from !== "" ? (
            <span className={cn(blockReset, "rounded-pui-sm bg-pui-muted px-1.5 py-0.5 text-pui-muted-foreground line-through decoration-pui-muted-foreground/50")}>
              <span className={cn(blockReset, "sr-only")}>from </span>
              {c.from}
            </span>
          ) : null}
          <span aria-hidden="true" className={cn(blockReset, "text-pui-muted-foreground")}>
            →
          </span>
          {c.to !== undefined && c.to !== null && c.to !== "" ? (
            <span className={cn(blockReset, "rounded-pui-sm bg-pui-primary/10 px-1.5 py-0.5 font-medium text-pui-primary-text")}>
              <span className={cn(blockReset, "sr-only")}>to </span>
              {c.to}
            </span>
          ) : (
            <span className={cn(blockReset, "italic text-pui-muted-foreground")}>cleared</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Audit trail that reads like a story: events grouped under Today, Yesterday and dates, field
 * changes shown as from → to chips, comments as cards, and bursts of edits by one person folded into
 * a single "made 5 changes" row that expands in place. An All / Comments / History switch filters
 * the feed, new events slide in at the top and are announced politely. The ref goes to the section.
 */
export const ActivityFeed = React.forwardRef<HTMLElement, ActivityFeedProps>(function ActivityFeed(
  {
    events,
    order = "newest",
    collapseBursts = true,
    burstWindow = 15 * 60_000,
    groupByDay = true,
    filter: filterProp,
    defaultFilter = "all",
    onFilterChange,
    showFilter = true,
    now: nowProp,
    timeZone: timeZoneProp,
    locale,
    label = "Activity",
    hideLabel = false,
    emptyMessage = "No activity yet.",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const isClient = useIsClient();
  const clock = useMinuteClock();
  const now = nowProp ?? clock;
  // The server and the hydration pass use UTC so both render the same days; the user's zone follows.
  const timeZone = timeZoneProp ?? (isClient ? undefined : "UTC");
  const [filterState, setFilterState] = React.useState<ActivityFilter>(defaultFilter);
  const filter = filterProp ?? filterState;
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = React.useState("");
  const seenRef = React.useRef<Set<string> | null>(null);

  React.useEffect(() => {
    const ids = new Set(events.map((e) => e.id));
    const seen = seenRef.current;
    seenRef.current = ids;
    if (!seen) return;
    let fresh = 0;
    for (const e of events) if (!seen.has(e.id)) fresh++;
    if (fresh > 0) setAnnouncement(`${fresh} new ${fresh === 1 ? "event" : "events"}`);
  }, [events]);

  const counts = React.useMemo(() => {
    let comments = 0;
    for (const e of events) if (kindOf(e) === "comment") comments++;
    return { all: events.length, comments, history: events.length - comments };
  }, [events]);

  const days = React.useMemo(() => {
    const visible = events.filter((e) => filter === "all" || (filter === "comments" ? kindOf(e) === "comment" : kindOf(e) !== "comment"));
    return groupActivity(visible, { order, collapseBursts, burstWindow, groupByDay, timeZone });
  }, [events, filter, order, collapseBursts, burstWindow, groupByDay, timeZone]);

  const timeFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }), [locale, timeZone]);
  const fullFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" }), [locale, timeZone]);
  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { timeZone, weekday: "short", month: "short", day: "numeric" }), [locale, timeZone]);

  const dayLabel = (day: ActivityDay) => {
    if (now !== null) {
      if (day.key === dayKey(now, timeZone)) return "Today";
      if (day.key === dayKey(now - 86_400_000, timeZone)) return "Yesterday";
    }
    return dateFmt.format(day.time);
  };

  const setFilter = (next: ActivityFilter) => {
    if (filterProp === undefined) setFilterState(next);
    onFilterChange?.(next);
  };

  const enter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: durations.fast } }
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, transition: { duration: durations.fast } },
        transition: springs.smooth,
      };

  const stamp = (time: number) => (
    <time dateTime={new Date(time).toISOString()} title={fullFmt.format(time)} className={cn(blockReset, "shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>
      {timeFmt.format(time)}
    </time>
  );

  const headline = (event: ActivityEvent) => (
    <span className={cn(blockReset, "min-w-0 text-sm leading-6 text-pui-muted-foreground")}>
      {event.actor ? <span className={cn(blockReset, "font-medium text-pui-foreground")}>{event.actor.name} </span> : null}
      {event.action ?? (kindOf(event) === "comment" ? "commented" : kindOf(event) === "create" ? "created this" : "made a change")}
    </span>
  );

  const renderEvent = (event: ActivityEvent, time: number) => (
    <div className={cn(blockReset, "min-w-0 flex-1 pb-4")}>
      <div className={cn(blockReset, "flex items-baseline justify-between gap-3")}>
        {headline(event)}
        {stamp(time)}
      </div>
      {event.changes?.length ? <ChangeChips changes={event.changes} /> : null}
      {event.comment ? (
        <div className={cn(blockReset, "mt-1.5 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2 text-sm leading-relaxed text-pui-surface-foreground shadow-pui-xs")}>
          {event.comment}
        </div>
      ) : null}
    </div>
  );

  const renderBurst = (row: Extract<ActivityRow, { type: "burst" }>) => {
    const first = row.events[0]?.event;
    const open = expanded[row.id] === true;
    const panelId = `${id}-${row.id}`;
    const fields = [...new Set(row.events.flatMap((e) => e.event.changes?.map((c) => c.field) ?? []))];
    const newest = Math.max(...row.events.map((e) => e.time));
    const oldest = Math.min(...row.events.map((e) => e.time));
    return (
      <div className={cn(blockReset, "min-w-0 flex-1 pb-4")}>
        <div className={cn(blockReset, "flex items-baseline justify-between gap-3")}>
          <span className={cn(blockReset, "min-w-0 text-sm leading-6 text-pui-muted-foreground")}>
            <span className={cn(blockReset, "font-medium text-pui-foreground")}>{first?.actor?.name} </span>
            made {row.events.length} changes
          </span>
          <span className={cn(blockReset, "shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>
            <time dateTime={new Date(oldest).toISOString()}>{timeFmt.format(oldest)}</time>
            {" – "}
            <time dateTime={new Date(newest).toISOString()}>{timeFmt.format(newest)}</time>
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setExpanded((s) => ({ ...s, [row.id]: !open }))}
          className={cn(
            controlReset,
            focusRing,
            "mt-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-pui-md px-1.5 py-0.5 -ms-1.5 text-xs text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
          )}
        >
          <span className={cn(blockReset, "truncate")}>{fields.length ? fields.join(", ") : "Details"}</span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
            className={cn(blockReset, "inline-flex")}
          >
            <ChevronDownIcon className="size-3.5" />
          </motion.span>
          <span className={cn(blockReset, "sr-only")}>{open ? "Hide changes" : "Show changes"}</span>
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="panel"
              id={panelId}
              initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={reduced ? { duration: durations.fast } : { duration: durations.slow, ease: easings.out }}
              className={cn(blockReset, "overflow-hidden")}
            >
              <ol className={cn(listReset, "mt-2 flex flex-col gap-2.5 border-s-2 border-pui-border ps-3")}>
                {row.events.map(({ event, time }) => (
                  <li key={event.id} className={cn(blockReset, "min-w-0")}>
                    <div className={cn(blockReset, "flex items-baseline justify-between gap-3")}>
                      <span className={cn(blockReset, "min-w-0 text-xs text-pui-muted-foreground")}>{event.action ?? "made a change"}</span>
                      {stamp(time)}
                    </div>
                    {event.changes?.length ? <ChangeChips changes={event.changes} /> : null}
                  </li>
                ))}
              </ol>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  const headingId = `${id}-heading`;
  const tabs: { value: ActivityFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "comments", label: "Comments", count: counts.comments },
    { value: "history", label: "History", count: counts.history },
  ];

  return (
    <section ref={ref} aria-labelledby={headingId} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-3 text-pui-foreground", className)}>
      {!hideLabel || showFilter ? (
        <div className={cn(blockReset, "flex flex-wrap items-center justify-between gap-2")}>
          <h3 id={headingId} className={cn(blockReset, "text-sm font-semibold text-pui-foreground", hideLabel && "sr-only")}>
            {label}
          </h3>
          {showFilter ? (
            <div role="group" aria-label="Filter activity" className={cn(blockReset, "inline-flex rounded-pui-md bg-pui-muted p-0.5")}>
              {tabs.map((t) => {
                const active = filter === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(t.value)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-pui-sm px-2.5 text-xs font-medium transition-colors",
                      active ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`${id}-filter`}
                        transition={reduced ? { duration: 0 } : springs.snappy}
                        className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-background shadow-pui-xs")}
                      />
                    ) : null}
                    <span className={cn(blockReset, "relative")}>{t.label}</span>
                    <span className={cn(blockReset, "relative tabular-nums text-pui-muted-foreground")}>{t.count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <h3 id={headingId} className={cn(blockReset, "sr-only")}>
          {label}
        </h3>
      )}
      {days.length === 0 ? (
        <p className={cn(blockReset, "rounded-pui-lg border border-dashed border-pui-border px-4 py-6 text-center text-sm text-pui-muted-foreground")}>{emptyMessage}</p>
      ) : (
        <div className={cn(blockReset, "flex flex-col gap-2")}>
          {days.map((day) => {
            const dayId = `${id}-day-${day.key}`;
            return (
              <div key={day.key} role="group" aria-labelledby={groupByDay ? dayId : undefined} className={cn(blockReset, "flex flex-col")}>
                {groupByDay ? (
                  <h4
                    id={dayId}
                    className={cn(
                      blockReset,
                      "sticky top-0 z-20 mb-2 flex items-center gap-2 bg-pui-background/90 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-pui-muted-foreground backdrop-blur-sm",
                    )}
                  >
                    {dayLabel(day)}
                    <span aria-hidden="true" className={cn(blockReset, "h-px flex-1 bg-pui-border")} />
                  </h4>
                ) : null}
                <ol className={cn(listReset, "relative")}>
                  <AnimatePresence initial={false}>
                    {day.rows.map((row, index) => {
                      const key = row.type === "single" ? row.event.id : row.id;
                      const nodeEvent = row.type === "single" ? row.event : (row.events[0]?.event ?? { id: "", at: 0 });
                      const isLast = index === day.rows.length - 1;
                      return (
                        <motion.li key={key} layout={reduced ? false : "position"} {...enter} className={cn(blockReset, "relative flex gap-3")}>
                          <span aria-hidden="true" className={cn(blockReset, "relative flex w-6 shrink-0 justify-center pt-0")}>
                            {isLast ? null : <span className={cn(blockReset, "absolute top-6 bottom-0 w-px bg-pui-border")} />}
                            <span className={cn(blockReset, "flex pt-0")}>
                              <Node event={nodeEvent} />
                            </span>
                          </span>
                          {row.type === "single" ? renderEvent(row.event, row.time) : renderBurst(row)}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ol>
              </div>
            );
          })}
        </div>
      )}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </section>
  );
});
