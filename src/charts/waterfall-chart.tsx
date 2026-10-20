"use client";

// Waterfall (bridge) chart: increases, decreases and totals with dashed connectors and a running
// total. The entrance is a cascade where each bar grows out of the level the previous one ended
// at, so the motion explains the arithmetic. Hover shows the change and the running total before
// and after; click or Enter selects; updates morph every bar to its new span.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { scaleBand, scaleLinear } from "./core/scale";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export type WaterfallKind = "increase" | "decrease" | "total";

export interface WaterfallBar<T> {
  index: number;
  label: string;
  kind: WaterfallKind;
  /** The change (for totals: the total). */
  value: number;
  /** Running total before and after this bar. */
  start: number;
  end: number;
  datum: T;
}

export interface WaterfallChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  data: readonly T[];
  label: Accessor<T, string | number>;
  /** The change for this step. Ignored for totals (they show the running total). */
  value: Accessor<T, number | null | undefined>;
  /** Marks total / subtotal bars, drawn from zero to the running total. */
  isTotal?: Accessor<T, boolean | null | undefined>;
  /** Style the first bar as a total (the starting value). Default true. */
  startAsTotal?: boolean;
  /** Dashed connectors between bars. Default true. */
  connectors?: boolean;
  /** Value labels on the bars. Default true. */
  valueLabels?: boolean;
  colors?: { increase?: string; decrease?: string; total?: string };
  /** "horizontal" lists the steps top to bottom with bars growing left and right. Default "vertical". */
  orientation?: "vertical" | "horizontal";
  /** Plot height in px. Default 300 (horizontal: 34 px per step). */
  height?: number;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  /** Controlled selected bar index. */
  selected?: number | null;
  defaultSelected?: number | null;
  onSelectedChange?: (index: number | null, bar: WaterfallBar<T> | null) => void;
  onActiveBarChange?: (bar: WaterfallBar<T> | null) => void;
  formatAnnouncement?: (bar: WaterfallBar<T>, total: number) => string;
  summary?: string;
  chartLabel?: string;
}

