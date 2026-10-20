"use client";

// Bump chart: rank over time. Each entity is a sigmoid "bump" line through its rank per period,
// with rank numbers in the dots and direct labels on both sides. Hovering a line lights it and
// fades the rest (the tooltip shows the rank, the move since the previous period and a tiny rank
// history), clicking pins lines so several can be compared, and new data re-ranks with the dots
// and lines gliding to their new rows. Arrow keys walk periods (left/right) and entities
// (up/down) with announcements like "Team A: 3rd in 2024, up 2".
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, useChartUid } from "./core/frame";
import { linePath, type Point } from "./core/path";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

export interface BumpEntity {
  id: string;
  index: number;
  color: string;
  /** Rank per period (null when absent). */
  ranks: (number | null)[];
  /** Value per period, when a value accessor was given. */
  values: (number | null)[];
}

export interface BumpChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  /** Long rows: one per entity and period. */
  data: readonly T[];
  /** The period of a row. */
  x: Accessor<T, string | number>;
  /** The entity (team, product, country). */
  series: Accessor<T, string>;
  /** Score used to rank entities within a period (unless `rank` is given). */
  value?: Accessor<T, number | null | undefined>;
  /** Explicit rank (1 = top). Overrides ranking by value. */
  rank?: Accessor<T, number | null | undefined>;
  /** When ranking by value: higher is better (rank 1). Default true. */
  higherIsBetter?: boolean;
  /** Period order. Default: first appearance. */
  periods?: readonly (string | number)[];
  /** Line shape. Default "bump" (sigmoid between periods). */
  curve?: "bump" | "linear";
  /** Names at both ends of each line. Default true. */
  directLabels?: boolean;
  /** Rank numbers inside the dots. Default true. */
  showRanks?: boolean;
  /** Color per entity. Default: the categorical palette in first-appearance order. */
  color?: (entity: string, index: number) => string;
  /** Controlled pinned entities (stay highlighted). */
  pinned?: readonly string[];
  defaultPinned?: readonly string[];
  onPinnedChange?: (pinned: string[]) => void;
  format?: NumberFormat;
  locale?: string;
  /** What is being ranked ("Teams"). */
  label?: string;
  /** Row height in px. Default 34. */
  rowHeight?: number;
  /** Height in px. Default: ranks x rowHeight + margins. */
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onActiveChange?: (active: { entity: string; period: string | number } | null) => void;
  summary?: string;
  chartLabel?: string;
}

/** "1st", "2nd", "3rd" in English; "#3" elsewhere. */
export function ordinal(rank: number, locale = "en-US"): string {
  if (!locale.toLowerCase().startsWith("en")) return `#${rank}`;
  const rule = new Intl.PluralRules(locale, { type: "ordinal" }).select(rank);
  const suffix = rule === "one" ? "st" : rule === "two" ? "nd" : rule === "few" ? "rd" : "th";
  return `${rank}${suffix}`;
}

/** Ranks per period from rows: explicit ranks, or by value (ties keep first-appearance order). */
export function bumpRanks<T>(
  data: readonly T[],
  options: { x: Accessor<T, string | number>; series: Accessor<T, string>; value?: Accessor<T, number | null | undefined>; rank?: Accessor<T, number | null | undefined>; higherIsBetter?: boolean; periods?: readonly (string | number)[] },
): { periods: (string | number)[]; entities: Array<{ id: string; ranks: (number | null)[]; values: (number | null)[] }> } {
  const periods: (string | number)[] = options.periods ? [...options.periods] : [];
  const pIndex = new Map<string, number>(periods.map((p, i) => [String(p), i]));
  const eIndex = new Map<string, number>();
  const entities: Array<{ id: string; ranks: (number | null)[]; values: (number | null)[] }> = [];
  const rows: Array<{ p: number; e: number; v: number | null; r: number | null }> = [];
  data.forEach((d, i) => {
    const p = readAccessor(options.x, d, i);
    const id = String(readAccessor(options.series, d, i));
    let pi = pIndex.get(String(p));
    if (pi === undefined) {
      if (options.periods) return;
      pi = periods.length;
      periods.push(p);
      pIndex.set(String(p), pi);
    }
    let ei = eIndex.get(id);
    if (ei === undefined) {
      ei = entities.length;
      eIndex.set(id, ei);
      entities.push({ id, ranks: [], values: [] });
    }
    const v = options.value ? readAccessor(options.value, d, i) : null;
    const r = options.rank ? readAccessor(options.rank, d, i) : null;
    rows.push({ p: pi, e: ei, v: typeof v === "number" && Number.isFinite(v) ? v : null, r: typeof r === "number" && Number.isFinite(r) ? r : null });
  });
  for (const e of entities) {
    e.ranks = periods.map(() => null);
    e.values = periods.map(() => null);
  }
  const hib = options.higherIsBetter ?? true;
  periods.forEach((_, pi) => {
    const here = rows.filter((r) => r.p === pi);
    for (const r of here) (entities[r.e] as (typeof entities)[number]).values[pi] = r.v;
    if (options.rank) {
      for (const r of here) (entities[r.e] as (typeof entities)[number]).ranks[pi] = r.r;
      return;
    }
    const scored = here.filter((r) => r.v !== null).sort((a, b) => (hib ? (b.v as number) - (a.v as number) : (a.v as number) - (b.v as number)) || a.e - b.e);
    scored.forEach((r, k) => {
      (entities[r.e] as (typeof entities)[number]).ranks[pi] = k + 1;
    });
  });
  return { periods, entities };
}

