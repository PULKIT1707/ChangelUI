"use client";
// Axes, grid, reference marks and the crosshair for <Chart>. Each part renders only in its layer.
// Ticks are keyed by value, so a data change slides surviving ticks and fades the rest.
import { AnimatePresence, motion, type Transition } from "motion/react";
import type { Tone } from "../../lib/types";
import { useChart, useChartLayer, useChartState, withChartRole } from "./cartesian";
import { seriesValuePx, type XValue } from "./cartesian-model";
import { ChartTableToggle } from "./frame";
import type { NumberFormat } from "./format";
import { estimateTextWidth } from "./format";
import { dodgeLabels } from "./label-layout";
import { chartMotion } from "./use-chart-motion";

const TICK_FONT = 11;
const instant: Transition = { duration: 0 };

function useTickTransition(): Transition {
  const { animation } = useChart();
  return animation.updates ? chartMotion.update : instant;
}

// ---------------------------------------------------------------------------------------------
// Axes

export interface XAxisProps {
  /** Tick label format: Intl date options (time axes), number options, or a function. */
  format?: Intl.DateTimeFormatOptions | Intl.NumberFormatOptions | ((value: XValue) => string);
  /** About this many ticks (continuous axes). */
  tickCount?: number;
  /** Keep the axis for layout but draw nothing. */
  hide?: boolean;
  /** Draw the axis line. Default true. */
  line?: boolean;
}

function XAxisLayer({ hide, line = true }: XAxisProps) {
  const { model } = useChart();
  const transition = useTickTransition();
  if (hide) return null;
  const horizontal = model.layout === "horizontal";
  return (
    <g aria-hidden="true" className="pui-chart-x-axis" fontSize={TICK_FONT} fill="var(--pui-muted-foreground)">
      {line ? (
        horizontal ? (
          <line x1={0} x2={0} y1={0} y2={model.plotH} stroke="var(--pui-chart-axis)" />
        ) : (
          <line x1={0} x2={model.plotW} y1={model.plotH} y2={model.plotH} stroke="var(--pui-chart-axis)" />
        )
      ) : null}
      <AnimatePresence initial={false}>
        {model.catTicks.map((t) =>
          horizontal ? (
            <motion.text
              key={t.key}
              initial={{ opacity: 0, y: t.pos }}
              animate={{ opacity: 1, y: t.pos }}
              exit={{ opacity: 0 }}
              transition={transition}
              x={-8}
              dy="0.32em"
              textAnchor="end"
            >
              {t.label}
            </motion.text>
          ) : (
            <motion.text
              key={t.key}
              initial={{ opacity: 0, x: t.pos }}
              animate={{ opacity: 1, x: t.pos }}
              exit={{ opacity: 0 }}
              transition={transition}
              y={model.plotH + 18}
              textAnchor="middle"
            >
              {t.label}
            </motion.text>
          ),
        )}
      </AnimatePresence>
    </g>
  );
}

/** The x (category) axis. With layout="horizontal" it is drawn on the left. */
export const XAxis = withChartRole(
  function XAxis(props: XAxisProps) {
    return useChartLayer() === "back" ? <XAxisLayer {...props} /> : null;
  },
  { kind: "x-axis" },
);

export interface YAxisProps {
  /** Axis id that series refer to with `yAxisId`. Default "y". */
  id?: string;
  side?: "left" | "right";
  min?: number;
  max?: number;
  /** Include 0 in the domain. Default: true when the axis has bars or areas. */
  includeZero?: boolean;
  format?: NumberFormat;
  tickCount?: number;
  /** Reserved label width in px (default: estimated from the tick labels). */
  width?: number;
  hide?: boolean;
}

function YAxisLayer({ id = "y", side = "left", hide }: YAxisProps) {
  const { model } = useChart();
  const transition = useTickTransition();
  if (hide) return null;
  const ticks = model.yTicks[id] ?? [];
  const horizontal = model.layout === "horizontal";
  return (
    <g aria-hidden="true" fontSize={TICK_FONT} fill="var(--pui-muted-foreground)" className="tabular-nums">
      <AnimatePresence initial={false}>
        {ticks.map((t) =>
          horizontal ? (
            <motion.text
              key={t.key}
              initial={{ opacity: 0, x: t.pos }}
              animate={{ opacity: 1, x: t.pos }}
              exit={{ opacity: 0 }}
              transition={transition}
              y={model.plotH + 18}
              textAnchor="middle"
            >
              {t.label}
            </motion.text>
          ) : (
            <motion.text
              key={t.key}
              initial={{ opacity: 0, y: t.pos }}
              animate={{ opacity: 1, y: t.pos }}
              exit={{ opacity: 0 }}
              transition={transition}
              x={side === "left" ? -10 : model.plotW + 10}
              dy="0.32em"
              textAnchor={side === "left" ? "end" : "start"}
            >
              {t.label}
            </motion.text>
          ),
        )}
      </AnimatePresence>
    </g>
  );
}

