"use client";

// Gantt chart: a project timeline with collapsible groups, progress fills, milestones, elbow-routed
// dependency arrows, a critical-path highlight, scheduling-conflict warnings, a today line, a
// zoomable day / week / month scale and (when editable) drag to move or resize with day snapping.
// Bars grow from their start; hovering a task lights its whole dependency chain. The task list is
// a treegrid with one tab stop: arrows walk the rows, left/right collapse and expand groups, and
// Alt+arrows move or resize the focused task.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { addDays, dayDelta, dayOfWeek, formatISO, startOfWeek } from "../lib/date";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { categoricalColor, mix, withOpacity } from "./core/color";
import { ChartFigure, ChartTip, TipRow, useChartUid } from "./core/frame";
import { estimateTextWidth } from "./core/format";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
// Overdamped (chartMotion.size): bar widths never overshoot below zero.
const settle: Transition = chartMotion.size;

export interface GanttTask {
  id: string;
  name: string;
  /** "YYYY-MM-DD" (inclusive). */
  start: string;
  /** "YYYY-MM-DD" (inclusive). Milestones use start. */
  end: string;
  /** 0..1. */
  progress?: number;
  group?: string;
  dependsOn?: readonly string[];
  milestone?: boolean;
  /** Any token or var(). Default: the group's palette color. */
  color?: string;
  assignee?: string;
}

export type GanttScale = "day" | "week" | "month";

export interface GanttChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  tasks: readonly GanttTask[];
  /** Called with the full next list after a drag or keyboard edit. */
  onTasksChange?: (tasks: GanttTask[], changed: GanttTask) => void;
  /** Default "week". */
  scale?: GanttScale;
  /** Drag to move / resize and Alt+arrow edits. Default false. */
  editable?: boolean;
  /** "YYYY-MM-DD" for the today line (pass it explicitly so the server and client agree). */
  today?: string;
  /** Default 34. */
  rowHeight?: number;
  /** Task column width. Default 200. */
  labelWidth?: number;
  /** Arrows between dependent tasks. Default true. */
  dependencies?: boolean;
  /** Highlight the critical path (zero-slack chain to the project end). Default false. */
  criticalPath?: boolean;
  collapsedGroups?: readonly string[];
  defaultCollapsedGroups?: readonly string[];
  onCollapsedGroupsChange?: (groups: string[]) => void;
  onTaskClick?: (task: GanttTask, event: React.SyntheticEvent) => void;
  locale?: string;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  summary?: string;
  chartLabel?: string;
}

const PX_PER_DAY: Record<GanttScale, number> = { day: 34, week: 13, month: 4 };

type Row = { kind: "group"; key: string; name: string; tasks: GanttTask[]; start: string; end: string; progress: number } | { kind: "task"; key: string; task: GanttTask; group: string | null };

/** Tasks on the zero-slack chain that ends at the project end (by actual dates). */
export function ganttCriticalPath(tasks: readonly GanttTask[]): Set<string> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  let projectEnd = "";
  for (const t of tasks) if (t.end > projectEnd) projectEnd = t.end;
  const out = new Set<string>();
  const stack = tasks.filter((t) => t.end === projectEnd).map((t) => t.id);
  while (stack.length) {
    const id = stack.pop() as string;
    if (out.has(id)) continue;
    out.add(id);
    const t = byId.get(id);
    for (const dep of t?.dependsOn ?? []) {
      const p = byId.get(dep);
      if (p && t && dayDelta(p.end, t.start) <= 1) stack.push(dep);
    }
  }
  return out;
}

const days = (t: GanttTask) => (t.milestone ? 0 : dayDelta(t.start, t.end) + 1);