function BumpChartInner<T>(props: BumpChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    series,
    value,
    rank,
    higherIsBetter = true,
    periods: periodsProp,
    curve = "bump",
    directLabels = true,
    showRanks = true,
    color,
    pinned: pinnedProp,
    defaultPinned,
    onPinnedChange,
    format,
    locale = "en-US",
    label = "Entities",
    rowHeight = 34,
    height,
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
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);

  const model = React.useMemo(() => {
    const r = bumpRanks(data, { x, series, value, rank, higherIsBetter, periods: periodsProp });
    const entities: BumpEntity[] = r.entities.map((e, i) => ({ ...e, index: i, color: color ? color(e.id, i) : categoricalColor(i) }));
    let maxRank = 1;
    for (const e of entities) for (const k of e.ranks) if (k !== null && k > maxRank) maxRank = k;
    return { periods: r.periods, entities, maxRank };
  }, [data, x, series, value, rank, higherIsBetter, periodsProp, color]);
  const { periods, entities, maxRank } = model;
  const P = periods.length;

  const m = { top: 30, bottom: 14 };
  const H = height ?? maxRank * rowHeight + m.top + m.bottom;
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(240, width);
  const labelW = directLabels ? Math.min(140, Math.max(...entities.map((e) => estimateTextWidth(e.id, 11)), 24) + 14) : 0;
  const dotR = showRanks ? Math.min(10, Math.max(6, (H - m.top - m.bottom) / maxRank / 3.2)) : 4.5;
  const left = labelW + dotR + 8;
  const right = W - labelW - dotR - 8;
  const px = (p: number) => (P > 1 ? left + ((right - left) * p) / (P - 1) : (left + right) / 2);
  const rowH = (H - m.top - m.bottom) / Math.max(1, maxRank);
  const py = (r: number) => m.top + (r - 0.5) * rowH;

  const [innerPinned, setInnerPinned] = React.useState<ReadonlySet<string>>(() => new Set(defaultPinned ?? []));
  const pinned = React.useMemo(() => (pinnedProp ? new Set(pinnedProp) : innerPinned), [pinnedProp, innerPinned]);
  const togglePin = (id: string) => {
    const next = new Set(pinned);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (!pinnedProp) setInnerPinned(next);
    onPinnedChange?.([...next]);
    setAnnouncement(`${id} ${next.has(id) ? "pinned" : "unpinned"}.`);
  };

  const [hover, setHover] = React.useState<{ e: number; p: number } | null>(null);
  const [focus, setFocus] = React.useState<{ e: number; p: number } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activeEntity = active ? (entities[active.e] ?? null) : null;

  const lastActive = React.useRef("");
  React.useEffect(() => {
    const k = active && activeEntity ? `${activeEntity.id}:${active.p}` : "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveChange?.(active && activeEntity ? { entity: activeEntity.id, period: periods[active.p] as string | number } : null);
  });

  const lit = (e: BumpEntity) => (activeEntity ? activeEntity.id === e.id || pinned.has(e.id) : pinned.size ? pinned.has(e.id) : true);
  const anyFocus = !!activeEntity || pinned.size > 0;

  const pathOf = (e: BumpEntity) => linePath(e.ranks.map((r, p): Point | null => (r === null ? null : [px(p), py(r)])), { curve: curve === "bump" ? "bump" : "linear" });

  const describe = (e: BumpEntity, p: number) => {
    const r = e.ranks[p];
    if (r === null || r === undefined) return `${e.id}: not ranked in ${periods[p]}.`;
    const prev = p > 0 ? e.ranks[p - 1] : null;
    const move = prev !== null && prev !== undefined ? (prev === r ? ", no change" : `, ${prev > r ? "up" : "down"} ${Math.abs(prev - r)}`) : "";
    const v = e.values[p];
    return `${e.id}: ${ordinal(r, locale)} in ${periods[p]}${move}${v !== null && v !== undefined ? ` (${fmt(v)})` : ""}.`;
  };

  // Pointer: nearest line at the pointer's x (the bump's smoothstep between periods).
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const pt = pointerIn(event, W, H);
    if (!pt || !P) return null;
    const f = P > 1 ? Math.max(0, Math.min(P - 1, ((pt.x - left) / (right - left)) * (P - 1))) : 0;
    const p0 = Math.floor(f);
    const p1 = Math.min(P - 1, p0 + 1);
    const u = f - p0;
    const s = curve === "bump" ? u * u * (3 - 2 * u) : u;
    let best = rowH * 0.6;
    let bestE = -1;
    entities.forEach((e, ei) => {
      const a = e.ranks[p0];
      const b = e.ranks[p1];
      let y: number | null = null;
      if (a !== null && a !== undefined && b !== null && b !== undefined) y = py(a) + (py(b) - py(a)) * s;
      else if (a !== null && a !== undefined && u < 0.5) y = py(a);
      else if (b !== null && b !== undefined && u >= 0.5) y = py(b);
      if (y === null) return;
      const d = Math.abs(y - pt.y);
      if (d < best) {
        best = d;
        bestE = ei;
      }
    });
    return bestE < 0 ? null : { e: bestE, p: Math.round(f) };
  };

  const atPeriod = (p: number) =>
    entities
      .map((e, ei) => ({ ei, r: e.ranks[p] }))
      .filter((d): d is { ei: number; r: number } => d.r !== null && d.r !== undefined)
      .sort((a, b) => a.r - b.r)
      .map((d) => d.ei);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!P || !entities.length || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { e: atPeriod(0)[0] ?? 0, p: -1 };
    let next: { e: number; p: number } | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = { e: cur.e, p: Math.min(P - 1, cur.p + 1) };
        break;
      case "ArrowLeft":
        next = { e: cur.e, p: cur.p < 0 ? P - 1 : Math.max(0, cur.p - 1) };
        break;
      case "Home":
        next = { e: cur.e, p: 0 };
        break;
      case "End":
        next = { e: cur.e, p: P - 1 };
        break;
      case "ArrowDown":
      case "ArrowUp": {
        const p = Math.max(0, cur.p);
        const list = atPeriod(p);
        if (!list.length) break;
        const k = list.indexOf(cur.e);
        const nk = event.key === "ArrowDown" ? (k < 0 ? 0 : Math.min(list.length - 1, k + 1)) : k < 0 ? 0 : Math.max(0, k - 1);
        next = { e: list[nk] as number, p };
        break;
      }
      case "Enter":
      case " ":
        if (focus && entities[focus.e]) {
          event.preventDefault();
          togglePin((entities[focus.e] as BumpEntity).id);
        }
        return;
      case "Escape":
        if (focus) {
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
    if (!next) return;
    event.preventDefault();
    // If the entity isn't ranked in the new period, keep the period and pick the top entity.
    if ((entities[next.e] as BumpEntity).ranks[next.p] == null) next = { e: atPeriod(next.p)[0] ?? next.e, p: next.p };
    setFocus(next);
    setAnnouncement(describe(entities[next.e] as BumpEntity, next.p));
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} ranked over time`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!P || !entities.length) return "No data.";
    const moves = entities
      .map((e) => {
        const first = e.ranks.findIndex((r) => r !== null);
        let last = -1;
        e.ranks.forEach((r, i) => {
          if (r !== null) last = i;
        });
        return first < 0 ? null : { e, from: e.ranks[first] as number, to: e.ranks[last] as number };
      })
      .filter((d): d is { e: BumpEntity; from: number; to: number } => d !== null);
    const up = [...moves].sort((a, b) => b.from - b.to - (a.from - a.to))[0];
    const down = [...moves].sort((a, b) => a.from - a.to - (b.from - b.to))[0];
    const leader = entities.map((e) => ({ e, n: e.ranks.filter((r) => r === 1).length })).sort((a, b) => b.n - a.n)[0];
    return `${label} ranked over ${P} periods (${periods[0]} to ${periods[P - 1]}), ${entities.length} entities.${
      up && up.from > up.to ? ` Biggest climber ${up.e.id}, ${ordinal(up.from, locale)} to ${ordinal(up.to, locale)}.` : ""
    }${down && down.to > down.from ? ` Biggest fall ${down.e.id}, ${ordinal(down.from, locale)} to ${ordinal(down.to, locale)}.` : ""}${
      leader && leader.n ? ` ${leader.e.id} ranked first in ${leader.n} of ${P} periods.` : ""
    }`;
  })();

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active && activeEntity) {
    const r = activeEntity.ranks[active.p];
    if (r !== null && r !== undefined) {
      const tx = px(active.p);
      const ty = py(r) - dotR - 2;
      tip = { left: tx / W, top: (ty < 120 ? py(r) + dotR + 2 : ty) / H, flipX: tx / W > 0.6, below: ty < 120 };
    }
  }

  const drawT = (delay = 0): Transition => (anim.entrance ? { pathLength: { duration: 1.1, ease: outExpo, delay }, d: chartMotion.layout } : { d: anim.reducedMotion ? instant : chartMotion.layout });
  const spring = anim.reducedMotion ? instant : chartMotion.layout;

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Period columns + headers */}
          {periods.map((p, i) => {
            const on = active?.p === i;
            return (
              <g key={String(p)}>
                <line x1={px(i)} x2={px(i)} y1={m.top - 6} y2={H - m.bottom} stroke="var(--pui-chart-grid)" strokeDasharray={on ? undefined : "2 5"} strokeOpacity={on ? 1 : 0.9} />
                <text x={px(i)} y={m.top - 14} textAnchor="middle" fontSize={10.5} fontWeight={on ? 700 : 500} fill={on ? "var(--pui-foreground)" : "var(--pui-chart-axis)"}>
                  {String(p)}
                </text>
              </g>
            );
          })}
          {/* Lines */}
          {entities.map((e) => {
            const on = lit(e);
            const isActive = activeEntity?.id === e.id;
            const d = pathOf(e);
            return (
              <g key={e.id}>
                {isActive || pinned.has(e.id) ? (
                  <motion.path initial={false} animate={{ d }} transition={{ d: spring }} fill="none" stroke={withOpacity(e.color, 0.25)} strokeWidth={dotR * 1.6} strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
                <motion.path
                  initial={anim.entrance ? { pathLength: 0, d } : false}
                  animate={{ pathLength: 1, d, opacity: on ? 1 : 0.16 }}
                  transition={{ ...drawT(e.index * 0.03), opacity: anim.reducedMotion ? instant : chartMotion.fade }}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={isActive ? 3.5 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {/* Dots */}
          {entities.map((e) => {
            const on = lit(e);
            return (
              <motion.g key={e.id} initial={false} animate={{ opacity: on ? 1 : anyFocus ? 0.22 : 1 }} transition={anim.reducedMotion ? instant : chartMotion.fade}>
                {e.ranks.map((r, p) => {
                  if (r === null || r === undefined) return null;
                  const focused = active?.e === e.index && active.p === p;
                  const cx = px(p);
                  const cy = py(r);
                  const delay = anim.entrance ? 0.15 + (P > 1 ? (p / (P - 1)) * 0.9 : 0) : 0;
                  return (
                    <motion.g
                      key={String(periods[p])}
                      initial={anim.entrance ? { x: cx, y: cy, scale: 0 } : false}
                      animate={{ x: cx, y: cy, scale: focused ? 1.25 : 1 }}
                      transition={anim.reducedMotion ? instant : { x: spring, y: spring, scale: { type: "spring", stiffness: 420, damping: 20, delay } }}
                    >
                      {focused ? <circle r={dotR + 3.5} fill="none" stroke="var(--pui-ring, var(--pui-primary))" strokeWidth={2} /> : null}
                      <circle r={dotR} fill={e.color} stroke="var(--pui-background)" strokeWidth={2} />
                      {showRanks ? (
                        <text dy="0.35em" textAnchor="middle" fontSize={Math.max(8, dotR * 0.95)} fontWeight={700} fill="var(--pui-background)" className="tabular-nums">
                          {r}
                        </text>
                      ) : null}
                    </motion.g>
                  );
                })}
              </motion.g>
            );
          })}
          {/* Direct labels */}
          {directLabels
            ? entities.map((e) => {
                const first = e.ranks.findIndex((r) => r !== null && r !== undefined);
                let last = -1;
                e.ranks.forEach((r, i) => {
                  if (r !== null && r !== undefined) last = i;
                });
                if (first < 0) return null;
                const on = lit(e);
                const weight = activeEntity?.id === e.id || pinned.has(e.id) ? 700 : 500;
                const fill = on ? "var(--pui-foreground)" : "var(--pui-muted-foreground)";
                const opacity = on ? 1 : anyFocus ? 0.35 : 1;
                return (
                  <g key={e.id} pointerEvents="none">
                    <motion.text
                      initial={false}
                      animate={{ x: px(first) - dotR - 8, y: py(e.ranks[first] as number), opacity }}
                      transition={anim.reducedMotion ? instant : { x: spring, y: spring, opacity: chartMotion.fade }}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize={11}
                      fontWeight={weight}
                      fill={fill}
                    >
                      {e.id}
                    </motion.text>
                    <motion.text
                      initial={false}
                      animate={{ x: px(last) + dotR + 8, y: py(e.ranks[last] as number), opacity }}
                      transition={anim.reducedMotion ? instant : { x: spring, y: spring, opacity: chartMotion.fade }}
                      dy="0.35em"
                      textAnchor="start"
                      fontSize={11}
                      fontWeight={weight}
                      fill={fill}
                    >
                      {e.id}
                    </motion.text>
                  </g>
                );
              })
            : null}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Left and right arrows move between periods, up and down between ranks. Enter pins a line.`}
          aria-describedby={`${uid}-summary`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            const h = pick(event);
            if (h && entities[h.e]) togglePin((entities[h.e] as BumpEntity).id);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {active && activeEntity ? <BumpTip e={activeEntity} p={active.p} periods={periods} locale={locale} fmt={fmt} pinned={pinned.has(activeEntity.id)} /> : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={`${nameText} (rank per period)`}
          columns={["Entity", ...periods.map(String)]}
          rows={entities.map((e) => [e.id, ...e.ranks.map((r) => (r === null ? "\u2013" : ordinal(r, locale)))])}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

function BumpTip({ e, p, periods, locale, fmt, pinned }: { e: BumpEntity; p: number; periods: readonly (string | number)[]; locale: string; fmt: (v: number) => string; pinned: boolean }) {
  const r = e.ranks[p] as number;
  const prev = p > 0 ? e.ranks[p - 1] : null;
  const delta = prev !== null && prev !== undefined ? prev - r : null;
  const ranked = e.ranks.filter((k): k is number => k !== null);
  const best = Math.min(...ranked);
  const worst = Math.max(...ranked);
  const v = e.values[p];
  // A tiny rank history: up is better.
  const hist = e.ranks.map((k, i): Point | null => (k === null ? null : [4 + (i / Math.max(1, e.ranks.length - 1)) * 112, worst === best ? 9 : 3 + ((k - best) / (worst - best)) * 12]));
  return (
    <>
      <div className={cn(blockReset, "mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold")}>
        <span className={cn(blockReset, "flex items-center gap-1.5")}>
          <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-full")} style={{ background: e.color }} />
          {e.id}
        </span>
        <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>
          {String(periods[p])}
          {pinned ? " \u00b7 pinned" : ""}
        </span>
      </div>
      <TipRow label="Rank" value={ordinal(r, locale)} />
      {delta !== null ? <TipRow label="vs previous" value={delta === 0 ? "no change" : `${delta > 0 ? "\u25b2" : "\u25bc"} ${Math.abs(delta)}`} tone={delta > 0 ? "up" : delta < 0 ? "down" : "muted"} /> : null}
      {v !== null && v !== undefined ? <TipRow label="Score" value={fmt(v)} /> : null}
      <TipRow label="Best / worst" value={`${ordinal(best, locale)} / ${ordinal(worst, locale)}`} tone="muted" />
      <svg viewBox="0 0 120 18" className="mt-1 block h-4.5 w-full" aria-hidden="true">
        <path d={linePath(hist, { curve: "bump" })} fill="none" stroke={e.color} strokeWidth={1.5} strokeLinecap="round" />
        {hist[p] ? <circle cx={(hist[p] as Point)[0]} cy={(hist[p] as Point)[1]} r={2.5} fill={e.color} /> : null}
      </svg>
    </>
  );
}

/**
 * Rank over time with sigmoid bump lines, rank dots, direct labels, hover spotlight, click to
 * pin lines, gliding re-ranks on update and keyboard navigation over periods and ranks.
 */
export const BumpChart = React.forwardRef(BumpChartInner) as (<T>(props: BumpChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
BumpChart.displayName = "BumpChart";