/** A value axis. Add a second one with `id` and `side="right"` for dual-axis charts. */
export const YAxis = withChartRole(
  function YAxis(props: YAxisProps) {
    return useChartLayer() === "back" ? <YAxisLayer {...props} /> : null;
  },
  { kind: "y-axis" },
);

// ---------------------------------------------------------------------------------------------
// Grid

export interface ChartGridProps {
  /** Lines at the value ticks. Default true. */
  y?: boolean;
  /** Lines at the category ticks. Default false. */
  x?: boolean;
  /** Value axis whose ticks are used. Default "y". */
  axisId?: string;
  /** Stronger line at value 0 when the domain crosses it. Default true. */
  zeroLine?: boolean;
  dashed?: boolean;
}

function GridLayer({ y = true, x = false, axisId = "y", zeroLine = true, dashed = false }: ChartGridProps) {
  const { model } = useChart();
  const transition = useTickTransition();
  const horizontal = model.layout === "horizontal";
  const ticks = model.yTicks[axisId] ?? model.yTicks[model.yAxes[0]?.id ?? "y"] ?? [];
  const scale = model.yScales[axisId] ?? model.yScales[model.yAxes[0]?.id ?? "y"];
  const [d0, d1] = scale ? scale.domain : [0, 1];
  const zero = zeroLine && scale && Math.min(d0, d1) < 0 && Math.max(d0, d1) > 0 ? scale(0) : null;
  const dash = dashed ? "3 4" : undefined;
  return (
    <g aria-hidden="true" stroke="var(--pui-chart-grid)" shapeRendering="crispEdges">
      <AnimatePresence initial={false}>
        {y
          ? ticks.map((t) =>
              horizontal ? (
                <motion.line key={t.key} initial={{ opacity: 0, x: t.pos }} animate={{ opacity: 1, x: t.pos }} exit={{ opacity: 0 }} transition={transition} y1={0} y2={model.plotH} strokeDasharray={dash} />
              ) : (
                <motion.line key={t.key} initial={{ opacity: 0, y: t.pos }} animate={{ opacity: 1, y: t.pos }} exit={{ opacity: 0 }} transition={transition} x1={0} x2={model.plotW} strokeDasharray={dash} />
              ),
            )
          : null}
        {x
          ? model.catTicks.map((t) =>
              horizontal ? (
                <motion.line key={`x${t.key}`} initial={{ opacity: 0, y: t.pos }} animate={{ opacity: 1, y: t.pos }} exit={{ opacity: 0 }} transition={transition} x1={0} x2={model.plotW} strokeDasharray={dash} />
              ) : (
                <motion.line key={`x${t.key}`} initial={{ opacity: 0, x: t.pos }} animate={{ opacity: 1, x: t.pos }} exit={{ opacity: 0 }} transition={transition} y1={0} y2={model.plotH} strokeDasharray={dash} />
              ),
            )
          : null}
      </AnimatePresence>
      {zero !== null ? (
        horizontal ? (
          <motion.line initial={false} animate={{ x: zero }} transition={transition} y1={0} y2={model.plotH} stroke="var(--pui-chart-axis)" />
        ) : (
          <motion.line initial={false} animate={{ y: zero }} transition={transition} x1={0} x2={model.plotW} stroke="var(--pui-chart-axis)" />
        )
      ) : null}
    </g>
  );
}

