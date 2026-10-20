"use client";
// Tooltip and legend for <Chart>: HTML layers over and around the SVG. The tooltip glides between
// points on a snappy spring and flips at the plot edges; the legend toggles series (Alt+click
// isolates one), highlights on hover and focus, and shows live values for the active point.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../../lib/cn";
import { blockReset, controlReset, focusRing } from "../../lib/styles";
import { useChart, useChartLayer, useChartState } from "./cartesian";
import { seriesValuePx, type CartesianModel, type ResolvedSeries } from "./cartesian-model";
import { getNumberFormat } from "./format";
import { patternDash, patternFill } from "./patterns";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };

export interface TooltipRow {
  series: ResolvedSeries;
  value: number;
  formatted: string;
  /** Change vs the previous point (fraction), when known. */
  delta: number | null;
  /** Share of the stack (expand offset). */
  share: number | null;
}

export interface ChartTooltipContext {
  index: number;
  title: string;
  rows: TooltipRow[];
  total: number | null;
  highlightedId: string | null;
}

export interface ChartTooltipProps {
  /** Show the change from the previous point. Default false. */
  showDelta?: boolean;
  /** Total row: always, never, or "auto" (stacked charts with 2+ series). Default "auto". */
  showTotal?: boolean | "auto";
  /** Row order. Default "chart" (top of the stack first). */
  sort?: "chart" | "desc" | "asc";
  /** Replace the body. */
  content?: (ctx: ChartTooltipContext) => React.ReactNode;
  className?: string;
}

function rowsAt(model: CartesianModel, index: number, sort: ChartTooltipProps["sort"]): TooltipRow[] {
  const rows: TooltipRow[] = [];
  for (const s of model.series) {
    if (s.hidden) continue;
    const value = s.values[index];
    if (value === null || value === undefined) continue;
    const prev = index > 0 ? s.values[index - 1] : null;
    const low = s.lows?.[index];
    const range = low !== null && low !== undefined;
    const delta = !range && typeof prev === "number" && prev !== 0 ? (value - prev) / Math.abs(prev) : null;
    const band = s.bands?.[index];
    const share = model.stackOffset === "expand" && band ? band[1] - band[0] : null;
    const formatted = range ? `${model.formatValue(s, low)} \u2013 ${model.formatValue(s, value)}` : model.formatValue(s, value);
    rows.push({ series: s, value, formatted, delta, share });
  }
  if (sort === "desc") rows.sort((a, b) => b.value - a.value);
  else if (sort === "asc") rows.sort((a, b) => a.value - b.value);
  else if (model.series.some((s) => s.stack !== undefined) && model.layout === "vertical") rows.reverse();
  return rows;
}

function Swatch({ series, className }: { series: ResolvedSeries; className?: string }) {
  const { uid } = useChart();
  if (series.pattern) {
    // Same redundant encoding as the marks (the pattern defs live in the chart's SVG).
    return (
      <svg aria-hidden="true" viewBox="0 0 14 10" className={cn(blockReset, "h-2.5 w-3.5 shrink-0 overflow-visible", className)}>
        {series.kind === "line" ? (
          <path d="M1,5 H13" stroke={series.color} strokeWidth={2} strokeLinecap="round" strokeDasharray={patternDash(series.pattern)} />
        ) : (
          <>
            <rect width={14} height={10} rx={2.5} fill={series.color} />
            <rect width={14} height={10} rx={2.5} fill={patternFill(`${uid}-pat`, series.pattern)} />
          </>
        )}
      </svg>
    );
  }
  if (series.kind === "line") {
    return (
      <span aria-hidden="true" className={cn(blockReset, "relative inline-flex h-2.5 w-3.5 shrink-0 items-center", className)}>
        <span className={cn(blockReset, "h-0.5 w-full rounded-pui-full")} style={{ background: series.color, opacity: series.dashed ? 0.7 : 1 }} />
        <span className={cn(blockReset, "absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pui-full")} style={{ background: series.color }} />
      </span>
    );
  }
  return <span aria-hidden="true" className={cn(blockReset, "size-2.5 shrink-0 rounded-[3px]", className)} style={{ background: series.color }} />;
}