function WaterfallChartInner<T>(props: WaterfallChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    label,
    value,
    isTotal,
    startAsTotal = true,
    connectors = true,
    valueLabels = true,
    colors,
    orientation = "vertical",
    height: heightProp,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    selected: selectedProp,
    defaultSelected = null,
    onSelectedChange,
    onActiveBarChange,
    formatAnnouncement,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const horizontal = orientation === "horizontal";
  const height = heightProp ?? (horizontal ? Math.max(180, data.length * 34 + 40) : 300);
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [innerSelected, setInnerSelected] = React.useState<number | null>(defaultSelected);
  const selected = selectedProp !== undefined ? selectedProp : innerSelected;
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${fmt(Math.abs(v))}`;
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }), [locale]);

  const bars: WaterfallBar<T>[] = React.useMemo(() => {
    let run = 0;
    return data.map((d, i) => {
      const total = (isTotal ? !!readAccessor(isTotal, d, i) : false) || (startAsTotal && i === 0);
      const raw = readAccessor(value, d, i);
      const v = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      const name = String(readAccessor(label, d, i));
      if (total) {
        if (i === 0) run = v;
        return { index: i, label: name, kind: "total" as const, value: run, start: 0, end: run, datum: d };
      }
      const start = run;
      run += v;
      return { index: i, label: name, kind: v >= 0 ? ("increase" as const) : ("decrease" as const), value: v, start, end: run, datum: d };
    });
  }, [data, label, value, isTotal, startAsTotal]);
  const n = bars.length;

  const col = {
    increase: colors?.increase ?? "var(--pui-chart-up, var(--pui-success))",
    decrease: colors?.decrease ?? "var(--pui-chart-down, var(--pui-danger))",
    total: colors?.total ?? categoricalColor(0),
  };

  // Geometry.
  const W = Math.max(160, width);
  const H = height;
  let lo = 0;
  let hi = 0;
  for (const b of bars) {
    lo = Math.min(lo, b.start, b.end);
    hi = Math.max(hi, b.start, b.end);
  }
  if (lo === hi) hi = lo + 1;
  const [d0, d1] = nice(lo, hi, 5);
  const yTicks = niceTicks(d0, d1, Math.max(2, Math.round((horizontal ? W : H) / (horizontal ? 130 : 60))));
  const tickW = Math.max(...yTicks.map((t) => estimateTextWidth(fmt(t), 10)), 12);
  const labelW = Math.min(160, Math.max(0, ...bars.map((b) => estimateTextWidth(b.label, 10.5))) + 14);
  const valueW = valueLabels ? Math.max(0, ...bars.map((b) => estimateTextWidth(b.kind === "total" ? fmt(b.end) : signed(b.value), 10))) + 10 : 10;
  const m = horizontal
    ? { left: labelW, right: valueW, top: 6, bottom: 24 }
    : { left: tickW + 14, right: 8, top: valueLabels ? 22 : 10, bottom: 28 };
  // `ys` maps values onto the value axis (y when vertical, x when horizontal).
  const ys = horizontal ? scaleLinear([d0, d1], [m.left, W - m.right]) : scaleLinear([d0, d1], [H - m.bottom, m.top]);
  const band = scaleBand(
    bars.map((b) => b.index),
    horizontal ? [m.top, H - m.bottom] : [m.left, W - m.right],
    { paddingInner: horizontal ? 0.3 : 0.28, paddingOuter: 0.15 },
  );
  const bw = band.bandwidth;
  const every = horizontal ? 1 : Math.max(1, Math.ceil((Math.max(0, ...bars.map((b) => estimateTextWidth(b.label, 10))) + 8) / Math.max(1, band.step)));
  /** Bar rect from its band offset and its value span. */
  const barRect = (c: number, a: number, b: number) => {
    const p0 = ys(Math.min(a, b));
    const p1 = ys(Math.max(a, b));
    const len = Math.max(1, Math.abs(p1 - p0));
    return horizontal ? { x: Math.min(p0, p1), y: c, width: len, height: bw } : { x: c, y: Math.min(p0, p1), width: bw, height: len };
  };

  const active = focus ?? hover;
  const activeBar = active === null ? null : (bars[active] ?? null);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveBarChange?.(activeBar);
  });

  const first = bars[0];
  const last = bars[n - 1];
  const describe = (b: WaterfallBar<T>) => {
    if (formatAnnouncement) return formatAnnouncement(b, last?.end ?? 0);
    return b.kind === "total"
      ? `${b.label}: total ${fmt(b.end)}. Bar ${b.index + 1} of ${n}.`
      : `${b.label}: ${signed(b.value)}, running total ${fmt(b.end)}. Bar ${b.index + 1} of ${n}.`;
  };
  const select = (i: number | null, event?: React.SyntheticEvent) => {
    void event;
    const next = i !== null && i === selected ? null : i;
    if (selectedProp === undefined) setInnerSelected(next);
    onSelectedChange?.(next, next === null ? null : (bars[next] ?? null));
  };

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !n) return null;
    const px = horizontal ? ((event.clientY - rect.top) / rect.height) * H : ((event.clientX - rect.left) / rect.width) * W;
    if (horizontal ? px < m.top || px > H - m.bottom : px < m.left || px > W - m.right) return null;
    const k = band.at(px);
    return k === undefined ? null : k;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? -1;
    let next: number | null = null;
    const nextKey = horizontal ? "ArrowDown" : "ArrowRight";
    const prevKey = horizontal ? "ArrowUp" : "ArrowLeft";
    if (event.key === nextKey) next = Math.min(n - 1, cur + 1);
    else if (event.key === prevKey) next = cur < 0 ? n - 1 : Math.max(0, cur - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      select(focus, event);
      setAnnouncement(focus === selected ? "Selection cleared." : `Selected ${bars[focus]?.label ?? ""}.`);
      return;
    } else if (event.key === "Escape") {
      if (selected !== null) {
        event.preventDefault();
        event.stopPropagation();
        select(null);
        setAnnouncement("Selection cleared.");
      } else if (focus !== null) {
        event.preventDefault();
        setFocus(null);
      }
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(bars[next] as WaterfallBar<T>));
  };

  // Summary.
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Waterfall");
  const summaryText = (() => {
    if (summary) return summary;
    if (!first || !last) return "No data.";
    const steps = bars.filter((b) => b.kind !== "total");
    const up = steps.reduce<WaterfallBar<T> | undefined>((a, b) => (b.value > (a?.value ?? 0) ? b : a), undefined);
    const down = steps.reduce<WaterfallBar<T> | undefined>((a, b) => (b.value < (a?.value ?? 0) ? b : a), undefined);
    const change = last.end - first.end;
    return `Starts at ${fmt(first.end)} (${first.label}) and ends at ${fmt(last.end)} (${last.label}), ${signed(change)}${first.end ? ` (${pct.format(change / Math.abs(first.end))})` : ""}.${
      up ? ` Biggest increase: ${up.label} (${signed(up.value)}).` : ""
    }${down ? ` Biggest decrease: ${down.label} (${signed(down.value)}).` : ""}`;
  })();

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeBar && horizontal) {
    const tx = ys(Math.max(activeBar.start, activeBar.end)) + (valueLabels ? valueW * 0.6 : 6);
    const ty = band(activeBar.index) + bw / 2;
    tip = { left: Math.min(W - 8, tx) / W, top: ty / H, flipX: tx / W > 0.55, below: ty < 90 };
  } else if (activeBar) {
    const tx = band(activeBar.index) + bw / 2;
    const ty = ys(Math.max(activeBar.start, activeBar.end));
    tip = { left: tx / W, top: Math.max(m.top, ty - (valueLabels ? 14 : 0)) / H, flipX: tx / W > 0.62, below: ty < 110 };
  }

  const spring = anim.updates ? chartMotion.layout : instant;

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div aria-hidden="true" className={cn(blockReset, "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pui-muted-foreground")}>
        {(
          [
            ["increase", "Increase"],
            ["decrease", "Decrease"],
            ["total", "Total"],
          ] as const
        ).map(([k, name]) => (
          <span key={k} className={cn(blockReset, "inline-flex items-center gap-1.5")}>
            <span className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: col[k] }} />
            {name}
          </span>
        ))}
        {last ? (
          <span className={cn(blockReset, "ms-auto tabular-nums text-pui-foreground")}>
            {activeBar ? (
              <>
                Running total <strong className="font-semibold">{fmt(activeBar.end)}</strong>
              </>
            ) : (
              <>
                End <strong className="font-semibold">{fmt(last.end)}</strong>
              </>
            )}
          </span>
        ) : null}
      </div>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {yTicks.map((t) =>
            horizontal ? (
              <g key={t}>
                <line x1={ys(t)} x2={ys(t)} y1={m.top} y2={H - m.bottom} stroke="var(--pui-chart-grid)" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={ys(t)} y={H - m.bottom + 15} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                  {fmt(t)}
                </text>
              </g>
            ) : (
              <g key={t}>
                <line x1={m.left} x2={W - m.right} y1={ys(t)} y2={ys(t)} stroke="var(--pui-chart-grid)" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={m.left - 8} y={ys(t)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                  {fmt(t)}
                </text>
              </g>
            ),
          )}
          {d0 < 0 ? (
            horizontal ? (
              <line x1={ys(0)} x2={ys(0)} y1={m.top} y2={H - m.bottom} stroke="var(--pui-chart-axis)" />
            ) : (
              <line x1={m.left} x2={W - m.right} y1={ys(0)} y2={ys(0)} stroke="var(--pui-chart-axis)" />
            )
          ) : null}
          {activeBar ? (
            horizontal ? (
              <rect x={4} y={band(activeBar.index) - (band.step - bw) / 2} width={W - 8} height={band.step} rx={6} fill="var(--pui-muted)" opacity={0.6} />
            ) : (
              <rect x={band(activeBar.index) - (band.step - bw) / 2} y={m.top - 6} width={band.step} height={H - m.top - m.bottom + 6} rx={6} fill="var(--pui-muted)" opacity={0.6} />
            )
          ) : null}
          {/* Connectors */}
          {connectors
            ? bars.slice(0, -1).map((b, i) => {
                const nextBar = bars[i + 1] as WaterfallBar<T>;
                const lvl = ys(b.end);
                const c1 = band(b.index) + bw;
                const c2 = band(nextBar.index);
                if (horizontal) {
                  return (
                    <motion.line
                      key={i}
                      initial={anim.entrance ? { opacity: 0, x1: lvl, x2: lvl, y1: c1, y2: c1 } : false}
                      animate={{ opacity: 0.7, x1: lvl, x2: lvl, y1: c1, y2: c2 }}
                      transition={anim.reducedMotion ? instant : { ...spring, opacity: { duration: 0.2, delay: anim.entrance ? (i + 1) * 0.06 + 0.15 : 0 }, y2: { duration: 0.25, delay: anim.entrance ? (i + 1) * 0.06 + 0.15 : 0 } }}
                      stroke="var(--pui-muted-foreground)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  );
                }
                const y = lvl;
                const x1 = c1;
                const x2 = c2;
                return (
                  <motion.line
                    key={i}
                    initial={anim.entrance ? { opacity: 0, x1, x2: x1, y1: y, y2: y } : false}
                    animate={{ opacity: 0.7, x1, x2, y1: y, y2: y }}
                    transition={anim.reducedMotion ? instant : { ...spring, opacity: { duration: 0.2, delay: anim.entrance ? (i + 1) * 0.06 + 0.15 : 0 }, x2: { duration: 0.25, delay: anim.entrance ? (i + 1) * 0.06 + 0.15 : 0 } }}
                    stroke="var(--pui-muted-foreground)"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                );
              })
            : null}
          {/* Bars: each grows out of the level the previous one ended at */}
          {bars.map((b, i) => {
            const c = band(b.index);
            const r = b.kind === "total" ? barRect(c, 0, b.end) : barRect(c, b.start, b.end);
            const from = b.kind === "total" ? ys(0) : ys(b.start);
            // Entrance: a zero-length bar at the level the previous step ended at.
            const start = horizontal ? { x: from, width: 0.01, y: r.y, height: r.height } : { x: r.x, width: r.width, y: from, height: 0.01 };
            const fill = col[b.kind];
            const dim = (selected !== null && selected !== i) || (active !== null && active !== i);
            const isSel = selected === i;
            const delay = anim.entrance ? i * 0.06 : 0;
            const decrease = b.kind === "decrease";
            const labelPos = horizontal
              ? { x: decrease ? r.x - 6 : r.x + r.width + 6, y: r.y + r.height / 2 + 3.5 }
              : { x: r.x + r.width / 2, y: decrease ? r.y + r.height + 13 : r.y - 6 };
            return (
              <g key={i}>
                {isSel ? <rect x={r.x - 3} y={r.y - 3} width={r.width + 6} height={r.height + 6} rx={6} fill="none" stroke="var(--pui-ring, var(--pui-primary))" strokeWidth={2} /> : null}
                <motion.rect
                  initial={anim.entrance ? start : false}
                  animate={{ ...r, opacity: dim ? 0.45 : 1 }}
                  transition={anim.reducedMotion ? instant : { ...(anim.updates ? chartMotion.size : instant), ...(anim.entrance ? { delay } : {}), opacity: chartMotion.fade }}
                  rx={Math.min(4, bw / 4)}
                  fill={b.kind === "total" ? fill : withOpacity(fill, 0.88)}
                  stroke={active === i ? "var(--pui-foreground)" : "none"}
                  strokeWidth={1.25}
                />
                {valueLabels ? (
                  <motion.text
                    initial={anim.entrance ? { opacity: 0, ...labelPos } : false}
                    animate={{ opacity: dim ? 0.5 : 1, ...labelPos }}
                    transition={anim.reducedMotion ? instant : { ...spring, opacity: { duration: 0.25, delay: anim.entrance ? delay + 0.3 : 0 } }}
                    textAnchor={horizontal ? (decrease ? "end" : "start") : "middle"}
                    fontSize={10}
                    fontWeight={b.kind === "total" ? 700 : 600}
                    fill={b.kind === "total" ? "var(--pui-foreground)" : b.kind === "increase" ? "var(--pui-success-text)" : "var(--pui-danger-text)"}
                    className="tabular-nums"
                  >
                    {b.kind === "total" ? fmt(b.end) : signed(b.value)}
                  </motion.text>
                ) : null}
                {i % every === 0 || active === i ? (
                  <text
                    x={horizontal ? m.left - 10 : c + bw / 2}
                    y={horizontal ? c + bw / 2 + 3.5 : H - m.bottom + 16}
                    textAnchor={horizontal ? "end" : "middle"}
                    fontSize={10}
                    fontWeight={active === i || b.kind === "total" ? 600 : 400}
                    fill={active === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}
                  >
                    {b.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to move between bars.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const i = pick(event);
            if (i !== null) select(i, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover !== null ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeBar ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-pui-muted-foreground")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: col[activeBar.kind] }} />
                {activeBar.label}
              </div>
              {activeBar.kind === "total" ? (
                <>
                  <div className={cn(blockReset, "text-sm font-semibold tabular-nums")}>{fmt(activeBar.end)}</div>
                  {first && activeBar.index > 0 && first.end ? <TipRow label={`vs ${first.label}`} value={pct.format((activeBar.end - first.end) / Math.abs(first.end))} tone={activeBar.end >= first.end ? "up" : "down"} /> : null}
                </>
              ) : (
                <>
                  <div className={cn(blockReset, "text-sm font-semibold tabular-nums", activeBar.kind === "increase" ? "text-pui-success-text" : "text-pui-danger-text")}>{signed(activeBar.value)}</div>
                  <TipRow label="Running total" value={`${fmt(activeBar.start)} \u2192 ${fmt(activeBar.end)}`} />
                  {activeBar.start ? <TipRow label="Change" value={pct.format(activeBar.value / Math.abs(activeBar.start))} tone={activeBar.value >= 0 ? "up" : "down"} /> : null}
                  {first && first.end ? <TipRow label={`Share of ${first.label}`} value={getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(activeBar.value) / Math.abs(first.end))} tone="muted" /> : null}
                </>
              )}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        {horizontal ? "Up and down" : "Left and right"} arrows move between bars, Home and End jump to the ends, Enter selects, Escape clears, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["Step", "Change", "Running total"]}
        rows={bars.map((b) => [b.label, b.kind === "total" ? "Total" : signed(b.value), fmt(b.end)])}
      />
    </ChartFigure>
  );
}

/** Bridge chart with increase, decrease and total bars, connectors, a running total and a cascade entrance. */
export const WaterfallChart = React.forwardRef(WaterfallChartInner) as (<T>(props: WaterfallChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
WaterfallChart.displayName = "WaterfallChart";
