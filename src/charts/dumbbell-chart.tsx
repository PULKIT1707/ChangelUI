"use client";

// Dumbbell chart: the gap between two values per category (start and end dots joined by a bar),
// or a lollipop of one value from zero. On entrance the end dot slides out of the start dot while
// the connector grows behind it; sorting by gap, start, end or label re-orders rows on a layout
// spring. Hovering a row lights it, prints the signed gap above the connector and shows a tooltip;
// up/down keys walk rows with "Label: 12 to 18, gap +6 (+50%)" announcements.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartChips, ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, useChartUid } from "./core/frame";
import { scaleLinear } from "./core/scale";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

export interface DumbbellRow {
  label: string;
  index: number;
  start: number;
  end: number;
  gap: number;
  /** Relative gap (end / start - 1), or null when start is 0. */
  pct: number | null;
}

export interface DumbbellChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  label: Accessor<T, string>;
  /** First value (ignored by lollipops). */
  start?: Accessor<T, number | null | undefined>;
  /** Second value (the lollipop value). */
  end: Accessor<T, number | null | undefined>;
  /** Default "dumbbell". */
  variant?: "dumbbell" | "lollipop";
  /** Row order. Default "none" (data order). */
  sort?: "none" | "gap" | "start" | "end" | "label";
  /** Default "desc" (largest first; "label" sorts A to Z either way unless "desc" flips it). */
  sortDirection?: "asc" | "desc";
  /** Legend names. Default "Start" / "End". */
  labels?: { start?: string; end?: string };
  /** Connector color: neutral, or green/red by the sign of the gap. Default "neutral". */
  colorBy?: "neutral" | "direction";
  /** Colors for the two dots. */
  colors?: { start?: string; end?: string };
  /** Values next to the dots: on hover only, always, or never. Default "hover". */
  showValues?: "hover" | "always" | "none";
  /** A dashed line at the average of the end values. */
  showAverage?: boolean;
  domain?: readonly [number, number];
  format?: NumberFormat;
  locale?: string;
  /** Name of the measure ("Score"). */
  measure?: string;
  /** Row height in px. Default 32. */
  rowHeight?: number;
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onRowClick?: (row: DumbbellRow, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveRowChange?: (row: DumbbellRow | null) => void;
  summary?: string;
  chartLabel?: string;
}

