"use client";

// Ridgeline chart (joyplot): one kernel density ridge per group, overlapping like a mountain
// range and sorted by median. Ridges rise in a stagger on entrance and morph on updates. Hovering
// a ridge spotlights it, shades its interquartile range and median, and a probe line reads the
// density and the share of values at or below the pointer; the keyboard moves between ridges
// (up/down) and slides the probe (left/right) with announcements.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, mix, sequentialColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, useChartUid } from "./core/frame";
import { areaToBaseline, linePath, type Point } from "./core/path";
import { scaleLinear } from "./core/scale";
import { finite, kde, mean as meanOf, quantileSorted, silvermanBandwidth } from "./core/stats";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

export interface RidgelineGroup {
  group: string;
  /** Sorted finite values. */
  values: number[];
  n: number;
  mean: number;
  p10: number;
  q1: number;
  median: number;
  q3: number;
  p90: number;
  /** [x, density] samples. */
  density: Array<[number, number]>;
}

export interface RidgelineChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  group: Accessor<T, string | number>;
  value: Accessor<T, number | null | undefined>;
  /** Explicit group order (with sort="none"). */
  groupOrder?: readonly (string | number)[];
  /** Ridge order top to bottom. "median" and "mean" put the highest at the top. Default "median". */
  sort?: "median" | "mean" | "none";
  /** How far a ridge may reach into the row above (0 = none, 1 = a full row). Default 0.6. */
  overlap?: number;
  /** KDE bandwidth in value units. Default: Silverman's rule on all values. */
  bandwidth?: number;
  /** "each" scales every ridge to the same peak; "shared" keeps densities comparable. Default "each". */
  normalize?: "each" | "shared";
  /** "median" colors along the sequential ramp by median, "category" uses the palette, or pass a color. Default "median". */
  color?: "median" | "category" | (string & {});
  /** Median ticks on every ridge. Default true. */
  showMedian?: boolean;
  domain?: readonly [number, number];
  /** Name of the measure ("Temperature"). */
  label?: string;
  format?: NumberFormat;
  locale?: string;
  /** Row step in px. Default 34. */
  rowHeight?: number;
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onActiveGroupChange?: (group: RidgelineGroup | null) => void;
  summary?: string;
  chartLabel?: string;
}

const SAMPLES = 72;