export const GanttChart = React.forwardRef<HTMLElement, GanttChartProps>(function GanttChart(
  {
    tasks: tasksProp,
    onTasksChange,
    scale = "week",
    editable = false,
    today,
    rowHeight = 34,
    labelWidth = 200,
    dependencies = true,
    criticalPath = false,
    collapsedGroups: collapsedProp,
    defaultCollapsedGroups = [],
    onCollapsedGroupsChange,
    onTaskClick,
    locale = "en-US",
    animation = "auto",
    title,
    description,
    titleAs,
    summary,
    chartLabel,
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  // Local copy so editing works without a handler; a new `tasks` prop replaces it.
  const [tasks, setTasks] = React.useState<readonly GanttTask[]>(tasksProp);
  const [prevProp, setPrevProp] = React.useState(tasksProp);
  if (prevProp !== tasksProp) {
    setPrevProp(tasksProp);
    setTasks(tasksProp);
  }
  const [collapsedLocal, setCollapsedLocal] = React.useState<readonly string[]>(defaultCollapsedGroups);
  const collapsed = collapsedProp ?? collapsedLocal;
  const setCollapsed = (next: string[]) => {
    if (collapsedProp === undefined) setCollapsedLocal(next);
    onCollapsedGroupsChange?.(next);
  };
  const [zoom, setZoom] = React.useState(1);
  const [hover, setHover] = React.useState<string | null>(null);
  const [focusRow, setFocusRow] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [drag, setDrag] = React.useState<{ id: string; mode: "move" | "start" | "end"; delta: number } | null>(null);
  const dragRef = React.useRef<{ id: string; mode: "move" | "start" | "end"; x0: number; pointer: number; moved: boolean } | null>(null);

  const ppd = PX_PER_DAY[scale] * zoom;
  const fmtShort = (iso: string) => formatISO(iso, locale, { month: "short", day: "numeric" });

  // Apply the in-flight drag to a task (the preview).
  const shown = (t: GanttTask): GanttTask => {
    if (!drag || drag.id !== t.id || !drag.delta) return t;
    if (drag.mode === "move" || t.milestone) return { ...t, start: addDays(t.start, drag.delta), end: addDays(t.end, drag.delta) };
    if (drag.mode === "start") {
      const s = addDays(t.start, drag.delta);
      return { ...t, start: s > t.end ? t.end : s };
    }
    const e = addDays(t.end, drag.delta);
    return { ...t, end: e < t.start ? t.start : e };
  };
  const view = tasks.map(shown);
  const byId = new Map(view.map((t) => [t.id, t]));

  // Range, padded and aligned to the scale.
  let lo = view[0]?.start ?? "2026-01-01";
  let hi = view[0]?.end ?? "2026-01-31";
  for (const t of view) {
    if (t.start < lo) lo = t.start;
    const e = t.milestone ? t.start : t.end;
    if (e > hi) hi = e;
  }
  const rangeStart = scale === "month" ? `${addDays(lo, -14).slice(0, 7)}-01` : startOfWeek(addDays(lo, scale === "day" ? -3 : -7), 1);
  const rangeEnd = addDays(hi, scale === "month" ? 45 : scale === "week" ? 14 : 5);
  const totalDays = dayDelta(rangeStart, rangeEnd) + 1;
  const TW = Math.ceil(totalDays * ppd);
  const xOf = (iso: string) => dayDelta(rangeStart, iso) * ppd;

  // Rows.
  const rows: Row[] = [];
  const order: string[] = [];
  const grouped = new Map<string, GanttTask[]>();
  for (const t of view) {
    const g = t.group ?? "";
    if (!grouped.has(g)) {
      grouped.set(g, []);
      order.push(g);
    }
    (grouped.get(g) as GanttTask[]).push(t);
  }
  const groupColor = new Map(order.map((g, i) => [g, categoricalColor(i)]));
  for (const g of order) {
    const list = grouped.get(g) as GanttTask[];
    if (g) {
      let s = list[0]?.start ?? lo;
      let e = list[0]?.end ?? hi;
      let w = 0;
      let done = 0;
      for (const t of list) {
        if (t.start < s) s = t.start;
        if (t.end > e) e = t.end;
        const d = Math.max(1, days(t));
        w += d;
        done += d * Math.max(0, Math.min(1, t.progress ?? 0));
      }
      rows.push({ kind: "group", key: `g:${g}`, name: g, tasks: list, start: s, end: e, progress: w ? done / w : 0 });
    }
    if (!g || !collapsed.includes(g)) for (const t of list) rows.push({ kind: "task", key: t.id, task: t, group: g || null });
  }
  const rowIndex = new Map(rows.map((r, i) => [r.key, i]));
  const header = 44;
  const H = header + rows.length * rowHeight;
  const yOf = (i: number) => header + i * rowHeight;

  const critical = React.useMemo(() => (criticalPath ? ganttCriticalPath(tasks) : new Set<string>()), [criticalPath, tasks]);
  // Dependency chain of the hovered / focused task.
  const focusKey = focused ? rows[Math.min(focusRow, rows.length - 1)]?.key : undefined;
  const activeId = drag?.id ?? hover ?? (focusKey && !focusKey.startsWith("g:") ? focusKey : null);
  const chain = React.useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    const down = new Map<string, string[]>();
    for (const t of tasks) for (const d of t.dependsOn ?? []) down.set(d, [...(down.get(d) ?? []), t.id]);
    const up = (id: string) => {
      for (const d of tasks.find((t) => t.id === id)?.dependsOn ?? []) {
        if (set.has(d)) continue;
        set.add(d);
        up(d);
      }
    };
    const dn = (id: string) => {
      for (const c of down.get(id) ?? []) {
        if (set.has(c)) continue;
        set.add(c);
        dn(c);
      }
    };
    up(activeId);
    dn(activeId);
    return set;
  }, [activeId, tasks]);
  const conflictsOf = (t: GanttTask) => (t.dependsOn ?? []).filter((d) => {
    const p = byId.get(d);
    return p ? (p.milestone ? p.start : p.end) >= t.start && !(p.milestone && p.start === t.start) : false;
  });

  // Header ticks.
  const ticks: Array<{ x: number; label: string; major: boolean }> = [];
  // Each major carries label variants, longest first; the longest that fits its span is drawn.
  const majors: Array<{ x: number; variants: string[] }> = [];
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(rangeStart, i);
    const x = i * ppd;
    const dom = Number(iso.slice(8));
    if (scale === "month") {
      if (dom === 1) {
        ticks.push({ x, label: formatISO(iso, locale, { month: "short" }), major: iso.slice(5, 7) === "01" });
        if (iso.slice(5, 7) === "01" || i === 0) majors.push({ x, variants: [iso.slice(0, 4), `'${iso.slice(2, 4)}`] });
      }
    } else {
      if (scale === "day" || dayOfWeek(iso) === 1) ticks.push({ x, label: scale === "day" ? String(dom) : fmtShort(iso), major: dayOfWeek(iso) === 1 });
      if (dom === 1 || i === 0) {
        const short = formatISO(iso, locale, { month: "short" });
        majors.push({
          x,
          variants: [
            formatISO(iso, locale, { month: "long", year: "numeric" }),
            formatISO(iso, locale, { month: "short", year: "numeric" }),
            `${short} '${iso.slice(2, 4)}`,
            short,
          ],
        });
      }
    }
  }

  // Fit header labels to their spans so neighbours never collide (a short first span such as
  // "Feb 23 .. Mar 1" at week scale used to print "February 2026March 2026").
  const majorLabels = majors.map((m, k) => {
    const span = (majors[k + 1]?.x ?? TW) - m.x;
    return m.variants.find((text) => estimateTextWidth(text, 11) * 1.08 + 12 <= span) ?? "";
  });
  const tickLabelShown: boolean[] = [];
  {
    let lastEnd = -Infinity;
    for (const t of ticks) {
      const w = estimateTextWidth(t.label, 10);
      const x0 = scale === "day" ? t.x + ppd / 2 - w / 2 : t.x + 4;
      const ok = x0 >= lastEnd + 6;
      tickLabelShown.push(ok);
      if (ok) lastEnd = x0 + w;
    }
  }
  const commit = (next: GanttTask, verb: string) => {
    const list = tasks.map((t) => (t.id === next.id ? next : t));
    setTasks(list);
    onTasksChange?.(list, next);
    setAnnouncement(`${next.name} ${verb}: ${fmtShort(next.start)} to ${fmtShort(next.end)}.`);
  };

  const onBarPointerDown = (event: React.PointerEvent<SVGGElement>, t: GanttTask) => {
    if (!editable || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const local = event.clientX - rect.left;
    const mode = t.milestone ? "move" : local < 8 ? "start" : local > rect.width - 8 ? "end" : "move";
    dragRef.current = { id: t.id, mode, x0: event.clientX, pointer: event.pointerId, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onBarPointerMove = (event: React.PointerEvent<SVGGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointer !== event.pointerId) return;
    const dx = event.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 3) return;
    d.moved = true;
    const delta = Math.round(dx / ppd);
    setDrag((prev) => (prev && prev.delta === delta && prev.id === d.id ? prev : { id: d.id, mode: d.mode, delta }));
  };
  const onBarPointerUp = (event: React.PointerEvent<SVGGElement>, t: GanttTask) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) {
      onTaskClick?.(t, event);
      return;
    }
    event.currentTarget.releasePointerCapture?.(d.pointer);
    if (!d.moved) {
      setDrag(null);
      onTaskClick?.(t, event);
      return;
    }
    const original = tasks.find((x) => x.id === d.id);
    const preview = original ? shown(original) : null;
    setDrag(null);
    if (original && preview && (preview.start !== original.start || preview.end !== original.end)) commit(preview, d.mode === "move" ? "moved" : "resized");
  };

  // Ctrl/Cmd + wheel zooms the time scale.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((z) => Math.max(0.4, Math.min(3, z * Math.exp(-event.deltaY * 0.0025))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const scrollToRow = (i: number) => {
    const r = rows[i];
    const el = scrollRef.current;
    if (!r || !el) return;
    const s = r.kind === "group" ? r.start : r.task.start;
    const x = xOf(s);
    if (x < el.scrollLeft + 16 || x > el.scrollLeft + el.clientWidth - 60) el.scrollTo({ left: Math.max(0, x - 40), behavior: anim.reducedMotion ? "auto" : "smooth" });
  };
  const describeRow = (r: Row) => {
    if (r.kind === "group") {
      const pct = Math.round(r.progress * 100);
      return `${r.name}, group of ${r.tasks.length} tasks, ${fmtShort(r.start)} to ${fmtShort(r.end)}, ${pct}% done, ${collapsed.includes(r.name) ? "collapsed" : "expanded"}.`;
    }
    const t = r.task;
    const deps = (t.dependsOn ?? []).map((d) => byId.get(d)?.name ?? d);
    const conflicts = conflictsOf(t);
    return `${t.name}${t.milestone ? ", milestone" : ""}, ${fmtShort(t.start)}${t.milestone ? "" : ` to ${fmtShort(t.end)}, ${days(t)} days`}${t.progress !== undefined ? `, ${Math.round(t.progress * 100)}% done` : ""}${deps.length ? `, after ${deps.join(" and ")}` : ""}${conflicts.length ? ", scheduling conflict" : ""}${critical.has(t.id) ? ", on the critical path" : ""}.`;
  };
  const move = (i: number) => {
    const n = Math.max(0, Math.min(rows.length - 1, i));
    setFocusRow(n);
    const r = rows[n];
    if (r) setAnnouncement(describeRow(r));
    scrollToRow(n);
  };
  const toggleGroup = (name: string) => {
    const next = collapsed.includes(name) ? collapsed.filter((g) => g !== name) : [...collapsed, name];
    setCollapsed(next);
    setAnnouncement(`${name} ${collapsed.includes(name) ? "expanded" : "collapsed"}.`);
  };
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const r = rows[focusRow];
    if (!r) return;
    const step = scale === "month" ? 7 : 1;
    if (event.altKey && editable && r.kind === "task" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -step : step;
      const t = tasks.find((x) => x.id === r.task.id);
      if (!t) return;
      if (event.shiftKey && !t.milestone) {
        const e = addDays(t.end, delta);
        commit({ ...t, end: e < t.start ? t.start : e }, "resized");
      } else commit({ ...t, start: addDays(t.start, delta), end: addDays(t.end, delta) }, "moved");
      return;
    }
    if (event.key === "ArrowDown") move(focusRow + 1);
    else if (event.key === "ArrowUp") move(focusRow - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
    else if (event.key === "ArrowRight" && r.kind === "group" && collapsed.includes(r.name)) toggleGroup(r.name);
    else if (event.key === "ArrowLeft" && r.kind === "group" && !collapsed.includes(r.name)) toggleGroup(r.name);
    else if (event.key === "ArrowLeft" && r.kind === "task" && r.group) move(rowIndex.get(`g:${r.group}`) ?? focusRow);
    else if (event.key === "Enter" || event.key === " ") {
      if (r.kind === "group") toggleGroup(r.name);
      else onTaskClick?.(r.task, event);
    } else if ((event.key === "+" || event.key === "=") && !event.metaKey) setZoom((z) => Math.min(3, z * 1.25));
    else if (event.key === "-" && !event.metaKey) setZoom((z) => Math.max(0.4, z / 1.25));
    else return;
    event.preventDefault();
  };

  // Tooltip target.
  const tipTask = activeId && (hover || drag) ? byId.get(activeId) : undefined;
  const tipRow = tipTask ? rowIndex.get(tipTask.id) : undefined;
  const tip =
    tipTask && tipRow !== undefined
      ? {
          left: Math.min(TW - 8, xOf(tipTask.start) + (tipTask.milestone ? 0 : Math.min(days(tipTask) * ppd, 160) / 2)) / TW,
          top: yOf(tipRow) / H,
          below: tipRow < 2,
          flipX: xOf(tipTask.start) / TW > 0.6,
        }
      : null;

  const nameText = chartLabel ?? (typeof title === "string" ? title : "Gantt chart");
  const realTasks = tasks.filter((t) => !t.milestone);
  const overall = realTasks.length ? realTasks.reduce((s, t) => s + days(t) * (t.progress ?? 0), 0) / Math.max(1, realTasks.reduce((s, t) => s + days(t), 0)) : 0;
  const conflictCount = view.filter((t) => conflictsOf(t).length).length;
  const summaryText =
    summary ??
    `${tasks.length} tasks from ${fmtShort(lo)} to ${fmtShort(hi)}, ${Math.round(overall * 100)}% complete.${conflictCount ? ` ${conflictCount} scheduling conflicts.` : ""}${criticalPath ? ` ${critical.size} tasks on the critical path.` : ""}`;
  const todayX = today && today >= rangeStart && today <= rangeEnd ? xOf(today) + ppd / 2 : null;
  const rowDelay = (i: number) => (anim.entrance ? Math.min(0.6, i * 0.045) : 0);

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div className={cn(blockReset, "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pui-muted-foreground")}>
        <span className={cn(blockReset, "tabular-nums")}>
          <strong className="font-semibold text-pui-foreground">{Math.round(overall * 100)}%</strong> complete
        </span>
        {criticalPath ? (
          <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
            <span aria-hidden="true" className={cn(blockReset, "h-0.5 w-4 rounded-pui-full bg-pui-danger")} />
            Critical path ({critical.size})
          </span>
        ) : null}
        {conflictCount ? <span className={cn(blockReset, "font-medium text-pui-danger-text")}>{conflictCount} conflict{conflictCount === 1 ? "" : "s"}</span> : null}
        <span className={cn(blockReset, "ms-auto inline-flex items-center gap-1")}>
          <button
            type="button"
            aria-label="Zoom out the timeline"
            onClick={() => setZoom((z) => Math.max(0.4, z / 1.25))}
            className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}
          >
            &minus;
          </button>
          <span className={cn(blockReset, "w-10 text-center tabular-nums")}>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in the timeline"
            onClick={() => setZoom((z) => Math.min(3, z * 1.25))}
            className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}
          >
            +
          </button>
        </span>
      </div>
      <div className={cn(blockReset, "flex w-full min-w-0 overflow-hidden rounded-pui-lg border border-pui-border")}>
        {/* Task column: the treegrid */}
        <div
          ref={gridRef}
          role="treegrid"
          aria-label={`${nameText} tasks`}
          aria-describedby={`${uid}-help`}
          aria-activedescendant={focused && rows[focusRow] ? `${uid}-row-${focusRow}` : undefined}
          tabIndex={0}
          onKeyDown={onGridKeyDown}
          onFocus={() => {
            setFocused(true);
            const r = rows[focusRow];
            if (r) setAnnouncement(describeRow(r));
          }}
          onBlur={() => setFocused(false)}
          className={cn(blockReset, focusRing, "relative shrink-0 border-e border-pui-border bg-pui-background outline-none")}
          style={{ width: labelWidth }}
        >
          <div aria-hidden="true" className={cn(blockReset, "flex items-end border-b border-pui-border px-3 pb-1.5 text-[11px] font-medium text-pui-muted-foreground")} style={{ height: header }}>
            Task
          </div>
          {rows.map((r, i) => {
            const isGroup = r.kind === "group";
            const isFocus = focused && i === focusRow;
            const key = isGroup ? null : r.task.id;
            const dim = chain && key && !chain.has(key);
            return (
              <div
                key={r.key}
                id={`${uid}-row-${i}`}
                role="row"
                aria-level={isGroup || !r.group ? 1 : 2}
                aria-expanded={isGroup ? !collapsed.includes(r.name) : undefined}
                aria-selected={isFocus}
                onPointerEnter={() => key && setHover(key)}
                onPointerLeave={() => setHover(null)}
                onClick={(event) => {
                  setFocusRow(i);
                  if (isGroup) toggleGroup(r.name);
                  else onTaskClick?.(r.task, event);
                }}
                className={cn(
                  blockReset,
                  "flex cursor-pointer items-center gap-2 border-b border-pui-border/60 pe-2 text-xs transition-[background-color,opacity]",
                  isFocus ? "bg-pui-muted" : "hover:bg-pui-muted/60",
                  dim ? "opacity-50" : "",
                )}
                style={{ height: rowHeight, paddingInlineStart: isGroup || !r.group ? 10 : 26 }}
              >
                <span role="gridcell" className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-2")}>
                  {isGroup ? (
                    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn(blockReset, "size-3 shrink-0 transition-transform", collapsed.includes(r.name) ? "-rotate-90" : "")}>
                      <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span aria-hidden="true" className={cn(blockReset, "size-2 shrink-0", r.task.milestone ? "rotate-45 rounded-[1px]" : "rounded-pui-full")} style={{ background: r.task.color ?? groupColor.get(r.group ?? "") }} />
                  )}
                  <span className={cn(blockReset, "truncate", isGroup ? "font-semibold" : "")}>{isGroup ? r.name : r.task.name}</span>
                  {!isGroup && critical.has(r.task.id) ? <span className={cn(blockReset, "ms-auto shrink-0 text-[10px] font-semibold text-pui-danger-text")}>CP</span> : null}
                  {!isGroup && r.task.assignee ? <span className={cn(blockReset, "ms-auto shrink-0 text-[10px] text-pui-muted-foreground")}>{r.task.assignee}</span> : null}
                  <span className={srOnly}>{describeRow(r)}</span>
                </span>
              </div>
            );
          })}
        </div>
        {/* Timeline */}
        <div ref={scrollRef} className={cn(blockReset, "relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden")}>
          <div className={cn(blockReset, "relative")} style={{ width: TW, height: H }}>
            <svg width={TW} height={H} viewBox={`0 0 ${TW} ${H}`} aria-hidden="true" className={cn(blockReset, "block select-none")}>
              <defs>
                <marker id={`${uid}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L8 4L0 8z" fill="context-stroke" />
                </marker>
              </defs>
              {/* Weekend shading */}
              {scale !== "month"
                ? Array.from({ length: totalDays }, (_, i) => {
                    const w = dayOfWeek(addDays(rangeStart, i));
                    return w === 0 || w === 6 ? <rect key={i} x={i * ppd} y={header} width={ppd} height={H - header} fill="var(--pui-muted)" opacity={0.45} /> : null;
                  })
                : null}
              {/* Header */}
              {majors.map((m, k) => (
                <g key={`m${k}`}>
                  <line x1={m.x} x2={m.x} y1={0} y2={H} stroke="var(--pui-border)" />
                  {majorLabels[k] ? (
                    <text x={m.x + 6} y={16} fontSize={11} fontWeight={600} fill="var(--pui-foreground)">
                      {majorLabels[k]}
                    </text>
                  ) : null}
                </g>
              ))}
              {ticks.map((t, k) => (
                <g key={`t${k}`}>
                  <line x1={t.x} x2={t.x} y1={header - 14} y2={H} stroke="var(--pui-chart-grid)" strokeDasharray={t.major ? undefined : "2 4"} />
                  {tickLabelShown[k] && ppd * (scale === "day" ? 1 : scale === "week" ? 7 : 30) >= 22 ? (
                    <text x={t.x + (scale === "day" ? ppd / 2 : 4)} y={header - 8} textAnchor={scale === "day" ? "middle" : "start"} fontSize={10} fill="var(--pui-muted-foreground)" className="tabular-nums">
                      {t.label}
                    </text>
                  ) : null}
                </g>
              ))}
              <line x1={0} x2={TW} y1={header} y2={header} stroke="var(--pui-border)" />
              {rows.map((_, i) => (
                <line key={`r${i}`} x1={0} x2={TW} y1={yOf(i + 1)} y2={yOf(i + 1)} stroke="var(--pui-chart-grid)" opacity={0.6} />
              ))}
              {focused && rows[focusRow] ? <rect x={0} y={yOf(focusRow)} width={TW} height={rowHeight} fill="var(--pui-muted)" opacity={0.7} /> : null}
              {/* Dependencies */}
              {dependencies
                ? view.flatMap((t) =>
                    (t.dependsOn ?? []).map((dep) => {
                      const p = byId.get(dep);
                      const ri = rowIndex.get(t.id);
                      const pi = rowIndex.get(dep);
                      if (!p || ri === undefined || pi === undefined) return null;
                      const x2 = p.milestone ? xOf(p.start) + ppd / 2 + 6 : xOf(p.end) + ppd;
                      const y1 = yOf(pi) + rowHeight / 2;
                      const x1 = t.milestone ? xOf(t.start) + ppd / 2 - 7 : xOf(t.start);
                      const y2 = yOf(ri) + rowHeight / 2;
                      const dir = y2 > y1 ? 1 : -1;
                      const d =
                        x1 - x2 >= 16
                          ? `M${x2},${y1}H${x2 + 8}V${y2}H${x1 - 1}`
                          : `M${x2},${y1}H${x2 + 8}V${y1 + (dir * rowHeight) / 2}H${x1 - 10}V${y2}H${x1 - 1}`;
                      const conflict = conflictsOf(t).includes(dep);
                      const onChain = chain ? chain.has(t.id) && chain.has(dep) : false;
                      const isCrit = critical.has(t.id) && critical.has(dep);
                      const stroke = conflict ? "var(--pui-danger)" : isCrit ? "var(--pui-danger)" : onChain ? "var(--pui-foreground)" : "var(--pui-muted-foreground)";
                      return (
                        <motion.path
                          key={`${dep}>${t.id}`}
                          d={d}
                          initial={anim.entrance ? { pathLength: 0, opacity: 0 } : false}
                          animate={{ pathLength: 1, opacity: chain && !onChain ? 0.15 : onChain || isCrit ? 1 : 0.55 }}
                          transition={anim.reducedMotion ? instant : { pathLength: { duration: 0.5, delay: anim.entrance ? 0.5 + rowDelay(ri) : 0 }, opacity: { duration: 0.15 } }}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={onChain || isCrit ? 1.6 : 1.1}
                          strokeDasharray={conflict ? "3 3" : undefined}
                          markerEnd={`url(#${uid}-arrow)`}
                        />
                      );
                    }),
                  )
                : null}
              {/* Bars */}
              {rows.map((r, i) => {
                const y = yOf(i);
                const bh = Math.max(8, rowHeight - (r.kind === "group" ? 22 : 14));
                const by = y + (rowHeight - bh) / 2;
                if (r.kind === "group") {
                  const x = xOf(r.start);
                  const w = (dayDelta(r.start, r.end) + 1) * ppd;
                  const color = groupColor.get(r.name) as string;
                  return (
                    <motion.g
                      key={r.key}
                      initial={anim.entrance ? { opacity: 0, scaleX: 0 } : false}
                      animate={{ opacity: chain ? 0.5 : 1, scaleX: 1 }}
                      transition={anim.reducedMotion ? instant : { scaleX: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: rowDelay(i) }, opacity: { duration: 0.2 } }}
                      style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
                    >
                      <rect x={x} y={by} width={w} height={bh} rx={2} fill={withOpacity(color, 0.25)} />
                      <rect x={x} y={by} width={w * r.progress} height={bh} rx={2} fill={color} />
                      <path d={`M${x},${by}v${bh + 5}l5,-5M${x + w},${by}v${bh + 5}l-5,-5`} fill="none" stroke={color} strokeWidth={1.5} />
                    </motion.g>
                  );
                }
                const t = r.task;
                const color = t.color ?? (groupColor.get(r.group ?? "") as string);
                const x = xOf(t.start);
                const dim = chain && !chain.has(t.id);
                const isCrit = critical.has(t.id);
                const conflict = conflictsOf(t).length > 0;
                const isDragging = drag?.id === t.id;
                if (t.milestone) {
                  const cx = x + ppd / 2;
                  const s = Math.min(9, bh / 2 + 2);
                  return (
                    <motion.g
                      key={r.key}
                      onPointerEnter={() => setHover(t.id)}
                      onPointerLeave={() => !dragRef.current && setHover(null)}
                      onPointerDown={(e) => onBarPointerDown(e, t)}
                      onPointerMove={onBarPointerMove}
                      onPointerUp={(e) => onBarPointerUp(e, t)}
                      initial={anim.entrance ? { opacity: 0, scale: 0 } : false}
                      animate={{ opacity: dim ? 0.3 : 1, scale: 1, x: 0 }}
                      transition={anim.reducedMotion ? instant : { scale: { type: "spring", stiffness: 380, damping: 18, delay: rowDelay(i) + 0.2 }, opacity: { duration: 0.15 } }}
                      style={{ transformBox: "fill-box", transformOrigin: "center", cursor: editable ? (isDragging ? "grabbing" : "grab") : "default" }}
                    >
                      <rect x={cx - s * 2} y={y} width={s * 4} height={rowHeight} fill="transparent" />
                      <path d={`M${cx},${y + rowHeight / 2 - s}l${s},${s}l${-s},${s}l${-s},${-s}z`} fill={isCrit ? "var(--pui-danger)" : color} stroke="var(--pui-background)" strokeWidth={1.5} />
                      <text x={cx + s + 6} y={y + rowHeight / 2} dy="0.35em" fontSize={10} fontWeight={600} fill="var(--pui-foreground)">
                        {t.name}
                      </text>
                    </motion.g>
                  );
                }
                const w = days(t) * ppd;
                const p = Math.max(0, Math.min(1, t.progress ?? 0));
                const labelInside = w > t.name.length * 6.2 + 16;
                return (
                  <motion.g
                    key={r.key}
                    onPointerEnter={() => setHover(t.id)}
                    onPointerLeave={() => !dragRef.current && setHover(null)}
                    onPointerDown={(e) => onBarPointerDown(e, t)}
                    onPointerMove={onBarPointerMove}
                    onPointerUp={(e) => onBarPointerUp(e, t)}
                    initial={anim.entrance ? { opacity: 0, scaleX: 0 } : false}
                    animate={{ opacity: dim ? 0.3 : 1, scaleX: 1 }}
                    transition={anim.reducedMotion ? instant : { scaleX: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: rowDelay(i) }, opacity: { duration: 0.15 } }}
                    style={{ transformBox: "fill-box", transformOrigin: "0% 50%", cursor: editable ? (isDragging ? "grabbing" : "grab") : onTaskClick ? "pointer" : "default", touchAction: editable ? "none" : undefined }}
                  >
                    <motion.rect
                      initial={false}
                      animate={{ x, width: Math.max(2, w) }}
                      transition={anim.reducedMotion || isDragging ? instant : settle}
                      y={by}
                      height={bh}
                      rx={Math.min(6, bh / 2)}
                      fill={withOpacity(color, 0.28)}
                      stroke={isCrit ? "var(--pui-danger)" : conflict ? "var(--pui-danger)" : hover === t.id || isDragging ? color : "none"}
                      strokeWidth={isCrit || conflict || hover === t.id ? 1.5 : 0}
                      strokeDasharray={conflict && !isCrit ? "3 2" : undefined}
                    />
                    <motion.rect
                      initial={false}
                      animate={{ x, width: Math.max(0.01, w * p) }}
                      transition={anim.reducedMotion || isDragging ? instant : settle}
                      y={by}
                      height={bh}
                      rx={Math.min(6, bh / 2)}
                      fill={isCrit ? mix(color, "var(--pui-danger)", 0.55) : color}
                    />
                    {editable ? (
                      <>
                        <rect x={x} y={by} width={6} height={bh} fill="transparent" style={{ cursor: "ew-resize" }} />
                        <rect x={x + w - 6} y={by} width={6} height={bh} fill="transparent" style={{ cursor: "ew-resize" }} />
                      </>
                    ) : null}
                    <text
                      x={labelInside ? x + 8 : x + w + 6}
                      y={by + bh / 2}
                      dy="0.35em"
                      fontSize={10}
                      fontWeight={600}
                      fill={labelInside && p > 0.35 ? "var(--pui-background)" : "var(--pui-foreground)"}
                      pointerEvents="none"
                    >
                      {t.name}
                      {t.progress !== undefined ? <tspan fontWeight={400} opacity={0.75}>{` ${Math.round(p * 100)}%`}</tspan> : null}
                    </text>
                  </motion.g>
                );
              })}
              {todayX !== null ? (
                <g pointerEvents="none">
                  <line x1={todayX} x2={todayX} y1={header - 4} y2={H} stroke="var(--pui-primary)" strokeWidth={1.5} />
                  <rect x={todayX - 20} y={header - 16} width={40} height={14} rx={7} fill="var(--pui-primary)" />
                  <text x={todayX} y={header - 9} dy="0.35em" textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--pui-primary-foreground)">
                    Today
                  </text>
                </g>
              ) : null}
            </svg>
            <AnimatePresence>
              {drag && tipTask ? (
                <motion.div
                  key="pill"
                  aria-hidden="true"
                  initial={anim.reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(blockReset, "pointer-events-none absolute z-20 rounded-pui-md bg-pui-foreground px-2 py-0.5 text-[11px] font-semibold text-pui-background tabular-nums shadow-pui-md")}
                  style={{ left: xOf(tipTask.start), top: yOf(tipRow ?? 0) - 22 }}
                >
                  {fmtShort(tipTask.start)}
                  {tipTask.milestone ? "" : ` \u2192 ${fmtShort(tipTask.end)} \u00b7 ${days(tipTask)}d`}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <ChartTip open={!!tip && !drag} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
              {tipTask ? (
                <>
                  <div className={cn(blockReset, "mb-1 flex items-center gap-1.5 text-xs font-semibold")}>
                    <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-pui-full")} style={{ background: tipTask.color ?? groupColor.get(tipTask.group ?? "") }} />
                    {tipTask.name}
                  </div>
                  <TipRow label={tipTask.milestone ? "Date" : "Dates"} value={tipTask.milestone ? fmtShort(tipTask.start) : `${fmtShort(tipTask.start)} \u2013 ${fmtShort(tipTask.end)}`} />
                  {!tipTask.milestone ? <TipRow label="Duration" value={`${days(tipTask)} days`} tone="muted" /> : null}
                  {tipTask.progress !== undefined ? <TipRow label="Progress" value={`${Math.round(tipTask.progress * 100)}%`} tone={tipTask.progress >= 1 ? "up" : undefined} /> : null}
                  {tipTask.assignee ? <TipRow label="Owner" value={tipTask.assignee} tone="muted" /> : null}
                  {tipTask.dependsOn?.length ? <TipRow label="After" value={tipTask.dependsOn.map((d) => byId.get(d)?.name ?? d).join(", ")} tone="muted" /> : null}
                  {conflictsOf(tipTask).length ? <div className={cn(blockReset, "mt-1 text-[11px] font-semibold text-pui-danger-text")}>Starts before its dependency ends</div> : null}
                  {critical.has(tipTask.id) ? <div className={cn(blockReset, "mt-1 text-[11px] font-semibold text-pui-danger-text")}>On the critical path</div> : null}
                </>
              ) : null}
            </ChartTip>
          </div>
        </div>
      </div>
      <span id={`${uid}-help`} className={srOnly}>
        Up and down arrows move between rows, left and right collapse and expand groups, Enter toggles a group or activates a task, plus and minus zoom the timeline.
        {editable ? " Alt with left or right arrow moves the task; add Shift to resize its end." : ""}
      </span>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
});
