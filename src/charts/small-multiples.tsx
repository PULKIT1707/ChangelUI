"use client";
// SmallMultiples: one mini chart per group on shared scales, with a single crosshair synced across
// every facet (ChartSyncGroup), per-facet headline stats, sorting that re-flows the grid on a
// layout spring, and click-to-expand where a facet grows to full width in place.
import { LayoutGroup, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { Chart } from "./core/cartesian";
import { readAccessor, type Accessor, type XValue } from "./core/cartesian-model";
import { ChartCrosshair, ChartGrid, XAxis, YAxis } from "./core/cartesian-parts";
import { AreaSeries, BarSeries, LineSeries } from "./core/cartesian-series";
import { ChartTooltip } from "./core/cartesian-tooltip";
import { categoricalColor } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import type { Curve } from "./core/path";
import { ChartSyncGroup } from "./core/sync";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
const instant: Transition = { duration: 0 };
export interface FacetContext {
  key: string;
  /** Position in the displayed (sorted) order. */
  index: number;
  /** The shared value domain (sharedScale "y" or "both"), else undefined. */
  yDomain: readonly [number, number] | undefined;
  /** The shared x window (sharedScale "both", continuous x), else null. */
  xDomain: readonly [number, number] | null;
  height: number;
  expanded: boolean;
  color: string;
}
export interface FacetStats {
  key: string;
  first: number | null;
  last: number | null;
  total: number;
  min: number;
  max: number;
  /** last vs first, as a fraction (null without a non-zero first value). */
  change: number | null;
}
export type FacetSort = "none" | "total" | "last" | "change" | "alpha";
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Groups rows by facet (first-seen order) and computes headline stats per group. */
export function facetRows<T>(data: readonly T[], facet: Accessor<T, string>, y?: Accessor<T, number | null | undefined>): Array<{ key: string; rows: T[]; stats: FacetStats }> {
  const groups = new Map<string, T[]>();
  data.forEach((row, i) => {
    const key = String(readAccessor(facet, row, i));
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  });
  return [...groups].map(([key, rows]) => {
    const ys = y ? rows.map((r, i) => readAccessor(y, r, i)).filter(finite) : [];
    const first = ys[0] ?? null;
    const last = ys[ys.length - 1] ?? null;
    return {
      key,
      rows,
      stats: {
        key,
        first,
        last,
        total: ys.reduce((a, v) => a + v, 0),
        min: ys.length ? Math.min(...ys) : 0,
        max: ys.length ? Math.max(...ys) : 0,
        change: first !== null && last !== null && first !== 0 ? (last - first) / Math.abs(first) : null,
      },
    };
  });
}
export interface SmallMultiplesProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  data: readonly T[];
  /** Group per row: a column name or a function. */
  facet: Accessor<T, string>;
  x: Accessor<T, XValue>;
  /** Value per row: drives the shared scale, the header stats and the default mini chart. */
  y?: Accessor<T, number | null | undefined>;
  /** Columns, or "auto" (as many as fit at minFacetWidth). Default "auto". */
  columns?: "auto" | number;
  /** Narrowest facet for columns="auto", px. Default 220. */
  minFacetWidth?: number;
  /** Share the value axis ("y"), both axes ("both") or nothing. Default "y". */
  sharedScale?: "y" | "both" | "none";
  /** Default mini chart. Default "area". */
  kind?: "line" | "area" | "bar";
  curve?: Curve;
  /** Custom facet renderer (gets the group's rows); replaces the default mini chart. */
  chart?: (rows: T[], ctx: FacetContext) => React.ReactNode;
  /** Facet order: by stats or a fixed key order. Default "none" (first seen). */
  sort?: FacetSort | readonly string[];
  /** Mini chart height, px. Default 120. */
  facetHeight?: number;
  /** Click a facet title to grow it to full width. Default true. */
  expandable?: boolean;
  /** Expanded chart height, px. Default 300. */
  expandedHeight?: number;
  /** Controlled expanded facet key. */
  expanded?: string | null;
  defaultExpanded?: string | null;
  onExpandedChange?: (key: string | null) => void;
  /** "palette" gives each facet its own color; "single" uses one. Default "single". */
  color?: "single" | "palette";
  format?: NumberFormat;
  locale?: string;
  /** Header stats (latest value and change). Default true. */
  stats?: boolean;
  /** One crosshair across every facet. Default true. */
  sync?: boolean;
  /** Default "auto". */
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Server and first-paint width, px. Default 720. */
  initialWidth?: number;
}
function useColumns(ref: React.RefObject<HTMLElement | null>, columns: "auto" | number, min: number, initial: number, gap: number): number {
  const guess = typeof columns === "number" ? columns : Math.max(1, Math.floor((initial + gap) / (min + gap)));
  const [cols, setCols] = React.useState(guess);
  React.useEffect(() => {
    if (typeof columns === "number") {
      setCols(columns);
      return;
    }
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[entries.length - 1]?.contentRect.width ?? 0;
      if (w > 0) setCols(Math.max(1, Math.floor((w + gap) / (min + gap))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, columns, min, gap]);
  return Math.max(1, cols);
}
function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}
function SmallMultiplesInner<T>(
  {
    data,
    facet,
    x,
    y,
    columns = "auto",
    minFacetWidth = 220,
    sharedScale = "y",
    kind = "area",
    curve = "monotone",
    chart,
    sort = "none",
    facetHeight = 120,
    expandable = true,
    expandedHeight = 300,
    expanded: expandedProp,
    defaultExpanded = null,
    onExpandedChange,
    color = "single",
    format,
    locale = "en-US",
    stats = true,
    sync = true,
    animation = "auto",
    title,
    description,
    initialWidth = 720,
    className,
    ...rest
  }: SmallMultiplesProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const gap = 12;
  const cols = useColumns(gridRef, columns, minFacetWidth, initialWidth, gap);
  const anim = useChartAnimation(animation);
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [expandedState, setExpandedState] = React.useState<string | null>(defaultExpanded);
  const expanded = expandedProp !== undefined ? expandedProp : expandedState;
  const setExpanded = (key: string | null) => {
    if (expandedProp === undefined) setExpandedState(key);
    onExpandedChange?.(key);
  };
  const groups = React.useMemo(() => facetRows(data, facet, y), [data, facet, y]);
  const ordered = React.useMemo(() => {
    const list = [...groups];
    if (Array.isArray(sort)) {
      const rank = new Map((sort as readonly string[]).map((k, i) => [k, i]));
      return list.sort((a, b) => (rank.get(a.key) ?? 1e9) - (rank.get(b.key) ?? 1e9));
    }
    if (sort === "total") return list.sort((a, b) => b.stats.total - a.stats.total);
    if (sort === "last") return list.sort((a, b) => (b.stats.last ?? -Infinity) - (a.stats.last ?? -Infinity));
    if (sort === "change") return list.sort((a, b) => (b.stats.change ?? -Infinity) - (a.stats.change ?? -Infinity));
    if (sort === "alpha") return list.sort((a, b) => a.key.localeCompare(b.key, locale));
    return list;
  }, [groups, sort, locale]);
  const yDomain = React.useMemo<readonly [number, number] | undefined>(() => {
    if (sharedScale === "none" || !y || !groups.length) return undefined;
    const lo = Math.min(...groups.map((g) => g.stats.min));
    const hi = Math.max(...groups.map((g) => g.stats.max));
    return [kind === "line" ? lo : Math.min(0, lo), hi];
  }, [sharedScale, y, groups, kind]);
  const xDomain = React.useMemo<readonly [number, number] | null>(() => {
    if (sharedScale !== "both") return null;
    let lo = Infinity;
    let hi = -Infinity;
    data.forEach((row, i) => {
      const v = readAccessor(x, row, i);
      const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Number.NaN;
      if (!Number.isFinite(n)) return;
      lo = Math.min(lo, n);
      hi = Math.max(hi, n);
    });
    return hi > lo ? [lo, hi] : null;
  }, [sharedScale, data, x]);

  // Roving focus over the facet titles: arrows move in the grid, Home/End jump, Escape collapses.
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const buttons = React.useRef(new Map<string, HTMLButtonElement>());
  const current = focusKey && ordered.some((g) => g.key === focusKey) ? focusKey : (ordered[0]?.key ?? null);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = index + 1;
    else if (event.key === "ArrowLeft") next = index - 1;
    else if (event.key === "ArrowDown") next = index + cols;
    else if (event.key === "ArrowUp") next = index - cols;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ordered.length - 1;
    else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setExpanded(null);
      return;
    } else return;
    event.preventDefault();
    next = Math.max(0, Math.min(ordered.length - 1, next));
    const key = ordered[next]?.key;
    if (!key) return;
    setFocusKey(key);
    buttons.current.get(key)?.focus();
  };

  const fmt = (v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const layoutT = anim.reducedMotion ? instant : chartMotion.layout;

  const renderFacet = (rows: T[], ctx: FacetContext) => {
    if (chart) return chart(rows, ctx);
    if (!y) return null;
    const compact = !ctx.expanded;
    return (
      <Chart<T>
        data={rows}
        x={x}
        height={ctx.height}
        initialWidth={Math.max(160, Math.round(initialWidth / cols))}
        margin={compact ? { top: 6, right: 6, bottom: 22, left: 6 } : undefined}
        xDomain={ctx.xDomain}
        fitYToZoom={false}
        locale={locale}
        animation={animation}
        chartLabel={`${ctx.key} chart`}
        title={undefined}
      >
        <ChartGrid />
        <XAxis tickCount={compact ? 3 : 6} />
        <YAxis min={ctx.yDomain?.[0]} max={ctx.yDomain?.[1]} tickCount={compact ? 3 : 5} hide={compact} width={compact ? 0 : undefined} />
        {kind === "bar" ? (
          <BarSeries<T> id="value" y={y} label={ctx.key} color={ctx.color} format={format} />
        ) : kind === "line" ? (
          <LineSeries<T> id="value" y={y} label={ctx.key} color={ctx.color} curve={curve} format={format} markers={false} />
        ) : (
          <AreaSeries<T> id="value" y={y} label={ctx.key} color={ctx.color} curve={curve} format={format} strokeWidth={1.75} />
        )}
        <ChartCrosshair />
        <ChartTooltip showDelta />
      </Chart>
    );
  };

  const grid = (
    <LayoutGroup id={uid}>
      <div
        ref={gridRef}
        role="list"
        aria-label={typeof title === "string" ? title : "Small multiples"}
        className={cn(blockReset, "grid w-full")}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}
      >
        {ordered.map((g, i) => {
          const isExpanded = expandable && expanded === g.key;
          const tint = color === "palette" ? categoricalColor(groups.indexOf(g)) : "var(--pui-chart-1)";
          const ctx: FacetContext = { key: g.key, index: i, yDomain, xDomain, height: isExpanded ? expandedHeight : facetHeight, expanded: isExpanded, color: tint };
          const change = g.stats.change;
          const dimmed = expanded !== null && expandable && !isExpanded;
          return (
            <motion.div
              key={g.key}
              role="listitem"
              layout="position"
              initial={anim.entrance ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
              transition={anim.reducedMotion ? instant : { layout: layoutT, opacity: { duration: 0.3, delay: anim.entrance ? i * 0.03 : 0 }, y: { duration: 0.35, delay: anim.entrance ? i * 0.03 : 0 } }}
              className={cn(
                blockReset,
                "flex min-w-0 flex-col gap-1.5 rounded-pui-lg border bg-pui-background p-3 transition-[border-color,box-shadow] duration-200",
                isExpanded ? "border-pui-primary/40 shadow-pui-md" : "border-pui-border hover:border-pui-primary/30",
              )}
              style={isExpanded ? { gridColumn: "1 / -1" } : undefined}
            >
              <div className={cn(blockReset, "flex items-start justify-between gap-2")}>
                {expandable ? (
                  <button
                    ref={(el) => {
                      if (el) buttons.current.set(g.key, el);
                      else buttons.current.delete(g.key);
                    }}
                    type="button"
                    tabIndex={current === g.key ? 0 : -1}
                    aria-expanded={isExpanded}
                    onFocus={() => setFocusKey(g.key)}
                    onClick={() => setExpanded(isExpanded ? null : g.key)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className={cn(controlReset, focusRing, "group inline-flex min-w-0 items-center gap-1.5 rounded-pui-sm text-left text-sm font-semibold")}
                  >
                    <span className={cn(blockReset, "truncate")}>{g.key}</span>
                    <span className={cn(blockReset, "text-pui-muted-foreground opacity-60 transition-opacity group-hover:opacity-100")}>
                      <ExpandIcon expanded={isExpanded} />
                    </span>
                    <span className={cn(blockReset, "sr-only")}>{isExpanded ? ", collapse" : ", expand"}</span>
                  </button>
                ) : (
                  <span className={cn(blockReset, "truncate text-sm font-semibold")}>{g.key}</span>
                )}
                {stats && y && g.stats.last !== null ? (
                  <span className={cn(blockReset, "flex shrink-0 items-baseline gap-1.5 tabular-nums")}>
                    <span className={cn(blockReset, "text-sm font-semibold")}>{fmt(g.stats.last)}</span>
                    {change !== null ? (
                      <span className={cn(blockReset, "text-[11px] font-semibold", change > 0 ? "text-pui-success-text" : change < 0 ? "text-pui-danger-text" : "text-pui-muted-foreground")}>
                        {change > 0 ? "\u25b2" : change < 0 ? "\u25bc" : ""}
                        {pct.format(Math.abs(change))}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {renderFacet(g.rows, ctx)}
            </motion.div>
          );
        })}
      </div>
    </LayoutGroup>
  );
  return (
    <section ref={ref} aria-label={typeof title === "string" ? undefined : "Small multiples"} {...rest} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-3 text-pui-foreground", className)}>
      {title || description ? (
        <header className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? <h3 className={cn(blockReset, "text-sm font-semibold tracking-tight")}>{title}</h3> : null}
          {description ? <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</p> : null}
        </header>
      ) : null}
      {sync ? <ChartSyncGroup id={`facets-${uid}`}>{grid}</ChartSyncGroup> : grid}
    </section>
  );
}
/**
 * Small multiples: a faceted grid of mini charts on shared scales with one synced crosshair,
 * headline stats, animated sorting, and click-to-expand facets (roving arrow keys between titles).
 */
export const SmallMultiples = React.forwardRef(SmallMultiplesInner) as (<T>(props: SmallMultiplesProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
SmallMultiples.displayName = "SmallMultiples";