function Delta({ value, locale }: { value: number; locale: string }) {
  const up = value > 0;
  const flat = Math.abs(value) < 0.0005;
  const text = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(value));
  return (
    <span
      className={cn(
        blockReset,
        "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
        flat ? "text-pui-muted-foreground" : up ? "text-pui-success-text" : "text-pui-danger-text",
      )}
    >
      {flat ? null : (
        <svg viewBox="0 0 8 8" className={cn(blockReset, "size-2", up ? "" : "rotate-180")} aria-hidden="true">
          <path d="M4 1.2 7 6.4H1z" fill="currentColor" />
        </svg>
      )}
      {flat ? "0%" : text}
    </span>
  );
}

function TooltipBody({ ctx, showDelta, showTotal, locale }: { ctx: ChartTooltipContext; showDelta: boolean; showTotal: boolean; locale: string }) {
  const { model } = useChart();
  return (
    <div className={cn(blockReset, "flex min-w-40 flex-col gap-1.5")}>
      <div className={cn(blockReset, "text-[11px] font-semibold text-pui-muted-foreground")}>{ctx.title}</div>
      <div className={cn(blockReset, "flex flex-col gap-0.5")}>
        {ctx.rows.map((row) => {
          const on = ctx.highlightedId === row.series.id;
          return (
            <div
              key={row.series.id}
              className={cn(
                blockReset,
                "-mx-1.5 flex items-center gap-2 rounded-pui-sm px-1.5 py-0.5 transition-colors",
                on ? "bg-pui-muted" : "",
                ctx.highlightedId && !on ? "opacity-60" : "",
              )}
            >
              <Swatch series={row.series} />
              <span className={cn(blockReset, "min-w-0 flex-1 truncate text-xs")}>{row.series.label}</span>
              {showDelta && row.delta !== null ? <Delta value={row.delta} locale={locale} /> : null}
              <span className={cn(blockReset, "text-xs font-semibold tabular-nums")}>
                {row.share !== null ? getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(row.share) : row.formatted}
              </span>
            </div>
          );
        })}
      </div>
      {showTotal && ctx.total !== null ? (
        <div className={cn(blockReset, "mt-0.5 flex items-center justify-between gap-3 border-t border-pui-chart-tooltip-border pt-1.5 text-xs")}>
          <span className={cn(blockReset, "text-pui-muted-foreground")}>Total</span>
          <span className={cn(blockReset, "font-semibold tabular-nums")}>{model.series[0] ? model.formatValue(model.series[0], ctx.total) : ctx.total}</span>
        </div>
      ) : null}
    </div>
  );
}

