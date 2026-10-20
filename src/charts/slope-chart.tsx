"use client";

// Slope chart: exactly two points in time (before and after) per item, joined by a line colored
// by direction. Labels on both sides are dodged so they never collide (leader ticks show where a
// label moved), lines extend from left to right on entrance and glide on updates, hovering a line
// spotlights it with a "12 -> 18, +50%" tooltip, clicking pins lines, direction chips filter rises
// and falls, and an optional dashed average slope gives the overall trend.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartChips, ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, toggleHidden, useChartUid } from "./core/frame";
import { dodgeLabels } from "./core/label-layout";
import { scaleLinear } from "./core/scale";
import { nice } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

export type SlopeDirection = "up" | "down" | "flat";

export interface SlopeItem {
  label: string;
  index: number;
  from: number;
  to: number;
  change: number;
  /** Relative change (to / from - 1), or null when from is 0. */
  pct: number | null;
  direction: SlopeDirection;
}

export interface SlopeChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  /** Item name. */
  label: Accessor<T, string>;
  /** Value at the first time point. */
  from: Accessor<T, number | null | undefined>;
  /** Value at the second time point. */
  to: Accessor<T, number | null | undefined>;
  /** Column headers. Default "Before" / "After". */
  labels?: { from?: string; to?: string };
  /** "direction" (rise / fall / flat), "category" (palette per item) or "none". Default "direction". */
  colorBy?: "direction" | "category" | "none";
  /** Changes smaller than this share of the from value count as flat. Default 0.005. */
  flatThreshold?: number;
  /** Values next to the labels. Default true. */
  showValues?: boolean;
  /** A dashed average slope. Default false. */
  showAverage?: boolean;
  /** Colorblind-safe blue / amber for rises and falls. */
  colorblind?: boolean;
  /** Controlled pinned items (labels). */
  pinned?: readonly string[];
  defaultPinned?: readonly string[];
  onPinnedChange?: (pinned: string[]) => void;
  domain?: readonly [number, number];
  format?: NumberFormat;
  locale?: string;
  /** Height in px. Default 360. */
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onActiveChange?: (item: SlopeItem | null) => void;
  summary?: string;
  chartLabel?: string;
}

const LABEL_H = 14;

