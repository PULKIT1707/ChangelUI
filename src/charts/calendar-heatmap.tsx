"use client";

// Calendar heatmap: a GitHub-style year of weeks or a set of month calendars, colored in levels
// on the sequential ramp. Cells fade and scale in column by column, hovering the "Less -> More"
// legend isolates a level (click pins it), the stats strip shows totals and streaks (hovering a
// streak outlines its days), the tooltip names the day, and one tab stop walks the grid with the
// arrow keys (left/right and up/down follow the visual layout) with a polite announcement.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { addDays, addMonths, dayDelta, dayOfWeek, formatISO, startOfWeek, weekdayNames, type WeekDay } from "../lib/date";
import { cn } from "../lib/cn";
import { useLatestRef } from "../lib/use-latest-ref";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { sequentialColor } from "./core/color";
import { formatNumber, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTip, useChartUid } from "./core/frame";
import { quantileSorted } from "./core/stats";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface CalendarDay<T> {
  /** "YYYY-MM-DD". */
  date: string;
  value: number;
  level: number;
  /** Rows that fell on this day (values are summed). */
  data: readonly T[];
}

export interface CalendarHeatmapProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  data: readonly T[];
  /** ISO date string, epoch ms or Date (read in UTC). */
  date: Accessor<T, string | number | Date>;
  value: Accessor<T, number | null | undefined>;
  /** First day shown ("YYYY-MM-DD"). Default: Jan 1 of `year`, else the first data day. */
  start?: string;
  /** Last day shown. Default: Dec 31 of `year`, else the last data day. */
  end?: string;
  year?: number;
  /** 0 = Sunday (default), 1 = Monday. */
  weekStartsOn?: WeekDay;
  /** Color levels including the empty level. Default 5. */
  levels?: number;
  /** Upper bounds for levels 1..levels-2 (default: quantiles of the non-zero days). */
  thresholds?: readonly number[];
  /** "year": weeks as columns (default). "month": one calendar per month. */
  layout?: "year" | "month";
  /** Largest cell in px. Default 15 (year), 30 (month). */
  maxCellSize?: number;
  /** Gap in px. Default 3. */
  gap?: number;
  /** Corner radius. Default 3. */
  radius?: number;
  /** Singular and plural unit for tooltips and announcements. Default ["contribution", "contributions"]. */
  unit?: readonly [string, string];
  /** "Less -> More" legend that filters by level. Default true. */
  legend?: boolean;
  /** Totals and streaks strip. Default true. */
  stats?: boolean;
  /** Highlighted day. */
  selectedDate?: string | null;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  onDateClick?: (day: CalendarDay<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveDateChange?: (day: CalendarDay<T> | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface Cell {
  /** Day offset from start. */
  i: number;
  iso: string;
  x: number;
  y: number;
  /** Entrance column. */
  col: number;
}

const toISO = (v: string | number | Date): string | null => {
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
  const t = +v;
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

/** Longest and current (ending on the last day) runs of non-zero days. */
export function calendarStreaks(values: readonly number[]): { longest: [number, number] | null; current: number } {
  let best: [number, number] | null = null;
  let runStart = -1;
  for (let i = 0; i <= values.length; i++) {
    const on = i < values.length && (values[i] as number) > 0;
    if (on && runStart < 0) runStart = i;
    if (!on && runStart >= 0) {
      if (!best || i - 1 - runStart > best[1] - best[0]) best = [runStart, i - 1];
      runStart = -1;
    }
  }
  let current = 0;
  for (let i = values.length - 1; i >= 0 && (values[i] as number) > 0; i--) current++;
  return { longest: best, current };
}

function CalendarHeatmapInner<T>(props: CalendarHeatmapProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    date,
    value,
    start: startProp,
    end: endProp,
    year,
    weekStartsOn = 0,
    levels: levelsProp = 5,
    thresholds: thresholdsProp,
    layout = "year",
    maxCellSize,
    gap = 3,
    radius = 3,
    unit = ["contribution", "contributions"],
    legend = true,
    stats = true,
    selectedDate = null,
    format,
    locale = "en-US",
    initialWidth = 720,
    animation = "auto",
    title,
    description,
    titleAs,
    onDateClick,
    onActiveDateChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height: 100 });
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [levelHover, setLevelHover] = React.useState<number | null>(null);
  const [levelPinned, setLevelPinned] = React.useState<number | null>(null);
  const [streakHover, setStreakHover] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const levels = Math.max(2, Math.min(9, Math.floor(levelsProp)));
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const unitOf = (v: number) => (v === 1 ? unit[0] : unit[1]);

  // Days.
  const model = React.useMemo(() => {
    const byDay = new Map<string, { v: number; rows: T[] }>();
    let lo: string | null = null;
    let hi: string | null = null;
    data.forEach((d, i) => {
      const iso = toISO(readAccessor(date, d, i));
      const v = readAccessor(value, d, i);
      if (!iso) return;
      const slot = byDay.get(iso) ?? { v: 0, rows: [] };
      if (typeof v === "number" && Number.isFinite(v)) slot.v += v;
      slot.rows.push(d);
      byDay.set(iso, slot);
      if (!lo || iso < lo) lo = iso;
      if (!hi || iso > hi) hi = iso;
    });
    const start = startProp ?? (year !== undefined ? `${year}-01-01` : (lo ?? "2026-01-01"));
    const end = endProp ?? (year !== undefined ? `${year}-12-31` : (hi ?? addDays(start, 364)));
    const count = Math.max(1, dayDelta(start, end) + 1);
    const isos: string[] = [];
    const vals: number[] = [];
    const rows: T[][] = [];
    for (let i = 0; i < count; i++) {
      const iso = addDays(start, i);
      const slot = byDay.get(iso);
      isos.push(iso);
      vals.push(slot?.v ?? 0);
      rows.push(slot?.rows ?? []);
    }
    return { start, end, count, isos, vals, rows };
  }, [data, date, value, startProp, endProp, year]);
  const { start, count, isos, vals } = model;

  const thresholds = React.useMemo(() => {
    if (thresholdsProp) return [...thresholdsProp];
    const pos = vals.filter((v) => v > 0).sort((a, b) => a - b);
    if (!pos.length) return [];
    return Array.from({ length: levels - 2 }, (_, k) => quantileSorted(pos, (k + 1) / (levels - 1)) ?? 0);
  }, [thresholdsProp, vals, levels]);
  const levelOf = (v: number) => {
    if (!(v > 0)) return 0;
    let k = 1;
    for (const t of thresholds) if (v > t) k++;
    return Math.min(levels - 1, k);
  };
  const levelColor = (k: number) => (k === 0 ? "var(--pui-muted)" : sequentialColor(levels <= 2 ? 1 : 0.28 + (0.72 * (k - 1)) / (levels - 2)));

  const total = vals.reduce((a, b) => a + b, 0);
  const activeDays = vals.filter((v) => v > 0).length;
  const streaks = React.useMemo(() => calendarStreaks(vals), [vals]);
  let bestIndex = -1;
  vals.forEach((v, i) => {
    if (v > 0 && (bestIndex < 0 || v > (vals[bestIndex] as number))) bestIndex = i;
  });

  // Geometry.
  const W = Math.max(160, width);
  const month = layout === "month";
  const weekNames = weekdayNames(locale, weekStartsOn, "short");
  const geo = React.useMemo(() => {
    const cells: Cell[] = [];
    const labels: Array<{ x: number; y: number; text: string; anchor: "start" | "end" | "middle"; strong?: boolean }> = [];
    if (!month) {
      const first = startOfWeek(start, weekStartsOn);
      const weeks = Math.ceil((dayDelta(first, start) + count) / 7);
      const left = 30;
      const top = 18;
      const cs = Math.max(4, Math.min(maxCellSize ?? 15, (W - left - gap * (weeks - 1)) / weeks));
      for (let i = 0; i < count; i++) {
        const off = dayDelta(first, isos[i] as string);
        const col = Math.floor(off / 7);
        const row = off % 7;
        cells.push({ i, iso: isos[i] as string, x: left + col * (cs + gap), y: top + row * (cs + gap), col });
        if ((isos[i] as string).endsWith("-01") || i === 0) {
          const x = left + col * (cs + gap);
          const prev = labels[labels.length - 1];
          if (!prev || x - prev.x > 26) labels.push({ x, y: 11, text: formatISO(isos[i] as string, locale, { month: "short" }), anchor: "start" });
        }
      }
      [1, 3, 5].forEach((r) => labels.push({ x: left - 6, y: top + r * (cs + gap) + cs / 2 + 3.5, text: weekNames[r] as string, anchor: "end" }));
      return { cells, labels, cs, H: top + 7 * (cs + gap) - gap, colCount: weeks, monthBoxes: [] as Array<{ x: number; y: number; w: number; h: number }> };
    }
    // Month calendars.
    const firstMonth = start.slice(0, 7);
    const lastISO = isos[count - 1] as string;
    const monthsCount = (Number(lastISO.slice(0, 4)) - Number(firstMonth.slice(0, 4))) * 12 + Number(lastISO.slice(5, 7)) - Number(firstMonth.slice(5, 7)) + 1;
    const gutter = 20;
    const target = maxCellSize ?? 30;
    const columns = Math.max(1, Math.min(monthsCount, Math.floor((W + gutter) / (7 * (Math.min(target, 22) + gap) + gutter))));
    const mw = (W - gutter * (columns - 1)) / columns;
    const cs = Math.max(8, Math.min(target, (mw - gap * 6) / 7));
    const blockW = 7 * cs + 6 * gap;
    const head = 34;
    const blockH = head + 6 * (cs + gap);
    const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    let col = 0;
    for (let mI = 0; mI < monthsCount; mI++) {
      const mStart = addMonths(`${firstMonth}-01`, mI);
      const bx = (mI % columns) * (mw + gutter);
      const by = Math.floor(mI / columns) * (blockH + 14);
      boxes.push({ x: bx, y: by, w: blockW, h: blockH });
      labels.push({ x: bx, y: by + 12, text: formatISO(mStart, locale, { month: "long", year: monthsCount > 12 || mI === 0 || mStart.endsWith("01-01") ? "numeric" : undefined }), anchor: "start", strong: true });
      weekNames.forEach((w, k) => labels.push({ x: bx + k * (cs + gap) + cs / 2, y: by + 28, text: w.slice(0, 2), anchor: "middle" }));
      const lead = (dayOfWeek(mStart) - weekStartsOn + 7) % 7;
      const offset = dayDelta(start, mStart);
      const days = dayDelta(mStart, addMonths(mStart, 1));
      for (let d = 0; d < days; d++) {
        const i = offset + d;
        if (i < 0 || i >= count) continue;
        const slot = lead + d;
        cells.push({ i, iso: isos[i] as string, x: bx + (slot % 7) * (cs + gap), y: by + head + Math.floor(slot / 7) * (cs + gap), col: col + (slot % 7) });
      }
      col += 2;
    }
    const rowsN = Math.ceil(monthsCount / columns);
    return { cells, labels, cs, H: rowsN * (blockH + 14) - 14, colCount: col + 7, monthBoxes: boxes };
  }, [month, start, weekStartsOn, count, isos, W, gap, maxCellSize, locale, weekNames]);
  const { cells, cs, H } = geo;
  const byIndex = React.useMemo(() => {
    const a: Cell[] = [];
    for (const c of cells) a[c.i] = c;
    return a;
  }, [cells]);

  const active = focus ?? hover;
  const dayAt = (i: number): CalendarDay<T> => ({ date: isos[i] as string, value: vals[i] as number, level: levelOf(vals[i] as number), data: model.rows[i] ?? [] });
  const dayAtRef = useLatestRef(dayAt);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveDateChange?.(active === null ? null : dayAtRef.current(active));
  }, [active, onActiveDateChange, dayAtRef]);

  const longDate = (iso: string) => formatISO(iso, locale, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const describe = (i: number) => {
    const v = vals[i] as number;
    return `${v ? fmt(v) : "No"} ${unitOf(v)} on ${longDate(isos[i] as string)}.`;
  };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const py = ((event.clientY - rect.top) / rect.height) * H;
    const half = gap / 2;
    for (const c of cells) if (px >= c.x - half && px <= c.x + cs + half && py >= c.y - half && py <= c.y + cs + half) return c.i;
    return null;
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const cur = focus ?? (selectedDate ? Math.max(0, Math.min(count - 1, dayDelta(start, selectedDate))) : count - 1);
    const h = month ? 1 : 7;
    const v = month ? 7 : 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = cur + h;
    else if (event.key === "ArrowLeft") next = cur - h;
    else if (event.key === "ArrowDown") next = cur + v;
    else if (event.key === "ArrowUp") next = cur - v;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === "PageDown") next = dayDelta(start, addMonths(isos[cur] as string, 1));
    else if (event.key === "PageUp") next = dayDelta(start, addMonths(isos[cur] as string, -1));
    else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      onDateClick?.(dayAt(focus), event);
      return;
    } else if (event.key === "Escape" && focus !== null) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((s) => !s);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    if (focus === null && !(event.key === "Home" || event.key === "End")) next = cur;
    next = Math.max(0, Math.min(count - 1, next));
    setFocus(next);
    setAnnouncement(describe(next));
  };

  const levelFilter = levelPinned ?? levelHover;
  const inStreak = (i: number) => streakHover && streaks.longest !== null && i >= streaks.longest[0] && i <= streaks.longest[1];
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Calendar heatmap");
  const summaryText =
    summary ??
    `${fmt(total)} ${unitOf(total)} from ${formatISO(start, locale, { dateStyle: "medium" })} to ${formatISO(model.end, locale, { dateStyle: "medium" })}, on ${activeDays} of ${count} days.${
      bestIndex >= 0 ? ` Busiest day ${formatISO(isos[bestIndex] as string, locale, { dateStyle: "medium" })} with ${fmt(vals[bestIndex] as number)}.` : ""
    }${streaks.longest ? ` Longest streak ${streaks.longest[1] - streaks.longest[0] + 1} days.` : ""}`;
  const activeCell = active !== null ? byIndex[active] : undefined;
  const tip = activeCell ? { left: (activeCell.x + cs / 2) / W, top: activeCell.y / H, flipX: (activeCell.x + cs / 2) / W > 0.62, below: activeCell.y < 40 } : null;
  const colCount = Math.max(1, geo.colCount);
  const tableRows = vals.flatMap((v, i) => (v > 0 ? [[formatISO(isos[i] as string, locale, { dateStyle: "medium" }), fmt(v)]] : []));

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {stats ? (
        <dl className={cn(blockReset, "flex flex-wrap gap-x-6 gap-y-2 text-xs")}>
          {[
            ["Total", `${fmt(total)} ${unitOf(total)}`, null],
            ["Active days", `${activeDays} / ${count}`, null],
            ["Longest streak", streaks.longest ? `${streaks.longest[1] - streaks.longest[0] + 1} days` : "0 days", "streak"],
            ["Current streak", `${streaks.current} days`, null],
          ].map(([name, val, kind]) => (
            <div
              key={name}
              className={cn(blockReset, "flex flex-col gap-0.5 rounded-pui-md px-1.5 py-1 transition-colors", kind ? "cursor-help hover:bg-pui-muted" : "")}
              onPointerEnter={kind ? () => setStreakHover(true) : undefined}
              onPointerLeave={kind ? () => setStreakHover(false) : undefined}
            >
              <dt className={cn(blockReset, "text-pui-muted-foreground")}>{name}</dt>
              <dd className={cn(blockReset, "text-sm font-semibold tabular-nums")}>{val}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {geo.labels.map((l, k) => (
            <text key={k} x={l.x} y={l.y} textAnchor={l.anchor} fontSize={l.strong ? 12 : 10} fontWeight={l.strong ? 600 : 400} fill={l.strong ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
              {l.text}
            </text>
          ))}
          {cells.map((c) => {
            const v = vals[c.i] as number;
            const lvl = levelOf(v);
            const dim = levelFilter !== null && lvl !== levelFilter;
            const isActive = active === c.i;
            const isSelected = selectedDate === c.iso;
            const streak = inStreak(c.i);
            const delay = anim.entrance ? Math.min(0.6, (c.col / colCount) * 0.6 + (c.i % 7) * 0.006) : 0;
            return (
              <g key={c.iso}>
                <motion.rect
                  x={c.x}
                  y={c.y}
                  width={cs}
                  height={cs}
                  rx={Math.min(radius, cs / 2)}
                  initial={anim.entrance ? { opacity: 0, scale: 0.3 } : false}
                  animate={{ opacity: dim ? 0.18 : 1, scale: isActive ? 1.18 : 1 }}
                  transition={
                    anim.reducedMotion
                      ? instant
                      : {
                          opacity: anim.entrance && levelFilter === null && active === null ? { duration: 0.3, delay } : { duration: 0.15 },
                          scale: { type: "spring", stiffness: 420, damping: 26, delay: active === null ? delay : 0 },
                        }
                  }
                  style={{ fill: levelColor(lvl), transition: anim.reducedMotion ? undefined : "fill 300ms", transformBox: "fill-box", transformOrigin: "center" }}
                  stroke={isActive || isSelected ? "var(--pui-foreground)" : streak ? "var(--pui-chart-3)" : "none"}
                  strokeWidth={isActive || isSelected || streak ? 1.5 : 0}
                />
                {month && cs >= 20 ? (
                  <text
                    x={c.x + cs / 2}
                    y={c.y + cs / 2}
                    dy="0.35em"
                    textAnchor="middle"
                    fontSize={Math.min(11, cs * 0.4)}
                    fill={lvl >= Math.ceil(levels / 2) ? "var(--pui-background)" : "var(--pui-muted-foreground)"}
                    opacity={dim ? 0.3 : 1}
                    pointerEvents="none"
                    className="tabular-nums"
                  >
                    {Number(c.iso.slice(8))}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="calendar"
          aria-label={`${nameText}. Use the arrow keys to move between days.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const i = pick(event);
            if (i !== null) onDateClick?.(dayAt(i), event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute -inset-1 rounded-pui-md", onDateClick && hover !== null ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion} className="min-w-0">
          {active !== null ? (
            <>
              <div className={cn(blockReset, "flex items-center gap-1.5 text-sm font-semibold tabular-nums")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px] border border-pui-border")} style={{ background: levelColor(levelOf(vals[active] as number)) }} />
                {(vals[active] as number) ? fmt(vals[active] as number) : "No"} {unitOf(vals[active] as number)}
              </div>
              <div className={cn(blockReset, "text-[11px] text-pui-muted-foreground")}>{longDate(isos[active] as string)}</div>
              {total > 0 && (vals[active] as number) > 0 ? (
                <div className={cn(blockReset, "mt-1 text-[11px] text-pui-muted-foreground tabular-nums")}>
                  {formatNumber((vals[active] as number) / total, { style: "percent", maximumFractionDigits: 1 }, locale)} of the period
                  {active === bestIndex ? " \u00b7 busiest day" : ""}
                </div>
              ) : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {legend ? (
        <div className={cn(blockReset, "flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-pui-muted-foreground")}>
          <span>Less</span>
          {Array.from({ length: levels }, (_, k) => {
            const lo = k === 0 ? 0 : k === 1 ? 0 : (thresholds[k - 2] ?? 0);
            const hi = k === 0 ? 0 : thresholds[k - 1];
            const range = k === 0 ? "None" : hi === undefined ? `> ${fmt(lo)}` : k === 1 ? `up to ${fmt(hi)}` : `${fmt(lo)}\u2013${fmt(hi)}`;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={levelPinned === k}
                aria-label={`Show only level ${k + 1}: ${range}`}
                title={range}
                onPointerEnter={() => setLevelHover(k)}
                onPointerLeave={() => setLevelHover(null)}
                onFocus={() => setLevelHover(k)}
                onBlur={() => setLevelHover(null)}
                onClick={() => setLevelPinned((p) => (p === k ? null : k))}
                className={cn(controlReset, focusRing, "size-3.5 rounded-[3px] transition-transform hover:scale-125", levelPinned === k ? "ring-2 ring-pui-foreground ring-offset-1 ring-offset-pui-background" : "")}
                style={{ background: levelColor(k) }}
              />
            );
          })}
          <span>More</span>
        </div>
      ) : null}
      <span id={`${uid}-help`} className={srOnly}>
        {month ? "Left and right arrows move a day, up and down a week" : "Left and right arrows move a week, up and down a day"}, Page Up and Page Down a month, Home and End to the first and last day, Enter activates, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable caption={`${nameText}: active days`} visible={tableVisible} columns={["Date", "Value"]} rows={tableRows} />
    </ChartFigure>
  );
}

/** GitHub-style contribution grid or month calendars with levels, a filtering legend and streaks. */
export const CalendarHeatmap = React.forwardRef(CalendarHeatmapInner) as (<T>(props: CalendarHeatmapProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
CalendarHeatmap.displayName = "CalendarHeatmap";
