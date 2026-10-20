"use client";

// Funnel: stages as plateaus joined by smooth (or straight) tapers, sized by value and centered on
// one axis. Step-conversion pills sit on each boundary and the biggest drop is flagged. Hovering a
// stage fades the rest and shows the hatched "lost" region against the previous stage, with a
// tooltip of % of start, % of previous, drop-off and an optional change vs the previous period.
// Stages expand from the center with a stagger; updates morph the widths without re-rendering.
import { motion, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { categoricalColor, withOpacity } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface FunnelStep {
  label: string;
  value: number;
  /** The same step last period: adds a change row to the tooltip. */
  previous?: number;
  /** Muted line under the label. */
  description?: string;
}

export interface FunnelStageInfo extends FunnelStep {
  index: number;
  /** value / first value (0..1). */
  ofStart: number;
  /** value / previous step value (0..1); 1 for the first step. */
  ofPrevious: number;
  /** People lost since the previous step. */
  dropped: number;
}

export interface FunnelChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  steps: readonly FunnelStep[];
  /** "horizontal" runs left to right. Default "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Tapers between stages. Default "smooth". */
  curve?: "smooth" | "linear";
  /** Step conversion pills on the boundaries. Default true. */
  showConversion?: boolean;
  /** Flag the boundary that loses the most. Default true. */
  highlightDrop?: boolean;
  /** Gradient stops along the funnel. Default chart-1 to chart-5. */
  colors?: readonly [string, string];
  /** Shape size across the axis in px (horizontal: the plot height). Default 180. */
  size?: number;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onStageClick?: (stage: FunnelStageInfo, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveStageChange?: (stage: FunnelStageInfo | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface Geo {
  /** Stage start / end along the axis (px). */
  start: number;
  step: number;
  /** Center of the across axis and its full extent. */
  mid: number;
  extent: number;
  horizontal: boolean;
  smooth: boolean;
}

/** Path of stage i given the current (tweened) heights. */
function stagePath(heights: ArrayLike<number>, i: number, g: Geo): string {
  const n = heights.length;
  const h = Math.max(3, heights[i] ?? 0);
  const hn = i < n - 1 ? Math.max(3, heights[i + 1] ?? 0) : h;
  const a = g.start + i * g.step;
  const e = a + g.step;
  const plateau = i < n - 1 ? a + g.step * 0.58 : e;
  const k = (e - plateau) * 0.5;
  const pt = (along: number, across: number) => (g.horizontal ? `${along.toFixed(2)},${across.toFixed(2)}` : `${across.toFixed(2)},${along.toFixed(2)}`);
  const top = g.mid - h / 2;
  const bot = g.mid + h / 2;
  const topN = g.mid - hn / 2;
  const botN = g.mid + hn / 2;
  const toNext = g.smooth ? `C${pt(plateau + k, top)} ${pt(e - k, topN)} ${pt(e, topN)}` : `L${pt(e, topN)}`;
  const back = g.smooth ? `C${pt(e - k, botN)} ${pt(plateau + k, bot)} ${pt(plateau, bot)}` : `L${pt(plateau, bot)}`;
  return `M${pt(a, top)}L${pt(plateau, top)}${toNext}L${pt(e, botN)}${back}L${pt(a, bot)}Z`;
}

function Stage({ tween, index, geo, ...props }: { tween: MotionValue<Float64Array>; index: number; geo: Geo } & React.ComponentProps<typeof motion.path>) {
  const d = useTransform(tween, (h) => stagePath(h, index, geo));
  return <motion.path d={d} {...props} />;
}

/** Conversion funnel with smooth stages, conversion pills, drop-off highlights and morphing updates. */
export const FunnelChart = React.forwardRef<HTMLElement, FunnelChartProps>(function FunnelChart(
  {
    steps,
    orientation = "horizontal",
    curve = "smooth",
    showConversion = true,
    highlightDrop = true,
    colors,
    size = 180,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onStageClick,
    onActiveStageChange,
    summary,
    chartLabel,
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const horizontal = orientation === "horizontal";
  const boxRef = React.useRef<HTMLDivElement>(null);
  const rowH = 64;
  const n = steps.length;
  const H = horizontal ? size : Math.max(1, n) * rowH;
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(160, width);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 0 }, locale), [format, locale]);
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);
  const pct0 = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const signedPct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }), [locale]);

  const stages: FunnelStageInfo[] = React.useMemo(() => {
    const first = Math.max(0, steps[0]?.value ?? 0);
    return steps.map((s, i) => {
      const prev = i ? Math.max(0, steps[i - 1]?.value ?? 0) : s.value;
      return {
        ...s,
        index: i,
        ofStart: first ? s.value / first : 0,
        ofPrevious: i === 0 ? 1 : prev ? s.value / prev : 0,
        dropped: i === 0 ? 0 : Math.max(0, prev - s.value),
      };
    });
  }, [steps]);
  const biggestDrop = React.useMemo(() => {
    let best = -1;
    let worst = 1;
    for (let i = 1; i < stages.length; i++) {
      const r = (stages[i] as FunnelStageInfo).ofPrevious;
      if (r < worst) {
        worst = r;
        best = i;
      }
    }
    return best;
  }, [stages]);

  // Geometry: along axis = stages, across axis = value.
  const alongLen = horizontal ? W : H;
  const across = horizontal ? H : Math.min(W * 0.62, 420);
  const pad = 6;
  const geo: Geo = { start: 0, step: alongLen / Math.max(1, n), mid: across / 2, extent: across - pad * 2, horizontal, smooth: curve === "smooth" };
  const maxV = Math.max(1, ...steps.map((s) => s.value));
  const heights = React.useMemo(() => Float64Array.from(steps.map((s) => (Math.max(0, s.value) / maxV) * (across - pad * 2))), [steps, maxV, across]);
  const tween = useDataTween(heights, { enabled: anim.updates, transition: chartMotion.update, resetKey: `${n}:${Math.round(across)}:${Math.round(alongLen)}` });

  const active = focus ?? hover;
  const activeStage = active === null ? null : (stages[active] ?? null);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveStageChange?.(activeStage);
  });

  const describe = (s: FunnelStageInfo) =>
    `Step ${s.index + 1}, ${s.label}: ${fmt(s.value)} (${pct.format(s.ofStart)} of start${s.index ? `, ${pct.format(s.ofPrevious)} of previous, ${fmt(s.dropped)} dropped` : ""}). Step ${s.index + 1} of ${n}.`;

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !n) return null;
    const along = horizontal ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(n - 1, Math.floor(along * n)));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? -1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(n - 1, cur + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = cur < 0 ? n - 1 : Math.max(0, cur - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      const s = stages[focus];
      if (s) onStageClick?.(s, event);
      return;
    } else if (event.key === "Escape" && focus !== null) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(stages[next] as FunnelStageInfo));
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : "Funnel");
  const summaryText = (() => {
    if (summary) return summary;
    const first = stages[0];
    const last = stages[stages.length - 1];
    if (!first || !last) return "No data.";
    const drop = biggestDrop > 0 ? stages[biggestDrop] : undefined;
    const prev = biggestDrop > 0 ? stages[biggestDrop - 1] : undefined;
    return `${n} steps from ${first.label} (${fmt(first.value)}) to ${last.label} (${fmt(last.value)}): ${pct.format(last.ofStart)} overall conversion.${
      drop && prev ? ` Biggest drop: ${prev.label} to ${drop.label}, losing ${fmt(drop.dropped)} (${pct0.format(1 - drop.ofPrevious)}).` : ""
    }`;
  })();

  const [c0, c1] = colors ?? [categoricalColor(0), categoricalColor(4)];
  const svgW = horizontal ? W : across;
  const svgH = horizontal ? H : H;
  const alongPos = (i: number) => geo.start + i * geo.step;

  // Tooltip anchor (fractions of the plot box).
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeStage) {
    const h = heights[activeStage.index] ?? 0;
    if (horizontal) {
      const ax = alongPos(activeStage.index) + geo.step * 0.3;
      tip = { left: ax / W, top: Math.max(4, geo.mid - h / 2) / H, flipX: ax / W > 0.6, below: geo.mid - h / 2 < 70 };
    } else {
      const ay = alongPos(activeStage.index) + geo.step / 2;
      tip = { left: (geo.mid + h / 2) / W, top: ay / H, flipX: false, below: ay < 80 };
    }
  }

  const stageSpring: Transition = anim.reducedMotion ? instant : { type: "spring", stiffness: 240, damping: 24 };

  const svg = (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
      <defs>
        <linearGradient id={`${uid}-fill`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={horizontal ? svgW : 0} y2={horizontal ? 0 : svgH}>
          <stop offset="0%" stopColor={c0} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
        <pattern id={`${uid}-lost`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={6} height={6} fill="var(--pui-danger)" fillOpacity={0.08} />
          <line x1={0} y1={0} x2={0} y2={6} stroke="var(--pui-danger)" strokeOpacity={0.55} strokeWidth={2} />
        </pattern>
      </defs>
      {/* Center axis guide */}
      <line
        x1={horizontal ? 0 : geo.mid}
        x2={horizontal ? svgW : geo.mid}
        y1={horizontal ? geo.mid : 0}
        y2={horizontal ? geo.mid : svgH}
        stroke="var(--pui-chart-grid)"
        strokeDasharray="2 4"
      />
      {/* Column separators */}
      {stages.slice(1).map((s) => {
        const p = alongPos(s.index);
        return horizontal ? (
          <line key={s.index} x1={p} x2={p} y1={0} y2={svgH} stroke="var(--pui-chart-grid)" />
        ) : (
          <line key={s.index} x1={0} x2={svgW} y1={p} y2={p} stroke="var(--pui-chart-grid)" />
        );
      })}
      {/* Lost region against the previous stage */}
      {activeStage && activeStage.index > 0 ? (
        (() => {
          const i = activeStage.index;
          const hp = heights[i - 1] ?? 0;
          const h = heights[i] ?? 0;
          const a = alongPos(i);
          const len = i < n - 1 ? geo.step * 0.58 : geo.step;
          const band = (from: number, to: number) =>
            horizontal ? <rect x={a} y={from} width={len} height={Math.max(0, to - from)} fill={`url(#${uid}-lost)`} rx={2} /> : <rect y={a} x={from} height={len} width={Math.max(0, to - from)} fill={`url(#${uid}-lost)`} rx={2} />;
          return (
            <g pointerEvents="none">
              {band(geo.mid - hp / 2, geo.mid - h / 2)}
              {band(geo.mid + h / 2, geo.mid + hp / 2)}
            </g>
          );
        })()
      ) : null}
      {stages.map((s, i) => (
        <motion.g
          key={i}
          initial={anim.entrance ? (horizontal ? { scaleY: 0, opacity: 0 } : { scaleX: 0, opacity: 0 }) : false}
          animate={{ scaleY: 1, scaleX: 1, opacity: active === null || active === i ? 1 : 0.45 }}
          transition={anim.reducedMotion ? instant : { scaleX: { ...stageSpring, delay: anim.entrance ? i * 0.06 : 0 }, scaleY: { ...stageSpring, delay: anim.entrance ? i * 0.06 : 0 }, opacity: chartMotion.fade }}
          style={{ transformOrigin: horizontal ? `0px ${geo.mid}px` : `${geo.mid}px 0px` }}
        >
          <Stage tween={tween} index={i} geo={geo} fill={`url(#${uid}-fill)`} stroke={active === i ? "var(--pui-foreground)" : withOpacity("var(--pui-background)", 0.6)} strokeWidth={active === i ? 1.5 : 1} />
        </motion.g>
      ))}
    </svg>
  );

  // Conversion pills on the boundaries (HTML, so they stay crisp and readable).
  const pills = showConversion
    ? stages.slice(1).map((s) => {
        const p = alongPos(s.index);
        const flagged = highlightDrop && s.index === biggestDrop && n > 2;
        const style: React.CSSProperties = horizontal ? { left: `${(p / W) * 100}%`, top: `${(geo.mid / H) * 100}%` } : { left: `${(geo.mid / W) * 100}%`, top: `${(p / H) * 100}%` };
        return (
          <motion.span
            key={s.index}
            aria-hidden="true"
            initial={anim.entrance ? { opacity: 0, scale: 0.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={anim.reducedMotion ? instant : { duration: 0.3, delay: anim.entrance ? 0.25 + s.index * 0.06 : 0 }}
            className={cn(
              blockReset,
              "pointer-events-none absolute z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pui-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-pui-sm backdrop-blur-md",
              flagged ? "border-pui-danger/40 bg-pui-background/90 text-pui-danger-text" : "border-pui-border bg-pui-background/85 text-pui-foreground",
            )}
            style={style}
          >
            {horizontal ? "\u2192 " : "\u2193 "}
            {pct0.format(s.ofPrevious)}
            {flagged ? <span className={cn(blockReset, "ms-1 font-medium")}>biggest drop</span> : null}
          </motion.span>
        );
      })
    : null;

  const overlay = (
    <div
      tabIndex={0}
      role="application"
      aria-roledescription="interactive chart"
      aria-label={`${nameText}. Use arrow keys to move between steps.`}
      aria-describedby={`${uid}-help`}
      onPointerMove={(event) => setHover(pick(event))}
      onPointerLeave={() => setHover(null)}
      onPointerUp={(event) => {
        const i = pick(event);
        const s = i === null ? null : stages[i];
        if (s) onStageClick?.(s, event);
      }}
      onKeyDown={onKeyDown}
      onBlur={() => setFocus(null)}
      className={cn(blockReset, focusRing, "absolute inset-0 z-[2] rounded-pui-md", onStageClick ? "cursor-pointer" : "cursor-default")}
      style={{ touchAction: "pan-y" }}
    />
  );

  const tooltip = (
    <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
      {activeStage ? (
        <>
          <div className={cn(blockReset, "mb-1 text-[11px] font-semibold text-pui-muted-foreground")}>
            Step {activeStage.index + 1} &middot; {activeStage.label}
          </div>
          <div className={cn(blockReset, "mb-1 text-sm font-semibold tabular-nums")}>{fmt(activeStage.value)}</div>
          <TipRow label="Of start" value={pct.format(activeStage.ofStart)} />
          {activeStage.index > 0 ? (
            <>
              <TipRow label="Of previous" value={pct.format(activeStage.ofPrevious)} />
              <TipRow label="Dropped" value={`\u2212${fmt(activeStage.dropped)} (${pct0.format(1 - activeStage.ofPrevious)})`} tone="down" />
            </>
          ) : null}
          {activeStage.previous !== undefined && activeStage.previous ? (
            <TipRow
              label="vs last period"
              value={signedPct.format((activeStage.value - activeStage.previous) / activeStage.previous)}
              tone={activeStage.value >= activeStage.previous ? "up" : "down"}
            />
          ) : null}
        </>
      ) : null}
    </ChartTip>
  );

  const labelCell = (s: FunnelStageInfo) => {
    const on = active === s.index;
    return (
      <div className={cn(blockReset, "flex min-w-0 flex-col gap-0.5 transition-opacity", active !== null && !on ? "opacity-50" : "")}>
        <span className={cn(blockReset, "truncate text-xs font-medium text-pui-muted-foreground")}>{s.label}</span>
        <span className={cn(blockReset, "text-lg font-semibold leading-tight tracking-tight tabular-nums")}>{fmt(s.value)}</span>
        <span className={cn(blockReset, "truncate text-[11px] tabular-nums text-pui-muted-foreground")}>{s.description ?? (s.index ? `${pct.format(s.ofStart)} of start` : "Start")}</span>
      </div>
    );
  };

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {horizontal ? (
        <div className={cn(blockReset, "flex flex-col gap-2")}>
          <div aria-hidden="true" className={cn(blockReset, "grid gap-2")} style={{ gridTemplateColumns: `repeat(${Math.max(1, n)}, minmax(0, 1fr))` }}>
            {stages.map((s) => (
              <div key={s.index} className={cn(blockReset, "ps-2")}>
                {labelCell(s)}
              </div>
            ))}
          </div>
          <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
            {svg}
            {pills}
            {overlay}
            {tooltip}
          </div>
        </div>
      ) : (
        <div className={cn(blockReset, "flex w-full gap-4")}>
          <div ref={boxRef} className={cn(blockReset, "relative min-w-0 flex-1 select-none")} style={{ height: H }}>
            <div className={cn(blockReset, "absolute inset-y-0 start-0")} style={{ width: `${(across / W) * 100}%` }}>
              {svg}
            </div>
            {pills}
            <div aria-hidden="true" className={cn(blockReset, "absolute inset-y-0 end-0 flex flex-col")} style={{ width: `${Math.max(0, 1 - across / W) * 100}%`, paddingInlineStart: 16 }}>
              {stages.map((s) => (
                <div key={s.index} className={cn(blockReset, "flex items-center")} style={{ height: rowH }}>
                  {labelCell(s)}
                </div>
              ))}
            </div>
            {overlay}
            {tooltip}
          </div>
        </div>
      )}
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Arrow keys move between steps, Home and End jump to the first and last, Enter activates, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["Step", "Value", "Of start", "Of previous", "Dropped"]}
        rows={stages.map((s) => [`${s.index + 1}. ${s.label}`, fmt(s.value), pct.format(s.ofStart), s.index ? pct.format(s.ofPrevious) : "", s.index ? fmt(s.dropped) : ""])}
      />
    </ChartFigure>
  );
});
FunnelChart.displayName = "FunnelChart";