function DumbbellChartInner<T>(props: DumbbellChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    label,
    start,
    end,
    variant = "dumbbell",
    sort = "none",
    sortDirection = "desc",
    labels,
    colorBy = "neutral",
    colors,
    showValues = "hover",
    showAverage = false,
    domain,
    format,
    locale = "en-US",
    measure = "Value",
    rowHeight = 32,
    height,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onRowClick,
    onActiveRowChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const lollipop = variant === "lollipop" || !start;
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }), [locale]);
  const startName = labels?.start ?? "Start";
  const endName = labels?.end ?? (lollipop ? measure : "End");
  const startColor = colors?.start ?? "var(--pui-muted-foreground)";
  const endColor = colors?.end ?? categoricalColor(0);

  const rows: DumbbellRow[] = React.useMemo(() => {
    const out: DumbbellRow[] = [];
    data.forEach((d, i) => {
      const b = readAccessor(end, d, i);
      const a = lollipop ? 0 : start ? readAccessor(start, d, i) : 0;
      if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) return;
      out.push({ label: String(readAccessor(label, d, i)), index: out.length, start: a, end: b, gap: b - a, pct: a !== 0 ? b / a - 1 : null });
    });
    return out;
  }, [data, label, start, end, lollipop]);

  const ordered = React.useMemo(() => {
    if (sort === "none") return rows;
    const dir = sortDirection === "asc" ? 1 : -1;
    const key = (r: DumbbellRow) => (sort === "gap" ? r.gap : sort === "start" ? r.start : r.end);
    return [...rows].sort((a, b) => (sort === "label" ? a.label.localeCompare(b.label) * (sortDirection === "desc" ? -1 : 1) : (key(a) - key(b)) * dir) || a.index - b.index);
  }, [rows, sort, sortDirection]);
  const slot = React.useMemo(() => {
    const map = new Map<number, number>();
    ordered.forEach((r, k) => map.set(r.index, k));
    return map;
  }, [ordered]);

  const labelW = Math.min(170, Math.max(...rows.map((r) => estimateTextWidth(r.label, 11)), 16) + 16);
  const m = { top: 8, bottom: 28, left: labelW, right: 22 };
  const H = height ?? Math.max(120, rows.length * rowHeight + m.top + m.bottom);
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(240, width);
  const rowH = (H - m.top - m.bottom) / Math.max(1, rows.length);
  const cyOf = (r: DumbbellRow) => m.top + rowH * ((slot.get(r.index) ?? 0) + 0.5);

  const [d0, d1] = React.useMemo(() => {
    if (domain) return [domain[0], domain[1]] as [number, number];
    let a = lollipop ? 0 : Infinity;
    let b = lollipop ? 0 : -Infinity;
    for (const r of rows) {
      a = Math.min(a, r.start, r.end);
      b = Math.max(b, r.start, r.end);
    }
    if (!Number.isFinite(a)) return [0, 1] as [number, number];
    if (a === b) return [a - 1, b + 1] as [number, number];
    const pad = lollipop ? 0 : (b - a) * 0.04;
    return nice(lollipop && a >= 0 ? 0 : a - pad, b + pad, 6);
  }, [rows, domain, lollipop]);
  const x = React.useMemo(() => scaleLinear([d0, d1], [m.left, W - m.right]), [d0, d1, m.left, m.right, W]);
  const dotR = Math.max(3.5, Math.min(7, rowH * 0.22));

  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activeRow = active !== null ? (rows[active] ?? null) : null;

  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (active === lastActive.current) return;
    lastActive.current = active;
    onActiveRowChange?.(activeRow);
  });

  const gapText = (r: DumbbellRow) => `${r.gap >= 0 ? "+" : "\u2212"}${fmt(Math.abs(r.gap))}${r.pct !== null && !lollipop ? ` (${pctFmt.format(r.pct)})` : ""}`;
  const describe = (r: DumbbellRow) =>
    lollipop
      ? `${r.label}: ${fmt(r.end)}. Row ${(slot.get(r.index) ?? 0) + 1} of ${rows.length}.`
      : `${r.label}: ${fmt(r.start)} to ${fmt(r.end)}, gap ${gapText(r)}. Row ${(slot.get(r.index) ?? 0) + 1} of ${rows.length}.`;

  const pick = (py: number) => {
    const k = Math.floor((py - m.top) / rowH);
    const r = ordered[Math.max(0, Math.min(ordered.length - 1, k))];
    return r ? r.index : null;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ordered.length || event.metaKey || event.ctrlKey) return;
    const pos = focus !== null ? (slot.get(focus) ?? -1) : -1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        next = ordered[pos < 0 ? 0 : Math.min(ordered.length - 1, pos + 1)]?.index ?? null;
        break;
      case "ArrowUp":
        next = ordered[pos < 0 ? 0 : Math.max(0, pos - 1)]?.index ?? null;
        break;
      case "Home":
        next = ordered[0]?.index ?? null;
        break;
      case "End":
        next = ordered[ordered.length - 1]?.index ?? null;
        break;
      case "Enter":
      case " ":
        if (focus !== null && rows[focus]) {
          event.preventDefault();
          onRowClick?.(rows[focus] as DumbbellRow, event);
        }
        return;
      case "Escape":
        if (focus !== null) {
          event.preventDefault();
          setFocus(null);
        }
        return;
      case "t":
      case "T":
        event.preventDefault();
        setTableVisible((v) => !v);
        return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(rows[next] as DumbbellRow));
  };

  const avgEnd = rows.length ? rows.reduce((s, r) => s + r.end, 0) / rows.length : null;
  const nameText = chartLabel ?? (typeof title === "string" ? title : lollipop ? `${measure} by category` : `${startName} vs ${endName}`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!rows.length) return "No data.";
    if (lollipop) {
      const byV = [...rows].sort((a, b) => b.end - a.end);
      return `${rows.length} categories of ${measure.toLowerCase()}. Highest ${byV[0]?.label} (${fmt(byV[0]?.end ?? 0)}), lowest ${byV[byV.length - 1]?.label} (${fmt(byV[byV.length - 1]?.end ?? 0)}).`;
    }
    const byGap = [...rows].sort((a, b) => b.gap - a.gap);
    const up = rows.filter((r) => r.gap > 0).length;
    const avgGap = rows.reduce((s, r) => s + r.gap, 0) / rows.length;
    return `${rows.length} categories, ${startName} vs ${endName}. ${up} increased, ${rows.length - up} did not. Largest gap ${byGap[0]?.label} (${gapText(byGap[0] as DumbbellRow)}), smallest ${byGap[byGap.length - 1]?.label} (${gapText(byGap[byGap.length - 1] as DumbbellRow)}). Average gap ${avgGap >= 0 ? "+" : "\u2212"}${fmt(Math.abs(avgGap))}.`;
  })();

  const xTicks = niceTicks(d0, d1, Math.max(2, Math.floor((W - m.left - m.right) / 90)));
  const spring = anim.reducedMotion ? instant : chartMotion.layout;
  const fade = anim.reducedMotion ? instant : chartMotion.fade;
  const enter = (k: number): Transition => (anim.reducedMotion ? instant : anim.entrance ? { duration: 0.6, ease: outExpo, delay: 0.1 + Math.min(0.5, k * 0.04) } : spring);

  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeRow) {
    const tx = x(Math.max(activeRow.start, activeRow.end));
    const ty = cyOf(activeRow) - rowH / 2;
    tip = { left: Math.min(tx + 14, W - 10) / W, top: (ty < 100 ? cyOf(activeRow) + rowH / 2 : ty) / H, flipX: tx / W > 0.55, below: ty < 100 };
  }

  const connectorColor = (r: DumbbellRow) =>
    colorBy === "direction" && !lollipop ? (r.gap >= 0 ? "var(--pui-chart-up, var(--pui-success))" : "var(--pui-chart-down, var(--pui-danger))") : lollipop ? endColor : "var(--pui-border)";

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {lollipop ? null : (
        <ChartChips
          chips={[
            { id: "start", label: startName, color: startColor },
            { id: "end", label: endName, color: endColor },
          ]}
          hidden={new Set()}
          reducedMotion={anim.reducedMotion}
          label="Legend"
        />
      )}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {xTicks.map((tk) => (
            <g key={tk}>
              <line x1={x(tk)} x2={x(tk)} y1={m.top} y2={H - m.bottom} stroke={tk === 0 && lollipop ? "var(--pui-border)" : "var(--pui-chart-grid)"} strokeDasharray={tk === 0 && lollipop ? undefined : "3 4"} />
              <text x={x(tk)} y={H - m.bottom + 17} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {fmt(tk)}
              </text>
            </g>
          ))}
          {activeRow ? (
            <motion.rect
              initial={false}
              animate={{ y: cyOf(activeRow) - rowH / 2 + 1 }}
              transition={anim.reducedMotion ? instant : chartMotion.hover}
              x={4}
              width={W - 8}
              height={Math.max(1, rowH - 2)}
              rx={6}
              fill="var(--pui-muted)"
              opacity={0.65}
            />
          ) : null}
          {showAverage && avgEnd !== null ? (
            <g pointerEvents="none">
              <line x1={x(avgEnd)} x2={x(avgEnd)} y1={m.top} y2={H - m.bottom} stroke={endColor} strokeOpacity={0.7} strokeDasharray="5 4" strokeWidth={1.25} />
              <text x={x(avgEnd) + 4} y={H - m.bottom - 4} fontSize={10} fontWeight={600} fill="var(--pui-muted-foreground)">
                Avg {fmt(avgEnd)}
              </text>
            </g>
          ) : null}
          {rows.map((r) => {
            const k = slot.get(r.index) ?? 0;
            const cy = cyOf(r);
            const xs = x(r.start);
            const xe = x(r.end);
            const isActive = activeRow?.index === r.index;
            const dim = activeRow !== null && !isActive;
            const showV = showValues === "always" || (showValues === "hover" && isActive);
            const lo = Math.min(xs, xe);
            const hi = Math.max(xs, xe);
            return (
              <motion.g key={r.label} initial={false} animate={{ opacity: dim ? 0.4 : 1 }} transition={fade}>
                <motion.text initial={false} animate={{ y: cy }} transition={spring} x={m.left - 12} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={isActive ? 700 : 500} fill={isActive ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                  {r.label}
                </motion.text>
                {/* Connector grows behind the moving end dot */}
                <motion.line
                  initial={anim.entrance ? { x1: xs, x2: xs, y1: cy, y2: cy } : false}
                  animate={{ x1: xs, x2: xe, y1: cy, y2: cy }}
                  transition={anim.reducedMotion ? instant : { x1: spring, x2: enter(k), y1: spring, y2: spring }}
                  stroke={connectorColor(r)}
                  strokeOpacity={lollipop ? 0.7 : 1}
                  strokeWidth={lollipop ? 2 : Math.max(3, dotR * 0.9)}
                  strokeLinecap="round"
                />
                {!lollipop ? (
                  <motion.circle initial={false} animate={{ cx: xs, cy }} transition={spring} r={isActive ? dotR + 1 : dotR} fill="var(--pui-background)" stroke={startColor} strokeWidth={2} />
                ) : null}
                <motion.circle
                  initial={anim.entrance ? { cx: xs, cy } : false}
                  animate={{ cx: xe, cy }}
                  transition={anim.reducedMotion ? instant : { cx: enter(k), cy: spring }}
                  r={isActive ? dotR + 1.5 : dotR + 0.5}
                  fill={endColor}
                  stroke={isActive ? withOpacity(endColor, 0.35) : "var(--pui-background)"}
                  strokeWidth={isActive ? 5 : 1.5}
                />
                {showV ? (
                  <g pointerEvents="none">
                    {!lollipop ? (
                      <text x={(r.start <= r.end ? lo : hi) + (r.start <= r.end ? -dotR - 6 : dotR + 6)} y={cy} dy="0.35em" textAnchor={r.start <= r.end ? "end" : "start"} fontSize={10} fill="var(--pui-muted-foreground)" className="tabular-nums">
                        {fmt(r.start)}
                      </text>
                    ) : null}
                    <text x={(r.start <= r.end ? hi : lo) + (r.start <= r.end ? dotR + 6 : -dotR - 6)} y={cy} dy="0.35em" textAnchor={r.start <= r.end ? "start" : "end"} fontSize={10} fontWeight={700} fill="var(--pui-foreground)" className="tabular-nums">
                      {fmt(r.end)}
                    </text>
                  </g>
                ) : null}
                {isActive && !lollipop && hi - lo > 34 ? (
                  <motion.text
                    initial={anim.reducedMotion ? false : { opacity: 0, y: cy - dotR - 2 }}
                    animate={{ opacity: 1, y: cy - dotR - 5 }}
                    transition={anim.reducedMotion ? instant : { duration: 0.18 }}
                    x={(lo + hi) / 2}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={r.gap >= 0 ? "var(--pui-success-text, var(--pui-foreground))" : "var(--pui-danger-text, var(--pui-foreground))"}
                    className="tabular-nums"
                    pointerEvents="none"
                  >
                    {gapText(r)}
                  </motion.text>
                ) : null}
              </motion.g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Up and down arrows move between rows.`}
          aria-describedby={`${uid}-summary`}
          onPointerMove={(event) => {
            const p = pointerIn(event, W, H);
            setHover(p && p.y >= m.top && p.y <= H - m.bottom ? pick(p.y) : null);
          }}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const p = pointerIn(event, W, H);
            const hit = p ? pick(p.y) : null;
            if (hit !== null && rows[hit]) onRowClick?.(rows[hit] as DumbbellRow, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", onRowClick && hover !== null ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeRow ? (
            <>
              <div className={cn(blockReset, "mb-1 text-[11px] font-semibold")}>{activeRow.label}</div>
              {lollipop ? (
                <TipRow swatch={endColor} label={endName} value={fmt(activeRow.end)} />
              ) : (
                <>
                  <TipRow swatch={startColor} label={startName} value={fmt(activeRow.start)} />
                  <TipRow swatch={endColor} label={endName} value={fmt(activeRow.end)} />
                  <TipRow label="Gap" value={gapText(activeRow)} tone={activeRow.gap > 0 ? "up" : activeRow.gap < 0 ? "down" : "muted"} />
                </>
              )}
              {avgEnd !== null ? <TipRow label={`vs avg ${endName.toLowerCase()}`} value={`${activeRow.end >= avgEnd ? "+" : "\u2212"}${fmt(Math.abs(activeRow.end - avgEnd))}`} tone="muted" /> : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={nameText}
          columns={lollipop ? ["Category", endName] : ["Category", startName, endName, "Gap"]}
          rows={ordered.map((r) => (lollipop ? [r.label, fmt(r.end)] : [r.label, fmt(r.start), fmt(r.end), gapText(r)]))}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

/**
 * Dumbbell (two values per category with the gap between them) or lollipop (one value from zero),
 * with sliding entrance, sort re-ordering on a spring, gap labels, hover tooltips and keyboard rows.
 */
export const DumbbellChart = React.forwardRef(DumbbellChartInner) as (<T>(props: DumbbellChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
DumbbellChart.displayName = "DumbbellChart";