function SlopeChartInner<T>(props: SlopeChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    label,
    from,
    to,
    labels,
    colorBy = "direction",
    flatThreshold = 0.005,
    showValues = true,
    showAverage = false,
    colorblind = false,
    pinned: pinnedProp,
    defaultPinned,
    onPinnedChange,
    domain,
    format,
    locale = "en-US",
    height = 360,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onActiveChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const H = height;
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(260, width);
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }), [locale]);
  const fromLabel = labels?.from ?? "Before";
  const toLabel = labels?.to ?? "After";

  const items: SlopeItem[] = React.useMemo(() => {
    const out: SlopeItem[] = [];
    data.forEach((d, i) => {
      const a = readAccessor(from, d, i);
      const b = readAccessor(to, d, i);
      if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) return;
      const change = b - a;
      const flat = Math.abs(change) <= Math.abs(a) * flatThreshold;
      out.push({ label: String(readAccessor(label, d, i)), index: out.length, from: a, to: b, change, pct: a !== 0 ? b / a - 1 : null, direction: flat ? "flat" : change > 0 ? "up" : "down" });
    });
    return out;
  }, [data, label, from, to, flatThreshold]);

  const [hiddenDirs, setHiddenDirs] = React.useState<ReadonlySet<string>>(() => new Set());
  const [chipHover, setChipHover] = React.useState<string | null>(null);
  const visibleItems = items.filter((it) => !hiddenDirs.has(it.direction));

  const [innerPinned, setInnerPinned] = React.useState<ReadonlySet<string>>(() => new Set(defaultPinned ?? []));
  const pinned = React.useMemo(() => (pinnedProp ? new Set(pinnedProp) : innerPinned), [pinnedProp, innerPinned]);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activeItem = active !== null ? (items[active] ?? null) : null;

  const lastActive = React.useRef<string>("");
  React.useEffect(() => {
    const k = activeItem?.label ?? "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveChange?.(activeItem);
  });

  const togglePin = (name: string) => {
    const next = new Set(pinned);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    if (!pinnedProp) setInnerPinned(next);
    onPinnedChange?.([...next]);
    setAnnouncement(`${name} ${next.has(name) ? "pinned" : "unpinned"}.`);
  };

  // Geometry.
  const maxLabel = Math.max(...items.map((it) => estimateTextWidth(`${it.label}${showValues ? `  ${fmt(Math.max(Math.abs(it.from), Math.abs(it.to)))}` : ""}`, 11)), 30);
  const side = Math.min(W * 0.32, maxLabel + 22);
  const x0 = side;
  const x1 = W - side;
  const m = { top: 30, bottom: 12 };
  const [lo, hi] = React.useMemo(() => {
    if (domain) return [domain[0], domain[1]] as [number, number];
    let a = Infinity;
    let b = -Infinity;
    for (const it of items) {
      a = Math.min(a, it.from, it.to);
      b = Math.max(b, it.from, it.to);
    }
    if (!Number.isFinite(a)) return [0, 1] as [number, number];
    if (a === b) return [a - 1, b + 1] as [number, number];
    return nice(a, b, 5);
  }, [items, domain]);
  const y = React.useMemo(() => scaleLinear([lo, hi], [H - m.bottom - LABEL_H / 2, m.top + LABEL_H / 2]), [lo, hi, H, m.bottom, m.top]);

  const placed = React.useMemo(() => {
    const vis = items.filter((it) => !hiddenDirs.has(it.direction));
    const left = dodgeLabels(vis.map((it) => ({ position: y(it.from), size: LABEL_H })), m.top, H - m.bottom, 1);
    const right = dodgeLabels(vis.map((it) => ({ position: y(it.to), size: LABEL_H })), m.top, H - m.bottom, 1);
    const map = new Map<number, { l: number; r: number }>();
    vis.forEach((it, k) => map.set(it.index, { l: left[k] as number, r: right[k] as number }));
    return map;
  }, [items, hiddenDirs, y, H, m.top, m.bottom]);

  const colorOf = (it: SlopeItem) => {
    if (colorBy === "category") return categoricalColor(it.index);
    if (colorBy === "none") return "var(--pui-chart-1, var(--pui-primary))";
    if (it.direction === "flat") return "var(--pui-muted-foreground)";
    if (colorblind) return it.direction === "up" ? categoricalColor(5) : categoricalColor(2);
    return it.direction === "up" ? "var(--pui-chart-up, var(--pui-success))" : "var(--pui-chart-down, var(--pui-danger))";
  };
  const dirColor = (d: SlopeDirection) => colorOf({ label: "", index: 0, from: 0, to: d === "up" ? 1 : d === "down" ? -1 : 0, change: 0, pct: null, direction: d });

  const lit = (it: SlopeItem) => (activeItem ? activeItem.index === it.index || pinned.has(it.label) : pinned.size ? pinned.has(it.label) : chipHover ? chipHover === it.direction : true);
  const anyFocus = !!activeItem || pinned.size > 0 || !!chipHover;

  const describe = (it: SlopeItem) =>
    `${it.label}: ${fmt(it.from)} to ${fmt(it.to)}, ${it.pct !== null ? pctFmt.format(it.pct) : `${it.change >= 0 ? "+" : ""}${fmt(it.change)}`}.`;

  const pick = (px: number, py: number) => {
    let best = 10;
    let at: number | null = null;
    for (const it of visibleItems) {
      // Distance to the segment, plus label hit areas on both sides.
      const ax = x0;
      const ay = y(it.from);
      const bx = x1;
      const by = y(it.to);
      const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
      let d = Math.hypot(px - (ax + (bx - ax) * t), py - (ay + (by - ay) * t));
      const pl = placed.get(it.index);
      if (pl && ((px < x0 && Math.abs(py - pl.l) < LABEL_H / 2) || (px > x1 && Math.abs(py - pl.r) < LABEL_H / 2))) d = 0;
      if (d < best) {
        best = d;
        at = it.index;
      }
    }
    return at;
  };

  const order = [...visibleItems].sort((a, b) => b.to - a.to).map((it) => it.index);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!order.length || event.metaKey || event.ctrlKey) return;
    const pos = focus !== null ? order.indexOf(focus) : -1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = order[pos < 0 ? 0 : Math.min(order.length - 1, pos + 1)] ?? null;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = order[pos < 0 ? 0 : Math.max(0, pos - 1)] ?? null;
        break;
      case "Home":
        next = order[0] ?? null;
        break;
      case "End":
        next = order[order.length - 1] ?? null;
        break;
      case "Enter":
      case " ":
        if (focus !== null && items[focus]) {
          event.preventDefault();
          togglePin((items[focus] as SlopeItem).label);
        }
        return;
      case "Escape":
        if (focus !== null) {
          event.preventDefault();
          setFocus(null);
        } else if (pinned.size && !pinnedProp) {
          event.preventDefault();
          event.stopPropagation();
          setInnerPinned(new Set());
          onPinnedChange?.([]);
          setAnnouncement("Pins cleared.");
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
    const it = items[next] as SlopeItem;
    setAnnouncement(`${describe(it)} Rank ${order.indexOf(next) + 1} of ${order.length} by ${toLabel}.`);
  };

  const counts = { up: items.filter((i) => i.direction === "up").length, down: items.filter((i) => i.direction === "down").length, flat: items.filter((i) => i.direction === "flat").length };
  const avg = items.length ? { from: items.reduce((s, i) => s + i.from, 0) / items.length, to: items.reduce((s, i) => s + i.to, 0) / items.length } : null;

  const nameText = chartLabel ?? (typeof title === "string" ? title : `${fromLabel} vs ${toLabel}`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!items.length) return "No data.";
    const withPct = items.filter((i) => i.pct !== null);
    const rise = [...withPct].sort((a, b) => (b.pct as number) - (a.pct as number))[0];
    const fall = [...withPct].sort((a, b) => (a.pct as number) - (b.pct as number))[0];
    return `${items.length} items from ${fromLabel} to ${toLabel}: ${counts.up} rose, ${counts.down} fell${counts.flat ? `, ${counts.flat} flat` : ""}.${
      rise && (rise.pct as number) > 0 ? ` Biggest rise ${rise.label} (${pctFmt.format(rise.pct as number)}).` : ""
    }${fall && (fall.pct as number) < 0 ? ` Biggest fall ${fall.label} (${pctFmt.format(fall.pct as number)}).` : ""}`;
  })();

  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeItem && placed.has(activeItem.index)) {
    const mx = (x0 + x1) / 2;
    const my = (y(activeItem.from) + y(activeItem.to)) / 2 - 8;
    tip = { left: mx / W, top: (my < 120 ? my + 22 : my) / H, flipX: false, below: my < 120 };
  }

  const spring = anim.reducedMotion ? instant : chartMotion.layout;
  const fade = anim.reducedMotion ? instant : chartMotion.fade;

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {colorBy === "direction" ? (
        <ChartChips
          chips={(["up", "down", "flat"] as const)
            .filter((d) => counts[d] > 0)
            .map((d) => ({ id: d, label: d === "up" ? "Rose" : d === "down" ? "Fell" : "Flat", color: dirColor(d), meta: counts[d] }))}
          hidden={hiddenDirs}
          onToggle={(d, solo) => setHiddenDirs((prev) => toggleHidden(prev, ["up", "down", "flat"].filter((k) => counts[k as SlopeDirection] > 0), d, solo))}
          onHover={setChipHover}
          active={chipHover}
          reducedMotion={anim.reducedMotion}
          label="Direction"
        />
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Columns */}
          {[
            { x: x0, text: fromLabel },
            { x: x1, text: toLabel },
          ].map((c) => (
            <g key={c.text}>
              <line x1={c.x} x2={c.x} y1={m.top - 4} y2={H - m.bottom} stroke="var(--pui-border)" strokeWidth={1.5} />
              <text x={c.x} y={m.top - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--pui-foreground)">
                {c.text}
              </text>
            </g>
          ))}
          {showAverage && avg ? (
            <g pointerEvents="none" opacity={anyFocus ? 0.4 : 1}>
              <line x1={x0} y1={y(avg.from)} x2={x1} y2={y(avg.to)} stroke="var(--pui-foreground)" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="6 5" />
              <text x={(x0 + x1) / 2} y={(y(avg.from) + y(avg.to)) / 2 - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--pui-muted-foreground)">
                Average {avg.from ? pctFmt.format(avg.to / avg.from - 1) : ""}
              </text>
            </g>
          ) : null}
          {/* Lines + dots */}
          {items.map((it) => {
            const shown = placed.has(it.index);
            const on = lit(it);
            const col = colorOf(it);
            const ya = y(it.from);
            const yb = y(it.to);
            const d = `M${x0},${ya}L${x1},${yb}`;
            const isActive = activeItem?.index === it.index;
            const opacity = !shown ? 0 : on ? 1 : anyFocus ? 0.14 : 0.85;
            return (
              <motion.g key={it.label} initial={false} animate={{ opacity }} transition={fade} pointerEvents="none">
                {isActive || pinned.has(it.label) ? <motion.path initial={false} animate={{ d }} transition={{ d: spring }} stroke={withOpacity(col, 0.25)} strokeWidth={9} strokeLinecap="round" fill="none" /> : null}
                <motion.path
                  initial={anim.entrance ? { d, pathLength: 0 } : false}
                  animate={{ d, pathLength: 1 }}
                  transition={anim.reducedMotion ? instant : { d: spring, pathLength: { duration: 0.6, ease: outExpo, delay: anim.entrance ? 0.15 + it.index * 0.02 : 0 } }}
                  stroke={col}
                  strokeWidth={isActive ? 3 : 2}
                  strokeLinecap="round"
                  fill="none"
                />
                <motion.circle initial={false} animate={{ cy: ya }} transition={spring} cx={x0} r={isActive ? 5 : 4} fill="var(--pui-background)" stroke={col} strokeWidth={2} />
                <motion.circle
                  initial={anim.entrance ? { cy: ya, cx: x0, scale: 0 } : false}
                  animate={{ cy: yb, cx: x1, scale: 1 }}
                  transition={anim.reducedMotion ? instant : { cx: { duration: 0.6, ease: outExpo, delay: anim.entrance ? 0.15 + it.index * 0.02 : 0 }, cy: anim.entrance ? { duration: 0.6, ease: outExpo, delay: 0.15 + it.index * 0.02 } : spring, scale: { duration: 0.2, delay: anim.entrance ? 0.15 + it.index * 0.02 : 0 } }}
                  r={isActive ? 5 : 4}
                  fill={col}
                  stroke="var(--pui-background)"
                  strokeWidth={1.5}
                />
              </motion.g>
            );
          })}
          {/* Labels */}
          {items.map((it) => {
            const pl = placed.get(it.index);
            const on = lit(it);
            const isActive = activeItem?.index === it.index || pinned.has(it.label);
            const opacity = !pl ? 0 : on ? 1 : anyFocus ? 0.3 : 1;
            const ya = y(it.from);
            const yb = y(it.to);
            const ly = pl?.l ?? ya;
            const ry = pl?.r ?? yb;
            const fill = isActive ? "var(--pui-foreground)" : "var(--pui-muted-foreground)";
            return (
              <motion.g key={it.label} initial={anim.entrance ? { opacity: 0 } : false} animate={{ opacity }} transition={anim.reducedMotion ? instant : { duration: 0.2, delay: anim.entrance ? 0.5 : 0 }} pointerEvents="none">
                {Math.abs(ly - ya) > 2 ? <motion.line initial={false} animate={{ y1: ya, y2: ly }} transition={spring} x1={x0 - 6} x2={x0 - 10} stroke="var(--pui-border)" /> : null}
                {Math.abs(ry - yb) > 2 ? <motion.line initial={false} animate={{ y1: yb, y2: ry }} transition={spring} x1={x1 + 6} x2={x1 + 10} stroke="var(--pui-border)" /> : null}
                <motion.text initial={false} animate={{ y: ly }} transition={spring} x={x0 - 12} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={isActive ? 700 : 500} fill={fill}>
                  {it.label}
                  {showValues ? <tspan dx={6} fontWeight={600} fill="var(--pui-foreground)" className="tabular-nums">{fmt(it.from)}</tspan> : null}
                </motion.text>
                <motion.text initial={false} animate={{ y: ry }} transition={spring} x={x1 + 12} dy="0.35em" textAnchor="start" fontSize={11} fontWeight={isActive ? 700 : 500} fill={fill}>
                  {showValues ? <tspan fontWeight={600} fill="var(--pui-foreground)" className="tabular-nums">{fmt(it.to)}</tspan> : null}
                  <tspan dx={showValues ? 6 : 0}>{it.label}</tspan>
                </motion.text>
              </motion.g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Arrow keys walk the items by ${toLabel} value. Enter pins a line.`}
          aria-describedby={`${uid}-summary`}
          onPointerMove={(event) => {
            const p = pointerIn(event, W, H);
            setHover(p ? pick(p.x, p.y) : null);
          }}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            const p = pointerIn(event, W, H);
            const hit = p ? pick(p.x, p.y) : null;
            if (hit !== null && items[hit]) togglePin((items[hit] as SlopeItem).label);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover !== null ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeItem ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center gap-1.5 text-[11px] font-semibold")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-full")} style={{ background: colorOf(activeItem) }} />
                {activeItem.label}
                {pinned.has(activeItem.label) ? <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>&middot; pinned</span> : null}
              </div>
              <TipRow label={fromLabel} value={fmt(activeItem.from)} tone="muted" />
              <TipRow label={toLabel} value={fmt(activeItem.to)} />
              <TipRow
                label="Change"
                value={`${activeItem.change >= 0 ? "+" : "\u2212"}${fmt(Math.abs(activeItem.change))}${activeItem.pct !== null ? ` (${pctFmt.format(activeItem.pct)})` : ""}`}
                tone={activeItem.direction === "up" ? "up" : activeItem.direction === "down" ? "down" : "muted"}
              />
              <TipRow label={`Rank (${toLabel})`} value={`${[...items].sort((a, b) => b.to - a.to).findIndex((i) => i.index === activeItem.index) + 1} of ${items.length}`} tone="muted" />
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={nameText}
          columns={["Item", fromLabel, toLabel, "Change"]}
          rows={items.map((it) => [it.label, fmt(it.from), fmt(it.to), it.pct !== null ? pctFmt.format(it.pct) : fmt(it.change)])}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

/**
 * Before/after slopes colored by direction with collision-free labels on both sides, hover
 * spotlight, click to pin, direction filter chips, an optional average slope and keyboard walking.
 */
export const SlopeChart = React.forwardRef(SlopeChartInner) as (<T>(props: SlopeChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
SlopeChart.displayName = "SlopeChart";