function RidgelineChartInner<T>(props: RidgelineChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    group,
    value,
    groupOrder,
    sort = "median",
    overlap = 0.6,
    bandwidth,
    normalize = "each",
    color = "median",
    showMedian = true,
    domain,
    label = "Value",
    format,
    locale = "en-US",
    rowHeight = 34,
    height,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onActiveGroupChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);

  const model = React.useMemo(() => {
    const raw = new Map<string, number[]>();
    const order: string[] = groupOrder ? groupOrder.map(String) : [];
    data.forEach((d, i) => {
      const g = String(readAccessor(group, d, i));
      const v = readAccessor(value, d, i);
      if (!raw.has(g)) {
        if (groupOrder && !order.includes(g)) return;
        raw.set(g, []);
        if (!groupOrder) order.push(g);
      }
      if (typeof v === "number" && Number.isFinite(v)) (raw.get(g) as number[]).push(v);
    });
    const all = finite([...raw.values()].flat());
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of all) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
    const h = bandwidth ?? (silvermanBandwidth(all) || (hi - lo) / 20);
    const [d0, d1] = domain ? [domain[0], domain[1]] : nice(lo - h * 1.5, hi + h * 1.5, 6);
    const groups: RidgelineGroup[] = [];
    for (const g of order) {
      const vs = (raw.get(g) ?? []).slice().sort((a, b) => a - b);
      if (!vs.length) continue;
      const q = (p: number) => quantileSorted(vs, p) as number;
      groups.push({
        group: g,
        values: vs,
        n: vs.length,
        mean: meanOf(vs) ?? 0,
        p10: q(0.1),
        q1: q(0.25),
        median: q(0.5),
        q3: q(0.75),
        p90: q(0.9),
        density: kde(vs, { bandwidth: h, samples: SAMPLES, domain: [d0, d1] }),
      });
    }
    if (sort !== "none") groups.sort((a, b) => (sort === "mean" ? b.mean - a.mean : b.median - a.median));
    const medians = groups.map((g) => g.median);
    return { groups, d0, d1, mLo: Math.min(...medians), mHi: Math.max(...medians) };
  }, [data, group, value, groupOrder, bandwidth, domain, sort]);
  const { groups, d0, d1 } = model;
  const G = groups.length;

  const labelW = Math.min(150, Math.max(...groups.map((g) => estimateTextWidth(g.group, 11)), 16) + 16);
  const peakH = rowHeight * (1 + Math.max(0, overlap));
  const m = { top: 10, bottom: 28, left: labelW, right: 16 };
  const H = height ?? Math.round(m.top + peakH + Math.max(0, G - 1) * rowHeight + m.bottom);
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(240, width);
  const step = G > 1 ? (H - m.top - m.bottom - peakH) / (G - 1) : 0;
  const ridgePeak = G > 1 ? step * (1 + Math.max(0, overlap)) : H - m.top - m.bottom;
  const baseOf = (r: number) => m.top + ridgePeak + r * step;
  const xScale = React.useMemo(() => scaleLinear([d0, d1], [m.left, W - m.right]), [d0, d1, m.left, m.right, W]);

  const globalPeak = Math.max(...groups.map((g) => Math.max(...g.density.map((p) => p[1]))), 1e-12);
  const shapes = React.useMemo(
    () =>
      groups.map((g, r) => {
        const peak = normalize === "shared" ? globalPeak : Math.max(...g.density.map((p) => p[1])) || 1;
        const base = baseOf(r);
        const pts = g.density.map(([v, d]): Point => [xScale(v), base - (d / peak) * ridgePeak]);
        const flatPts = g.density.map(([v]): Point => [xScale(v), base]);
        return {
          area: `${areaToBaseline(pts, base, { curve: "monotone" })}`,
          line: linePath(pts, { curve: "monotone" }),
          flatArea: areaToBaseline(flatPts, base, { curve: "monotone" }),
          flatLine: linePath(flatPts, { curve: "monotone" }),
          base,
          peak,
          yAt: (v: number) => {
            const k = Math.max(0, Math.min(SAMPLES - 1, ((v - d0) / (d1 - d0 || 1)) * (SAMPLES - 1)));
            const k0 = Math.floor(k);
            const k1 = Math.min(SAMPLES - 1, k0 + 1);
            const a = g.density[k0]?.[1] ?? 0;
            const b = g.density[k1]?.[1] ?? 0;
            const dens = a + (b - a) * (k - k0);
            return { y: base - (dens / peak) * ridgePeak, density: dens };
          },
        };
      }),
    // baseOf depends on m.top, ridgePeak and step.
    [groups, normalize, globalPeak, xScale, ridgePeak, step, m.top, d0, d1],
  );

  const colorOf = (g: RidgelineGroup, r: number) => {
    if (color === "category") return categoricalColor(r);
    if (color === "median") return sequentialColor(0.35 + 0.65 * ((g.median - model.mLo) / (model.mHi - model.mLo || 1)));
    return color;
  };

  const [hover, setHover] = React.useState<{ r: number; v: number } | null>(null);
  const [focus, setFocus] = React.useState<{ r: number; v: number | null } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activeGroup = active ? (groups[active.r] ?? null) : null;
  const probeV = active ? active.v : null;

  const lastActive = React.useRef("");
  React.useEffect(() => {
    const k = activeGroup?.group ?? "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveGroupChange?.(activeGroup);
  });

  const ecdf = (g: RidgelineGroup, v: number) => {
    let lo = 0;
    let hi = g.values.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((g.values[mid] as number) <= v) lo = mid + 1;
      else hi = mid;
    }
    return g.values.length ? lo / g.values.length : 0;
  };

  const pick = (x: number, y: number): { r: number; v: number } | null => {
    if (!G) return null;
    const v = xScale.invert(Math.max(m.left, Math.min(W - m.right, x)));
    // Front (lower) ridges first: they are drawn on top.
    for (let r = G - 1; r >= 0; r--) {
      const s = shapes[r];
      if (!s) continue;
      if (y <= s.base + 2 && y >= s.yAt(v).y - 2) return { r, v };
    }
    // Otherwise the nearest baseline below the pointer.
    let best = 0;
    let bd = Infinity;
    shapes.forEach((s, r) => {
      const d = s.base - y;
      const score = d >= 0 ? d : -d * 3;
      if (score < bd) {
        bd = score;
        best = r;
      }
    });
    return { r: best, v };
  };

  const describeGroup = (g: RidgelineGroup, r: number) => `${g.group}: median ${fmt(g.median)}, IQR ${fmt(g.q1)} to ${fmt(g.q3)}, n ${g.n}. Ridge ${r + 1} of ${G}.`;
  const probeStep = (d1 - d0) / 40;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!G || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { r: -1, v: null };
    let next: { r: number; v: number | null } | null = null;
    switch (event.key) {
      case "ArrowDown":
        next = { r: Math.min(G - 1, cur.r + 1), v: cur.v };
        break;
      case "ArrowUp":
        next = { r: cur.r < 0 ? 0 : Math.max(0, cur.r - 1), v: cur.v };
        break;
      case "Home":
        next = { r: 0, v: cur.v };
        break;
      case "End":
        next = { r: G - 1, v: cur.v };
        break;
      case "ArrowRight":
      case "ArrowLeft": {
        const r = Math.max(0, cur.r);
        const g = groups[r] as RidgelineGroup;
        const start = cur.v ?? g.median;
        const stepBy = (event.shiftKey ? 5 : 1) * probeStep * (event.key === "ArrowRight" ? 1 : -1);
        const v = cur.v === null ? start : Math.max(d0, Math.min(d1, start + stepBy));
        event.preventDefault();
        setFocus({ r, v });
        setAnnouncement(`${g.group} at ${fmt(v)}: ${pctFmt.format(ecdf(g, v))} of values are at or below.`);
        return;
      }
      case "Escape":
        if (focus) {
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
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describeGroup(groups[next.r] as RidgelineGroup, next.r));
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} distributions`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!G) return "No data.";
    const byMed = [...groups].sort((a, b) => b.median - a.median);
    const widest = [...groups].sort((a, b) => b.q3 - b.q1 - (a.q3 - a.q1))[0] as RidgelineGroup;
    const top = byMed[0] as RidgelineGroup;
    const bottom = byMed[byMed.length - 1] as RidgelineGroup;
    return `Ridgeline of ${label.toLowerCase()} for ${G} groups. Highest median ${top.group} (${fmt(top.median)}), lowest ${bottom.group} (${fmt(bottom.median)}). Widest spread ${widest.group} (IQR ${fmt(widest.q1)} to ${fmt(widest.q3)}).`;
  })();

  const xTicks = niceTicks(d0, d1, Math.max(2, Math.floor((W - m.left - m.right) / 90)));
  const spring = anim.reducedMotion ? instant : chartMotion.layout;
  const fade = anim.reducedMotion ? instant : chartMotion.fade;

  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active && activeGroup) {
    const s = shapes[active.r];
    if (s) {
      const v = probeV ?? activeGroup.median;
      const tx = xScale(v);
      const ty = s.yAt(v).y - 6;
      tip = { left: tx / W, top: (ty < 130 ? s.base + 6 : ty) / H, flipX: tx / W > 0.6, below: ty < 130 };
    }
  }

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            {groups.map((g, r) => {
              const col = colorOf(g, r);
              return (
                <linearGradient key={g.group} id={`${uid}-g${r}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={mix(col, "var(--pui-background)", 0.92)} />
                  <stop offset="100%" stopColor={mix(col, "var(--pui-background)", 0.38)} />
                </linearGradient>
              );
            })}
            {groups.map((g, r) => (
              <clipPath key={g.group} id={`${uid}-c${r}`}>
                <path d={shapes[r]?.area} />
              </clipPath>
            ))}
          </defs>
          {xTicks.map((tk) => (
            <g key={tk}>
              <line x1={xScale(tk)} x2={xScale(tk)} y1={m.top} y2={H - m.bottom} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={xScale(tk)} y={H - m.bottom + 17} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {fmt(tk)}
              </text>
            </g>
          ))}
          {groups.map((g, r) => {
            const s = shapes[r];
            if (!s) return null;
            const col = colorOf(g, r);
            const isActive = activeGroup?.group === g.group;
            const dim = activeGroup !== null && !isActive;
            const delay = anim.entrance ? r * 0.05 : 0;
            const t: Transition = anim.reducedMotion ? instant : anim.entrance ? { duration: 0.9, ease: outExpo, delay } : spring;
            const med = s.yAt(g.median);
            return (
              <motion.g key={g.group} initial={false} animate={{ opacity: dim ? 0.35 : 1 }} transition={fade}>
                <line x1={m.left} x2={W - m.right} y1={s.base} y2={s.base} stroke="var(--pui-border)" />
                <motion.path initial={anim.entrance ? { d: s.flatArea } : false} animate={{ d: s.area }} transition={{ d: t }} fill={`url(#${uid}-g${r})`} />
                {isActive ? (
                  <g clipPath={`url(#${uid}-c${r})`} pointerEvents="none">
                    <rect x={xScale(g.q1)} width={Math.max(1, xScale(g.q3) - xScale(g.q1))} y={s.base - ridgePeak - 4} height={ridgePeak + 4} fill={col} opacity={0.35} />
                    <rect x={xScale(g.p10)} width={Math.max(1, xScale(g.p90) - xScale(g.p10))} y={s.base - ridgePeak - 4} height={ridgePeak + 4} fill={col} opacity={0.12} />
                  </g>
                ) : null}
                <motion.path
                  initial={anim.entrance ? { d: s.flatLine } : false}
                  animate={{ d: s.line }}
                  transition={{ d: t }}
                  fill="none"
                  stroke={col}
                  strokeWidth={isActive ? 2.25 : 1.5}
                  strokeLinejoin="round"
                />
                {showMedian || isActive ? (
                  <motion.line
                    initial={anim.entrance ? { x1: xScale(g.median), x2: xScale(g.median), y1: s.base, y2: s.base, opacity: 0 } : false}
                    animate={{ x1: xScale(g.median), x2: xScale(g.median), y1: s.base, y2: med.y + 1, opacity: 1 }}
                    transition={anim.reducedMotion ? instant : { ...spring, delay: anim.entrance ? delay + 0.5 : 0 }}
                    stroke={isActive ? "var(--pui-foreground)" : col}
                    strokeOpacity={isActive ? 0.8 : 0.9}
                    strokeWidth={1.5}
                    strokeDasharray={isActive ? "3 2" : undefined}
                  />
                ) : null}
                <text x={m.left - 10} y={s.base - 4} textAnchor="end" fontSize={11} fontWeight={isActive ? 700 : 500} fill={isActive ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                  {g.group}
                </text>
              </motion.g>
            );
          })}
          {/* Probe */}
          {active && activeGroup && probeV !== null && shapes[active.r] ? (
            (() => {
              const s = shapes[active.r] as (typeof shapes)[number];
              const px = xScale(probeV);
              const { y } = s.yAt(probeV);
              return (
                <g pointerEvents="none">
                  <motion.line initial={false} animate={{ x1: px, x2: px, y1: s.base, y2: s.base - ridgePeak - 4 }} transition={anim.reducedMotion ? instant : chartMotion.hover} stroke="var(--pui-chart-crosshair)" strokeDasharray="3 3" />
                  <motion.circle initial={false} animate={{ cx: px, cy: y }} transition={anim.reducedMotion ? instant : chartMotion.hover} r={4} fill="var(--pui-background)" stroke={colorOf(activeGroup, active.r)} strokeWidth={2} />
                </g>
              );
            })()
          ) : null}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Up and down arrows move between ridges, left and right slide a probe along the values.`}
          aria-describedby={`${uid}-summary`}
          onPointerMove={(event) => {
            const p = pointerIn(event, W, H);
            setHover(p ? pick(p.x, p.y) : null);
          }}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md cursor-crosshair")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {active && activeGroup ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold")}>
                <span className={cn(blockReset, "flex items-center gap-1.5")}>
                  <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf(activeGroup, active.r) }} />
                  {activeGroup.group}
                </span>
                <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>n = {activeGroup.n}</span>
              </div>
              <TipRow label="Median" value={fmt(activeGroup.median)} />
              <TipRow label="IQR" value={`${fmt(activeGroup.q1)} \u2013 ${fmt(activeGroup.q3)}`} />
              <TipRow label="10th\u201390th" value={`${fmt(activeGroup.p10)} \u2013 ${fmt(activeGroup.p90)}`} tone="muted" />
              <TipRow label="Mean" value={fmt(activeGroup.mean)} tone="muted" />
              {probeV !== null ? (
                <div className={cn(blockReset, "mt-1.5 border-t border-pui-border pt-1.5")}>
                  <TipRow label={`\u2264 ${fmt(probeV)}`} value={pctFmt.format(ecdf(activeGroup, probeV))} />
                </div>
              ) : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={nameText}
          columns={["Group", "n", "10th", "Q1", "Median", "Q3", "90th", "Mean"]}
          rows={groups.map((g) => [g.group, String(g.n), fmt(g.p10), fmt(g.q1), fmt(g.median), fmt(g.q3), fmt(g.p90), fmt(g.mean)])}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

/**
 * Ridgeline (joyplot): overlapping KDE ridges per group, sorted by median, with a hover spotlight
 * that shades the IQR, a probe that reads the share at or below a value, and keyboard navigation.
 */
export const RidgelineChart = React.forwardRef(RidgelineChartInner) as (<T>(props: RidgelineChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
RidgelineChart.displayName = "RidgelineChart";
