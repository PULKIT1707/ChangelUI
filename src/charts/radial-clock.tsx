"use client";

// Radial clock: when things happen across a day. "hours" is a polar histogram (one sector per bin,
// length = value) over faint full-length tracks; "week" is a 7 x 24 radial heatmap (one ring per
// day). Optional bands mark spans on the rim (business hours, quiet hours) and a "now" hand shows the
// current time. Hover or arrow through bins; the middle reads the bin (or the peak by default).
// Micro: own SVG, only core math. The hand is client-only, so the server render is deterministic.
import { animate, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { categoricalColor, mix, sequentialColor, withOpacity } from "./core/color";
import { ChartTable, useChartUid } from "./core/frame";
import { formatNumber, type NumberFormat } from "./core/format";
import { arcPath, polar } from "./core/path";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const TAU = Math.PI * 2;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface RadialClockBand {
  /** Start hour (0-24, fractions allowed). A band may wrap past midnight (22 -> 6). */
  from: number;
  to: number;
  label: string;
  /** Any CSS color or token. Default: the palette after the main color. */
  color?: string;
}

export interface RadialClockSelection {
  /** Bin index (0 = the first bin after midnight). */
  bin: number;
  /** Start hour of the bin. */
  hour: number;
  /** Row (day) index in the week layout. */
  row?: number;
  value: number;
}

export interface RadialClockProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title" | "onSelect"> {
  /** "hours": one value per bin, evenly spread over 24 h (24 = hourly, 48 = half-hourly). */
  data?: readonly number[];
  /** "week": rows of bins (default 7 days x 24 hours); the first row is the inner ring. */
  matrix?: readonly (readonly number[])[];
  /** Row labels for the week layout. Default Mon..Sun. */
  rowLabels?: readonly string[];
  /** Layout. Default "week" when `matrix` is set, else "hours". */
  layout?: "hours" | "week";
  /** Value at the outer rim. Default the largest value. */
  max?: number;
  /** Drawing size in px (scales down with the container). Default 300. */
  size?: number;
  /** Hole size as a share of the radius. Default 0.3. */
  innerRadius?: number;
  /** Midnight at the top (default) or at the bottom, like a 12-hour face with noon up. */
  startAt?: "midnight-top" | "noon-top";
  /** Hour labels. Default "24h" ("00", "06"); "12h" gives "12a", "6a", "12p". */
  clock?: "24h" | "12h";
  /** Spans drawn on the rim and listed under the dial. */
  bands?: readonly RadialClockBand[];
  /** Show a hand at the current time (client only; true = now, or a fixed Date / epoch ms). */
  nowHand?: boolean | Date | number;
  /** IANA time zone for the hand. Default the viewer's. */
  timeZone?: string;
  /** Main color in the hours layout. Default --pui-chart-1. */
  color?: string;
  /** Plural noun for the readout ("events"). */
  unit?: string;
  /** Controlled selection (pinned bin). */
  selected?: { bin: number; row?: number } | null;
  /** Click, Enter or Escape on a bin. */
  onSelect?: (selection: RadialClockSelection | null) => void;
  format?: NumberFormat;
  locale?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Accessible name when there is no string title. Default "Radial clock". */
  chartLabel?: string;
  animation?: ChartAnimation;
}

const clean = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const pad2 = (n: number) => String(n).padStart(2, "0");

/** "14:00" or "2p" style text for an hour (fractions become minutes). */
export function clockLabel(hour: number, clock: "24h" | "12h" = "24h", short = false): string {
  const h = ((hour % 24) + 24) % 24;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (clock === "12h") {
    const h12 = whole % 12 === 0 ? 12 : whole % 12;
    const suffix = whole < 12 ? "a" : "p";
    return short && min === 0 ? `${h12}${suffix}` : `${h12}:${pad2(min)}${suffix === "a" ? " am" : " pm"}`;
  }
  return short ? pad2(whole) : `${pad2(whole)}:${pad2(min)}`;
}

/** Fractional hour of a time in a time zone (0..24). */
function hourIn(time: number, timeZone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone }).formatToParts(new Date(time));
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return (h % 24) + m / 60;
  } catch {
    const d = new Date(time);
    return d.getHours() + d.getMinutes() / 60;
  }
}

/** The current hour for the hand: null on the server and during hydration (no mismatch). */
function useNowHour(nowHand: RadialClockProps["nowHand"], timeZone?: string): number | null {
  const isClient = useIsClient();
  const fixed = nowHand instanceof Date ? nowHand.getTime() : typeof nowHand === "number" ? nowHand : null;
  const live = nowHand === true;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [live]);
  if (!isClient || !nowHand) return null;
  return hourIn(fixed ?? now, timeZone);
}