function TooltipLayer({ showDelta = false, showTotal = "auto", sort = "chart", content, className }: ChartTooltipProps) {
  const { model, tooltip, animation, locale } = useChart();
  const active = useChartState((s) => s.activeIndex);
  const pointer = useChartState((s) => s.pointer);
  const highlightedId = useChartState((s) => s.highlight?.seriesId ?? null);
  if (tooltip === "none" || active === null || active >= model.n) {
    return <AnimatePresence />;
  }
  let rows = rowsAt(model, active, sort);
  if (tooltip === "item") rows = rows.filter((r) => r.series.id === highlightedId);
  const horizontal = model.layout === "horizontal";
  const stacked = model.series.some((s) => s.stack !== undefined && !s.hidden);
  const total = rows.length > 1 && !rows.some((r) => r.series.lows) ? rows.reduce((a, r) => a + r.value, 0) : null;
  const wantsTotal = showTotal === "auto" ? stacked && model.stackOffset !== "expand" : showTotal;
  const ctx: ChartTooltipContext = { index: active, title: model.formatX(active), rows, total, highlightedId };

  // Anchor: the category position, and the pointer (or the top-most mark) across it.
  const along = model.catPos(active);
  let across = pointer ? (horizontal ? pointer.x : pointer.y) : Number.NaN;
  if (!Number.isFinite(across)) {
    const tops = rows.map((r) => seriesValuePx(model, r.series, active)).filter(Number.isFinite);
    across = tops.length ? (horizontal ? Math.max(...tops) : Math.min(...tops)) : model.valueLength / 2;
  }
  const { margin: m, width: W, height: H } = model;
  const left = m.left + (horizontal ? across : along);
  const top = m.top + (horizontal ? along : across);
  const flipX = left / W > 0.58;
  const clampedTop = Math.max(0.12, Math.min(0.88, top / H));
  const transition = animation.reducedMotion ? instant : glide;
  const visible = rows.length > 0 || !!content;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="tooltip"
          role="presentation"
          aria-hidden="true"
          initial={animation.reducedMotion ? false : { opacity: 0, scale: 0.94, left: `${(left / W) * 100}%`, top: `${clampedTop * 100}%` }}
          animate={{ opacity: 1, scale: 1, left: `${(left / W) * 100}%`, top: `${clampedTop * 100}%` }}
          exit={animation.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
          transition={transition}
          className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
          style={{ transformOrigin: flipX ? "right center" : "left center" }}
        >
          <div
            className={cn(
              blockReset,
              "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md transition-transform duration-200 ease-pui-out",
              className,
            )}
            style={{ transform: `translate(${flipX ? "calc(-100% - 14px)" : "14px"}, -50%)` }}
          >
            {content ? content(ctx) : <TooltipBody ctx={ctx} showDelta={showDelta} showTotal={wantsTotal} locale={locale} />}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Rich tooltip for the active point (follows the pointer, keyboard focus and sync groups). */
export function ChartTooltip(props: ChartTooltipProps) {
  return useChartLayer() === "html" ? <TooltipLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Legend

export interface ChartLegendProps {
  /** Default "top". */
  position?: "top" | "bottom";
  /** Default "start". */
  align?: "start" | "center" | "end";
  /** Show each series' value at the active point. Default true. */
  values?: boolean;
  /** Group label for assistive tech. Default "Series". */
  legendLabel?: string;
  className?: string;
}

function LegendLayer({ align = "start", values = true, legendLabel = "Series", className }: ChartLegendProps) {
  const { model, store, animation } = useChart();
  const active = useChartState((s) => s.activeIndex);
  const highlightedId = useChartState((s) => s.highlight?.seriesId ?? null);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const series = model.series;
  const move = (to: number) => {
    const next = (to + series.length) % series.length;
    setFocusIndex(next);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="group"
      aria-label={legendLabel}
      className={cn(
        blockReset,
        "flex flex-wrap items-center gap-1",
        align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start",
        className,
      )}
      onKeyDown={(event) => {
        const keys: Record<string, number> = { ArrowRight: focusIndex + 1, ArrowDown: focusIndex + 1, ArrowLeft: focusIndex - 1, ArrowUp: focusIndex - 1, Home: 0, End: series.length - 1 };
        const to = keys[event.key];
        if (to === undefined) return;
        event.preventDefault();
        move(to);
      }}
    >
      {series.map((s, i) => {
        const value = active !== null ? s.values[active] : null;
        const dim = highlightedId !== null && highlightedId !== s.id;
        return (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            aria-pressed={!s.hidden}
            tabIndex={i === focusIndex ? 0 : -1}
            title="Click to toggle, Alt+click to show only this series"
            onClick={(event) => (event.altKey ? store.soloSeries(s.id) : store.toggleSeries(s.id))}
            onPointerEnter={() => !s.hidden && store.setHighlight({ seriesId: s.id, index: -1 })}
            onPointerLeave={() => store.setHighlight(null)}
            onFocus={() => {
              setFocusIndex(i);
              if (!s.hidden) store.setHighlight({ seriesId: s.id, index: -1 });
            }}
            onBlur={() => store.setHighlight(null)}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 py-1 text-xs transition-[opacity,background-color] duration-150 hover:bg-pui-muted",
              s.hidden ? "text-pui-muted-foreground" : "text-pui-foreground",
              dim ? "opacity-50" : "",
            )}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scale: s.hidden ? 0.75 : 1, opacity: s.hidden ? 0.45 : 1 }}
              transition={animation.reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 30 }}
              className={cn(blockReset, "inline-flex")}
            >
              <Swatch series={s} />
            </motion.span>
            <span className={cn(blockReset, s.hidden ? "line-through decoration-1" : "")}>{s.label}</span>
            {values && value !== null && value !== undefined && !s.hidden ? (
              <span className={cn(blockReset, "font-semibold tabular-nums text-pui-muted-foreground")}>{model.formatValue(s, value)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Toggle buttons for each series (Alt+click isolates one). */
export function ChartLegend(props: ChartLegendProps) {
  const layer = useChartLayer();
  const position = props.position ?? "top";
  return layer === `legend-${position}` ? <LegendLayer {...props} /> : null;
}