/** Background grid lines. */
export function ChartGrid(props: ChartGridProps) {
  return useChartLayer() === "back" ? <GridLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Reference marks

export type ChartTone = Tone;

export function toneColor(tone: ChartTone | undefined): string {
  switch (tone) {
    case "primary":
      return "var(--pui-primary)";
    case "success":
      return "var(--pui-success)";
    case "warning":
      return "var(--pui-warning)";
    case "danger":
      return "var(--pui-danger)";
    case "info":
      return "var(--pui-info)";
    default:
      return "var(--pui-muted-foreground)";
  }
}

export interface ReferenceLineProps {
  /** Horizontal line at this value. */
  y?: number;
  /** Vertical line at this x value. */
  x?: XValue;
  label?: string;
  tone?: ChartTone;
  /** Default true. */
  dashed?: boolean;
  axisId?: string;
}

function ReferenceLineLayer({ y, x, label, tone, dashed = true, axisId = "y" }: ReferenceLineProps) {
  const { model } = useChart();
  const transition = useTickTransition();
  const color = toneColor(tone);
  const horizontal = model.layout === "horizontal";
  const scale = model.yScales[axisId] ?? model.yScales[model.yAxes[0]?.id ?? "y"];
  const dash = dashed ? "6 5" : undefined;
  const labelWidth = label ? estimateTextWidth(label, 11) + 12 : 0;
  if (y !== undefined && scale) {
    const p = scale(y);
    if (!Number.isFinite(p)) return null;
    // Value lines run across the plot: horizontal in a vertical chart and vice versa.
    return (
      <motion.g initial={false} animate={horizontal ? { x: p } : { y: p }} transition={transition} aria-hidden="true">
        {horizontal ? <line y1={0} y2={model.plotH} stroke={color} strokeWidth={1.5} strokeDasharray={dash} /> : <line x1={0} x2={model.plotW} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />}
        {label ? (
          <g transform={horizontal ? `translate(${4},${4})` : `translate(${model.plotW - labelWidth},${-22})`}>
            <rect width={labelWidth} height={18} rx={9} fill={`color-mix(in oklab, ${color} 16%, var(--pui-background))`} stroke={`color-mix(in oklab, ${color} 45%, transparent)`} />
            <text x={labelWidth / 2} y={12.5} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
              {label}
            </text>
          </g>
        ) : null}
      </motion.g>
    );
  }
  if (x !== undefined) {
    const p = model.catValue(x);
    if (!Number.isFinite(p)) return null;
    return (
      <motion.g initial={false} animate={horizontal ? { y: p } : { x: p }} transition={transition} aria-hidden="true">
        {horizontal ? <line x1={0} x2={model.plotW} stroke={color} strokeWidth={1.5} strokeDasharray={dash} /> : <line y1={0} y2={model.plotH} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />}
        {label ? (
          <g transform={horizontal ? `translate(${model.plotW - labelWidth},${-20})` : `translate(${6},${0})`}>
            <rect width={labelWidth} height={18} rx={9} fill={`color-mix(in oklab, ${color} 16%, var(--pui-background))`} stroke={`color-mix(in oklab, ${color} 45%, transparent)`} />
            <text x={labelWidth / 2} y={12.5} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
              {label}
            </text>
          </g>
        ) : null}
      </motion.g>
    );
  }
  return null;
}

/** A target, threshold or event line with an optional pill label. */
export function ReferenceLine(props: ReferenceLineProps) {
  return useChartLayer() === "front" ? <ReferenceLineLayer {...props} /> : null;
}

export interface ReferenceAreaProps {
  /** x range (category values or numbers / dates). */
  x?: readonly [XValue, XValue];
  /** Value range. */
  y?: readonly [number, number];
  label?: string;
  tone?: ChartTone;
  axisId?: string;
}

function ReferenceAreaLayer({ x, y, label, tone = "primary", axisId = "y" }: ReferenceAreaProps) {
  const { model } = useChart();
  const horizontal = model.layout === "horizontal";
  const color = toneColor(tone);
  const scale = model.yScales[axisId] ?? model.yScales[model.yAxes[0]?.id ?? "y"];
  let c0 = 0;
  let c1 = model.catLength;
  let v0 = 0;
  let v1 = model.valueLength;
  if (x) {
    const half = model.bandwidth / 2;
    const a = model.catValue(x[0]);
    const b = model.catValue(x[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    c0 = Math.min(a, b) - half;
    c1 = Math.max(a, b) + half;
  }
  if (y && scale) {
    const a = scale(y[0]);
    const b = scale(y[1]);
    v0 = Math.min(a, b);
    v1 = Math.max(a, b);
  }
  const rect = horizontal ? { x: v0, y: c0, width: v1 - v0, height: c1 - c0 } : { x: c0, y: v0, width: c1 - c0, height: v1 - v0 };
  return (
    <g aria-hidden="true">
      <motion.rect initial={false} animate={rect} transition={chartMotion.update} rx={4} fill={`color-mix(in oklab, ${color} 9%, transparent)`} />
      {label ? (
        <text x={rect.x + 8} y={rect.y + 16} fontSize={11} fontWeight={600} fill={color}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

/** A shaded band: a campaign window, a target range, a forecast period. */
export function ReferenceArea(props: ReferenceAreaProps) {
  return useChartLayer() === "back" ? <ReferenceAreaLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Crosshair

export interface ChartCrosshairProps {
  /** Line across the category axis at the active point. Default true. */
  x?: boolean;
  /** Line at the pointer's value. Default false. */
  y?: boolean;
  /** Axis value pills (TradingView style). Default true. */
  labels?: boolean;
  /** Value axis for the y pill. Default "y". */
  axisId?: string;
}

function Pill({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: "middle" | "end" | "start" }) {
  const w = estimateTextWidth(text, 11) + 14;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <g>
      <rect x={left} y={y - 10} width={w} height={20} rx={6} fill="var(--pui-chart-tooltip-fg)" />
      <text x={left + w / 2} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--pui-chart-tooltip-bg)" className="tabular-nums">
        {text}
      </text>
    </g>
  );
}

function CrosshairBack() {
  const { model, tooltip } = useChart();
  const active = useChartState((s) => s.activeIndex);
  if (tooltip === "none" || active === null || !model.hasBars) return null;
  const horizontal = model.layout === "horizontal";
  const c = model.catPos(active);
  const size = model.bandwidth + Math.min(18, model.bandwidth * 0.35);
  const rect = horizontal ? { x: 0, y: c - size / 2, width: model.plotW, height: size } : { x: c - size / 2, y: 0, width: size, height: model.plotH };
  return <motion.rect aria-hidden="true" initial={false} animate={rect} transition={chartMotion.hover} rx={6} fill="color-mix(in oklab, var(--pui-muted) 70%, transparent)" />;
}

function CrosshairFront({ x = true, y = false, labels = true, axisId = "y" }: ChartCrosshairProps) {
  const { model, tooltip, animation } = useChart();
  const active = useChartState((s) => s.activeIndex);
  const pointer = useChartState((s) => s.pointer);
  if (tooltip === "none" || active === null) return null;
  const horizontal = model.layout === "horizontal";
  const c = model.catPos(active);
  const transition = animation.reducedMotion ? instant : chartMotion.hover;
  const scale = model.yScales[axisId] ?? model.yScales[model.yAxes[0]?.id ?? "y"];
  const across = pointer ? (horizontal ? pointer.x : pointer.y) : null;
  const showX = x && !model.hasBars;
  return (
    <g aria-hidden="true" pointerEvents="none">
      {showX ? (
        <motion.g initial={false} animate={horizontal ? { y: c } : { x: c }} transition={transition}>
          {horizontal ? (
            <line x1={0} x2={model.plotW} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" />
          ) : (
            <line y1={0} y2={model.plotH} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" />
          )}
          {labels && model.xAxis?.visible !== false ? (
            horizontal ? (
              <Pill x={-6} y={0} text={model.catTicks.length ? model.formatX(active) : ""} anchor="end" />
            ) : (
              <Pill x={0} y={model.plotH + 14} text={model.formatX(active)} anchor="middle" />
            )
          ) : null}
        </motion.g>
      ) : null}
      {y && across !== null && scale ? (
        <g>
          {horizontal ? (
            <line x1={across} x2={across} y1={0} y2={model.plotH} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" />
          ) : (
            <line x1={0} x2={model.plotW} y1={across} y2={across} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" />
          )}
          {labels ? (
            horizontal ? (
              <Pill x={across} y={model.plotH + 14} text={model.formatAxisValue(axisId, scale.invert(across))} anchor="middle" />
            ) : (
              <Pill x={-6} y={across} text={model.formatAxisValue(axisId, scale.invert(across))} anchor="end" />
            )
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

/** Snapping crosshair (vertical guide, or a band cursor for bars) with axis value pills. */
export function ChartCrosshair(props: ChartCrosshairProps) {
  const layer = useChartLayer();
  if (layer === "back") return <CrosshairBack />;
  if (layer === "front") return <CrosshairFront {...props} />;
  return null;
}


// ---------------------------------------------------------------------------------------------
// Direct labels

export interface ChartDirectLabelsProps {
  /** Also print the last value. Default false. */
  values?: boolean;
}

function DirectLabelsLayer({ values = false }: ChartDirectLabelsProps) {
  const { model, animation } = useChart();
  const highlighted = useChartState((s) => s.highlight?.seriesId ?? null);
  const items = model.series
    .filter((s) => !s.hidden && s.kind !== "bar")
    .map((s) => {
      let last = -1;
      for (let i = s.values.length - 1; i >= 0; i--) {
        if (s.values[i] !== null) {
          last = i;
          break;
        }
      }
      if (last < 0) return null;
      const stride = s.kind === "line" ? 2 : 3;
      const y = s.geometry[last * stride + 1] ?? Number.NaN;
      const x = s.geometry[last * stride] ?? 0;
      const text = values ? `${s.label} ${model.formatValue(s, s.values[last] as number)}` : s.label;
      return Number.isFinite(y) ? { s, x, y, text } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  const placed = dodgeLabels(
    items.map((it) => ({ position: it.y, size: 14 })),
    0,
    model.plotH,
    2,
  );
  const transition = animation.updates ? chartMotion.update : instant;
  return (
    <g aria-hidden="true" fontSize={11} fontWeight={600}>
      {items.map((it, k) => (
        <motion.g
          key={it.s.id}
          initial={false}
          animate={{ y: placed[k] ?? it.y, opacity: highlighted && highlighted !== it.s.id ? 0.3 : 1 }}
          transition={transition}
        >
          <line x1={it.x + 4} x2={model.plotW + 6} y1={it.y - (placed[k] ?? it.y)} y2={0} stroke={it.s.color} strokeOpacity={0.5} />
          <text x={model.plotW + 9} dy="0.32em" fill={it.s.color}>
            {it.text}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

/** Labels at the end of each line (collision-free), so color is never the only key. */
export function ChartDirectLabels(props: ChartDirectLabelsProps) {
  return useChartLayer() === "front" ? <DirectLabelsLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Annotations

export interface ChartAnnotationProps {
  /** The x value it points at (snaps to the nearest point on continuous axes). */
  x: XValue;
  /** Pin to this value. Without y or seriesId it marks the whole x (an event line). */
  y?: number;
  /** Pin to this series' point at x (follows the line through data morphs). */
  seriesId?: string;
  label: string;
  /** Second, muted line. */
  note?: string;
  tone?: ChartTone;
  /** Bubble offset from the point in px. Default: centered above (below when there is no room). */
  dx?: number;
  dy?: number;
  /** Value axis for `y`. Default "y". */
  axisId?: string;
}

function AnnotationLayer({ x, y, seriesId, label, note, tone = "primary", dx, dy, axisId = "y" }: ChartAnnotationProps) {
  const { model, animation } = useChart();
  const active = useChartState((s) => s.activeIndex);
  const horizontal = model.layout === "horizontal";
  const along = model.catValue(x);
  if (!Number.isFinite(along) || horizontal) return null;
  const index = model.n ? model.indexAt(along) : -1;
  // Continuous axes snap to the nearest data point, so the marker sits on the drawn line.
  const cx = model.xKind === "band" || index < 0 ? along : model.catPos(index);
  const series = seriesId ? model.series.find((s) => s.id === seriesId && !s.hidden) : undefined;
  const scale = model.yScales[axisId] ?? model.yScales[model.yAxes[0]?.id ?? "y"];
  let cy: number | null = null;
  if (series && index >= 0) cy = seriesValuePx(model, series, index);
  else if (y !== undefined && scale) cy = scale(y);
  if (cy !== null && !Number.isFinite(cy)) return null;
  if (seriesId && !series) return null;

  const color = toneColor(tone);
  const w = Math.max(estimateTextWidth(label, 11) * 1.06, note ? estimateTextWidth(note, 10.5) : 0) + 18;
  const h = note ? 36 : 22;
  const anchorY = cy ?? 0;
  const roomAbove = anchorY - h - 14 >= -model.margin.top + 2;
  const offY = dy ?? (cy === null ? 6 : roomAbove ? -(h + 14) : 14);
  // Event lines label beside the line (flipping at the right edge); points center the bubble.
  const autoDx = cy === null ? (cx + 6 + w > model.plotW ? -w - 6 : 6) : -w / 2;
  const left = Math.max(-model.margin.left + 2, Math.min(model.plotW + model.margin.right - w - 2, cx + (dx ?? autoDx)));
  const top = anchorY + offY;
  const emphasized = active !== null && active === index;
  const delay = animation.entrance ? 0.75 : 0;
  const spring = animation.reducedMotion ? instant : { type: "spring" as const, stiffness: 420, damping: 30, delay };
  const glide = animation.updates ? chartMotion.update : instant;
  // The connector runs from the marker to the nearest bubble edge.
  const edgeY = top > anchorY ? top : top + h;
  const edgeX = Math.max(left + 10, Math.min(left + w - 10, cx));
  return (
    <motion.g aria-hidden="true" pointerEvents="none" initial={false} animate={{ opacity: 1 }}>
      {cy === null ? (
        <motion.line
          initial={animation.entrance ? { x1: cx, x2: cx, y1: model.plotH, y2: model.plotH, opacity: 0 } : false}
          animate={{ x1: cx, x2: cx, y1: 0, y2: model.plotH, opacity: 1 }}
          transition={animation.reducedMotion ? instant : { ...chartMotion.drawLine, delay: delay * 0.6 }}
          stroke={color}
          strokeWidth={1.25}
          strokeDasharray="3 4"
        />
      ) : (
        <motion.line
          initial={animation.entrance ? { x1: cx, y1: anchorY, x2: cx, y2: anchorY, opacity: 0 } : false}
          animate={{ x1: cx, y1: anchorY, x2: edgeX, y2: edgeY, opacity: 0.8 }}
          transition={animation.reducedMotion ? instant : { ...glide, opacity: { duration: 0.25, delay } }}
          stroke={color}
          strokeWidth={1.25}
        />
      )}
      {cy !== null ? (
        <motion.g initial={false} animate={{ x: cx, y: anchorY }} transition={glide}>
          {animation.entrance && !animation.reducedMotion ? (
            <motion.circle
              r={5}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 3], opacity: [0.7, 0] }}
              transition={{ duration: 1.1, delay: delay + 0.1, ease: "easeOut" }}
            />
          ) : null}
          <motion.circle
            r={4.5}
            fill={color}
            stroke="var(--pui-background)"
            strokeWidth={2}
            initial={animation.entrance ? { scale: 0 } : false}
            animate={{ scale: emphasized ? 1.3 : 1 }}
            transition={spring}
          />
        </motion.g>
      ) : null}
      <motion.g
        initial={animation.entrance ? { opacity: 0, scale: 0.85, x: left, y: top + (top > anchorY ? -6 : 6) } : false}
        animate={{ opacity: 1, scale: emphasized ? 1.04 : 1, x: left, y: top }}
        transition={animation.reducedMotion ? instant : { ...glide, opacity: { duration: 0.25, delay }, scale: spring }}
        style={{ transformBox: "fill-box", originX: 0.5, originY: top > anchorY ? 0 : 1 }}
      >
        <rect
          width={w}
          height={h}
          rx={8}
          fill={`color-mix(in oklab, ${color} 12%, var(--pui-background))`}
          stroke={`color-mix(in oklab, ${color} ${emphasized ? 70 : 40}%, transparent)`}
          strokeWidth={1}
          style={{ filter: "drop-shadow(0 2px 6px color-mix(in oklab, var(--pui-foreground) 12%, transparent))" }}
        />
        <text x={9} y={note ? 15 : 14.5} fontSize={11} fontWeight={650} fill={color}>
          {label}
        </text>
        {note ? (
          <text x={9} y={29} fontSize={10.5} fill="var(--pui-muted-foreground)">
            {note}
          </text>
        ) : null}
      </motion.g>
    </motion.g>
  );
}

/**
 * A callout pinned to a point (a launch, an incident, a record): a marker with an entrance pulse,
 * a connector and a label bubble that stays inside the chart and follows data morphs. Without
 * `y` or `seriesId` it draws an event line across the plot.
 */
export function ChartAnnotation(props: ChartAnnotationProps) {
  return useChartLayer() === "front" ? <AnnotationLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// Visible data table toggle

export interface ChartDataTableProps {
  /** Where the toggle sits. Default "bottom". */
  position?: "top" | "bottom";
  showLabel?: string;
  hideLabel?: string;
}

function DataTableToggle({ showLabel = "Show data table", hideLabel = "Hide data table" }: ChartDataTableProps) {
  const { tableVisible, setTableVisible, tableId } = useChart();
  return <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={tableId} showLabel={showLabel} hideLabel={hideLabel} />;
}

/**
 * A "Show data table" button that turns the chart's screen-reader table into a visible, scrollable
 * one (T on the focused plot does the same).
 */
export function ChartDataTable(props: ChartDataTableProps) {
  const layer = useChartLayer();
  return layer === `legend-${props.position ?? "bottom"}` ? <DataTableToggle {...props} /> : null;
}