function Sector({
  index,
  a0,
  a1,
  inner,
  target,
  c,
  fill,
  entrance,
  updates,
  padAngle,
}: {
  index: number;
  a0: number;
  a1: number;
  inner: number;
  target: number;
  c: number;
  fill: string;
  entrance: boolean;
  updates: boolean;
  padAngle: number;
}) {
  const r = useMotionValue(entrance ? inner : target);
  React.useEffect(() => {
    if (!updates) {
      r.set(target);
      return;
    }
    const controls = animate(r, target, entrance ? { ...chartMotion.sweep, delay: index * 0.02 } : chartMotion.update);
    return () => controls.stop();
  }, [r, target, updates, entrance, index]);
  const d = useTransform(r, (rr) =>
    arcPath({ innerRadius: inner, outerRadius: Math.max(inner + 1.5, rr), startAngle: a0, endAngle: a1, padAngle, cornerRadius: 2.5, cx: c, cy: c }),
  );
  return <motion.path d={d} fill={fill} style={{ transition: "fill 180ms" }} />;
}

/** A 24-hour polar histogram or 7 x 24 radial heatmap with rim bands, a live "now" hand and a peak readout. */
export const RadialClock = React.forwardRef<HTMLElement, RadialClockProps>(function RadialClock(
  {
    data,
    matrix,
    rowLabels = DAYS,
    layout: layoutProp,
    max: maxProp,
    size = 300,
    innerRadius = 0.3,
    startAt = "midnight-top",
    clock = "24h",
    bands,
    nowHand = false,
    timeZone,
    color = categoricalColor(0),
    unit,
    selected: selectedProp,
    onSelect,
    format,
    locale = "en-US",
    title,
    description,
    titleAs: TitleTag = "h3",
    chartLabel = "Radial clock",
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const layout = layoutProp ?? (matrix ? "week" : "hours");
  const rows: number[][] = React.useMemo(
    () => (layout === "week" ? (matrix ?? []).map((row) => row.map(clean)) : [(data ?? matrix?.[0] ?? []).map(clean)]),
    [layout, matrix, data],
  );
  const bins = Math.max(1, ...rows.map((r) => r.length));
  const hoursPerBin = 24 / bins;
  const max = maxProp && maxProp > 0 ? maxProp : Math.max(1e-9, ...rows.flat());
  const total = rows.flat().reduce((a, v) => a + v, 0);
  const fmt = (v: number) => formatNumber(v, format ?? { maximumFractionDigits: 0 }, locale);
  const unitText = unit ? ` ${unit}` : "";
  const rowName = (k: number) => rowLabels[k] ?? `Row ${k + 1}`;
  const range = (bin: number) => `${clockLabel(bin * hoursPerBin, clock)}–${clockLabel((bin + 1) * hoursPerBin, clock)}`;
  // Compact form for the middle readout: "15–16h" / "3–4p", or the start time for sub-hour bins.
  const shortRange = (bin: number) => {
    const a = bin * hoursPerBin;
    const b = (bin + 1) * hoursPerBin;
    if (!Number.isInteger(a) || !Number.isInteger(b)) return clockLabel(a, clock);
    return clock === "12h" ? `${clockLabel(a, clock, true)}–${clockLabel(b, clock, true)}` : `${pad2(a % 24)}–${pad2(b % 24 || 24)}h`;
  };

  // Geometry (viewBox units = px at full size).
  const S = size;
  const c = S / 2;
  const bandW = bands?.length ? 5 : 0;
  const labelR = c - 11;
  const outer = c - 24 - (bandW ? bandW + 4 : 0);
  const inner = Math.max(8, outer * Math.min(0.8, Math.max(0.05, innerRadius)));
  const rot = startAt === "noon-top" ? Math.PI : 0;
  const step = TAU / bins;
  const angleOf = (hour: number) => rot + (hour / 24) * TAU;
  const ringW = (outer - inner) / Math.max(1, rows.length);

  // Selection: hover > keyboard focus > pinned.
  const [hover, setHover] = React.useState<{ bin: number; row: number } | null>(null);
  const [focus, setFocus] = React.useState<{ bin: number; row: number } | null>(null);
  const [pinnedInner, setPinnedInner] = React.useState<{ bin: number; row?: number } | null>(null);
  const pinned = selectedProp !== undefined ? selectedProp : pinnedInner;
  const [tableVisible, setTableVisible] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const active = hover ?? focus ?? (pinned ? { bin: pinned.bin, row: pinned.row ?? 0 } : null);
  const valueAt = (bin: number, row: number) => rows[row]?.[bin] ?? 0;

  let peak = { bin: 0, row: 0, value: -1 };
  let low = { bin: 0, row: 0, value: Infinity };
  rows.forEach((r, row) =>
    r.forEach((v, bin) => {
      if (v > peak.value) peak = { bin, row, value: v };
      if (v < low.value) low = { bin, row, value: v };
    }),
  );
  const hasData = rows.some((r) => r.length > 0);
  const where = (s: { bin: number; row: number }) => (layout === "week" ? `${rowName(s.row)} ${range(s.bin)}` : range(s.bin));
  const describe = (s: { bin: number; row: number }) => `${where(s)}: ${fmt(valueAt(s.bin, s.row))}${unitText}`;
  const summary = hasData
    ? `Busiest ${describe(peak)}; quietest ${describe(low)}. Total ${fmt(total)}${unitText}.${bands?.length ? ` Marked: ${bands.map((b) => `${b.label} ${clockLabel(b.from, clock)}–${clockLabel(b.to, clock)}`).join(", ")}.` : ""}`
    : `${chartLabel}: no data.`;

  const commit = (s: { bin: number; row: number } | null) => {
    const same = s && pinned && pinned.bin === s.bin && (pinned.row ?? 0) === s.row;
    const next = same ? null : s;
    if (selectedProp === undefined) setPinnedInner(next);
    onSelect?.(next ? { bin: next.bin, hour: next.bin * hoursPerBin, row: layout === "week" ? next.row : undefined, value: valueAt(next.bin, next.row) } : null);
  };

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const x = ((event.clientX - rect.left) / rect.width) * S - c;
    const y = ((event.clientY - rect.top) / rect.height) * S - c;
    const d = Math.hypot(x, y);
    if (d < inner - 4 || d > outer + 6) return null;
    const a = (((Math.atan2(x, -y) - rot) % TAU) + TAU) % TAU;
    const bin = Math.min(bins - 1, Math.floor(a / step));
    const row = layout === "week" ? Math.min(rows.length - 1, Math.max(0, Math.floor((d - inner) / ringW))) : 0;
    return { bin, row };
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || !hasData) return;
    const cur = focus ?? (pinned ? { bin: pinned.bin, row: pinned.row ?? 0 } : null);
    let next: { bin: number; row: number } | null = null;
    const k = event.key;
    if (k === "ArrowRight") next = cur ? { ...cur, bin: (cur.bin + 1) % bins } : { bin: 0, row: 0 };
    else if (k === "ArrowLeft") next = cur ? { ...cur, bin: (cur.bin - 1 + bins) % bins } : { bin: bins - 1, row: 0 };
    else if (k === "ArrowUp" && layout === "week") next = cur ? { ...cur, row: Math.min(rows.length - 1, cur.row + 1) } : { bin: 0, row: 0 };
    else if (k === "ArrowDown" && layout === "week") next = cur ? { ...cur, row: Math.max(0, cur.row - 1) } : { bin: 0, row: 0 };
    else if (k === "Home") next = { bin: 0, row: cur?.row ?? 0 };
    else if (k === "End") next = { bin: bins - 1, row: cur?.row ?? 0 };
    else if (k === "PageUp" || k === "PageDown") {
      const jump = Math.max(1, Math.round(bins / 8));
      const b = cur?.bin ?? 0;
      next = { bin: (b + (k === "PageDown" ? jump : -jump) + bins) % bins, row: cur?.row ?? 0 };
    } else if ((k === "Enter" || k === " ") && cur) {
      event.preventDefault();
      commit(cur);
      return;
    } else if (k === "Escape" && pinned) {
      event.preventDefault();
      if (selectedProp === undefined) setPinnedInner(null);
      onSelect?.(null);
      return;
    } else if (k === "t" || k === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    const share = total ? ` (${Math.round((valueAt(next.bin, next.row) / total) * 1000) / 10}% of the total)` : "";
    setAnnouncement(`${describe(next)}${share}.`);
  };

  const nowHour = useNowHour(nowHand, timeZone);
  const padAngle = Math.min(step * 0.3, 2 / Math.max(1, outer));
  const tickEvery = bins >= 24 ? (S >= 240 ? 3 : 6) : 24 / bins >= 3 ? 24 / bins : 3;
  const ticks = Array.from({ length: Math.floor(24 / tickEvery) }, (_, i) => i * tickEvery);
  const shown = active ?? (hasData ? peak : null);
  const shownValue = shown ? valueAt(shown.bin, shown.row) : 0;
  const centerPx = Math.max(13, Math.min(30, inner * 0.42));
  const readColor = layout === "week" ? "var(--pui-foreground)" : mix(color, "var(--pui-foreground)", 0.55);

  const drawing = (
    <div className={cn(blockReset, "relative shrink-0")} style={{ width: S, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
        {/* Rings at 50% and 100% of max (hours) */}
        {layout === "hours" ? (
          <g fill="none" stroke="var(--pui-border)" strokeWidth={1}>
            <circle cx={c} cy={c} r={inner + (outer - inner) * 0.5} strokeDasharray="2 4" />
            <circle cx={c} cy={c} r={outer} strokeOpacity={0.7} />
          </g>
        ) : null}
        {layout === "hours"
          ? rows[0]!.map((v, bin) => {
              const a0 = rot + bin * step;
              const isActive = !!active && active.bin === bin;
              const dim = !!active && !isActive;
              const t = v / max;
              const base = mix(color, "var(--pui-background)", 0.4 + 0.6 * Math.min(1, t));
              return (
                <g key={bin}>
                  <path
                    d={arcPath({ innerRadius: inner, outerRadius: outer, startAngle: a0, endAngle: a0 + step, padAngle, cornerRadius: 2.5, cx: c, cy: c })}
                    fill={isActive ? withOpacity(color, 0.16) : "var(--pui-muted)"}
                    fillOpacity={isActive ? 1 : 0.55}
                  />
                  <Sector
                    index={bin}
                    a0={a0}
                    a1={a0 + step}
                    inner={inner}
                    target={inner + (outer - inner) * Math.min(1, t)}
                    c={c}
                    fill={isActive ? color : dim ? withOpacity(base, 0.45) : base}
                    entrance={anim.entrance}
                    updates={anim.updates}
                    padAngle={padAngle}
                  />
                </g>
              );
            })
          : rows.map((r, row) =>
              Array.from({ length: bins }, (_, bin) => {
                const v = r[bin] ?? 0;
                const a0 = rot + bin * step;
                const isActive = !!active && active.bin === bin && active.row === row;
                const inRow = !!active && (active.row === row || active.bin === bin);
                const fill = v > 0 ? sequentialColor(0.12 + 0.88 * Math.min(1, v / max)) : "var(--pui-muted)";
                return (
                  <motion.path
                    key={`${row}-${bin}`}
                    d={arcPath({
                      innerRadius: inner + row * ringW + 0.75,
                      outerRadius: inner + (row + 1) * ringW - 0.75,
                      startAngle: a0,
                      endAngle: a0 + step,
                      padAngle: 1.5 / (inner + (row + 0.5) * ringW),
                      cornerRadius: 1.5,
                      cx: c,
                      cy: c,
                    })}
                    fill={fill}
                    stroke={isActive ? "var(--pui-foreground)" : "none"}
                    strokeWidth={1.5}
                    initial={anim.entrance ? { opacity: 0 } : false}
                    animate={{ opacity: active && !inRow ? 0.45 : 1 }}
                    transition={anim.reducedMotion ? instant : anim.entrance ? { duration: 0.35, delay: bin * 0.02 + row * 0.03 } : chartMotion.fade}
                  />
                );
              }),
            )}
        {/* Rim bands */}
        {bands?.map((b, i) => {
          const from = ((b.from % 24) + 24) % 24;
          let to = ((b.to % 24) + 24) % 24;
          if (to <= from) to += 24;
          const r0 = outer + 4;
          return (
            <path
              key={`${b.label}-${i}`}
              d={arcPath({ innerRadius: r0, outerRadius: r0 + bandW, startAngle: angleOf(from), endAngle: angleOf(to), cornerRadius: bandW / 2, cx: c, cy: c })}
              fill={b.color ?? categoricalColor(i + 1)}
            />
          );
        })}
        {/* Hour labels */}
        {ticks.map((h) => {
          const [x, y] = polar(angleOf(h), labelR, c, c);
          const major = h % 6 === 0;
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={major ? 11 : 10}
              fontWeight={major ? 600 : 400}
              fill={major ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {clockLabel(h, clock, true)}
            </text>
          );
        })}
        {/* Row initials along the top seam (week) */}
        {layout === "week" && ringW >= 10
          ? rows.map((_, row) => {
              const [x, y] = polar(rot, inner + (row + 0.5) * ringW, c, c);
              return (
                <text
                  key={row}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(10, ringW * 0.72)}
                  fontWeight={600}
                  fill="var(--pui-foreground)"
                  stroke="var(--pui-background)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {rowName(row).slice(0, 1)}
                </text>
              );
            })
          : null}
        {nowHour !== null ? (
          <motion.g initial={anim.entrance ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={anim.reducedMotion ? instant : { duration: 0.4, delay: 0.5 }}>
            {(() => {
              const a = angleOf(nowHour);
              const [x0, y0] = polar(a, inner - 3, c, c);
              const [x1, y1] = polar(a, outer + (bandW ? bandW + 6 : 4), c, c);
              return (
                <>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--pui-background)" strokeWidth={5} strokeLinecap="round" />
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--pui-danger)" strokeWidth={2} strokeLinecap="round" />
                  <circle cx={x1} cy={y1} r={3.5} fill="var(--pui-danger)" stroke="var(--pui-background)" strokeWidth={1.5} />
                </>
              );
            })()}
          </motion.g>
        ) : null}
      </svg>
      {inner > 22 && shown ? (
        <div
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute flex flex-col items-center justify-center overflow-hidden rounded-pui-full text-center leading-none")}
          style={{ inset: `${((c - inner + 4) / S) * 100}%` }}
        >
          <span className={cn(blockReset, "max-w-full truncate text-[10px] font-medium uppercase tracking-wide text-pui-muted-foreground")}>
            {active ? (layout === "week" ? rowName(shown.row) : "Selected") : "Peak"}
          </span>
          <span className={cn(blockReset, "mt-1 font-semibold tracking-tight tabular-nums")} style={{ fontSize: centerPx, color: readColor }}>
            {fmt(shownValue)}
          </span>
          {inner > 30 ? (
            <span className={cn(blockReset, "mt-1 max-w-full truncate text-[11px] tabular-nums text-pui-muted-foreground")}>
              {layout === "week" && !active ? `${rowName(shown.row).slice(0, 3)} ` : ""}
              {shortRange(shown.bin)}
            </span>
          ) : null}
        </div>
      ) : null}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- role="application" is the dial's keyboard surface, like the other charts */}
      <div
        tabIndex={0}
        role="application"
        aria-roledescription="interactive chart"
        aria-label={`${typeof title === "string" ? title : chartLabel}. Use arrow keys to move between ${layout === "week" ? "hours and days" : "hours"}.`}
        aria-describedby={`${uid}-help`}
        onPointerMove={(event) => setHover(pick(event))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(event) => {
          const s = pick(event);
          if (s) commit(s);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setFocus(null)}
        className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-full", hover ? "cursor-pointer" : "cursor-default")}
        style={{ touchAction: "pan-y" }}
      />
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
    </div>
  );

  const titleId = `${uid}-title`;
  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : chartLabel}
      aria-describedby={`${uid}-summary`}
      data-layout={layout}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col items-center gap-3 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex w-full flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={titleId} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      {drawing}
      {bands?.length || layout === "week" ? (
        <div aria-hidden="true" className={cn(blockReset, "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-pui-muted-foreground")}>
          {bands?.map((b, i) => (
            <span key={`${b.label}-${i}`} className={cn(blockReset, "inline-flex items-center gap-1.5")}>
              <span className={cn(blockReset, "h-1.5 w-4 rounded-pui-full")} style={{ background: b.color ?? categoricalColor(i + 1) }} />
              <span className={cn(blockReset, "text-pui-foreground")}>{b.label}</span>
              <span className={cn(blockReset, "tabular-nums")}>
                {clockLabel(b.from, clock)}–{clockLabel(b.to, clock)}
              </span>
            </span>
          ))}
          {layout === "week" ? (
            <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
              <span>Less</span>
              {[0.12, 0.34, 0.56, 0.78, 1].map((t) => (
                <span key={t} className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: sequentialColor(t) }} />
              ))}
              <span>More</span>
              <span className={cn(blockReset, "ms-1")}>
                · {rowName(0)} inside, {rowName(rows.length - 1)} outside
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
      <span id={`${uid}-help`} className={srOnly}>
        Arrow keys move between hours{layout === "week" ? ", up and down move between days" : ""}, Home and End jump to the ends, Enter selects, Escape clears, T shows the data
        table.
      </span>
      <p id={`${uid}-summary`} className={srOnly}>
        {summary}
      </p>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={typeof title === "string" ? title : chartLabel}
        columns={layout === "week" ? ["Day", ...Array.from({ length: bins }, (_, b) => clockLabel(b * hoursPerBin, clock))] : ["Time", "Value"]}
        rows={layout === "week" ? rows.map((r, row) => [rowName(row), ...Array.from({ length: bins }, (_, b) => fmt(r[b] ?? 0))]) : rows[0]!.map((v, bin) => [range(bin), fmt(v)])}
        visible={tableVisible}
      />
    </figure>
  );
});
