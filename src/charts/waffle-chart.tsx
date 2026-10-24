"use client";

// Waffle (unit) chart: a grid of countable units that reads like "3 in 10 people". Units are split
// with the largest-remainder method so they always add up to the grid, fill by row or column, pop
// in by order and recolor in a wave when the data changes. Hovering a unit or a legend chip
// spotlights its category; clicking a chip pins it. Micro: plain HTML grid, only core math.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { categoricalColor, mix, withOpacity } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, useChartUid } from "./core/frame";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const pop: Transition = { type: "spring", stiffness: 400, damping: 18 };

export interface WaffleDatum {
  label: string;
  value: number;
  /** Stable identity when labels repeat or change. */
  key?: string;
  /** Any CSS color or token. Default: the chart palette in order. */
  color?: string;
}

export interface WaffleChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  data: readonly WaffleDatum[];
  /** Grid rows. Default 10. */
  rows?: number;
  /** Grid columns. Default 10. */
  columns?: number;
  /** The whole the units stand for. Default the sum of values; a larger total leaves empty units. */
  total?: number;
  /** Unit shape, or an element (an icon) colored through currentColor. Default "square". */
  shape?: "square" | "circle" | React.ReactElement;
  /** Fill units across rows (default) or down columns. */
  fillOrder?: "row" | "column";
  /** Gap between units in px. Default 3. */
  gap?: number;
  /** Plural noun for the readout ("people" makes "3 in 10 people"). */
  unit?: string;
  /** The big "3 in 10" readout for the spotlighted (or largest) category. Default true. */
  readout?: boolean;
  /** Legend chips under the grid. Default true. */
  legend?: boolean;
  /** Controlled spotlight (a key or label). */
  active?: string | null;
  onActiveChange?: (key: string | null) => void;
  format?: NumberFormat;
  locale?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Accessible name when there is no string title. Default "Waffle chart". */
  chartLabel?: string;
  animation?: ChartAnimation;
}

const keyOf = (d: WaffleDatum) => d.key ?? d.label;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Largest-remainder split of `cells` units over the values (the shares always add up). */
export function waffleUnits(values: readonly number[], cells: number, total?: number): number[] {
  const clean = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const sum = clean.reduce((a, v) => a + v, 0);
  const whole = Math.max(sum, total ?? 0);
  if (!whole || cells <= 0) return clean.map(() => 0);
  const exact = clean.map((v) => (v / whole) * cells);
  const units = exact.map(Math.floor);
  const target = Math.min(cells, Math.round((sum / whole) * cells));
  let left = target - units.reduce((a, v) => a + v, 0);
  const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0 && k < order.length; k++, left--) units[order[k]!.i]! += 1;
  return units;
}

/** "3 in 10" when the count reduces cleanly to a denominator of 10 or less, else "34 in 100". */
export function waffleRatio(count: number, cells: number): string {
  if (!cells) return "0 in 0";
  const d = gcd(count, cells) || 1;
  if (cells / d <= 10) return `${count / d} in ${cells / d}`;
  if (cells % 10 === 0 && count % (cells / 10) === 0) return `${count / (cells / 10)} in 10`;
  return `${count} in ${cells}`;
}

/** A unit grid for part-to-whole shares people can count, with spotlight, pinning and a "3 in 10" readout. */
export const WaffleChart = React.forwardRef<HTMLElement, WaffleChartProps>(function WaffleChart(
  {
    data,
    rows = 10,
    columns = 10,
    total,
    shape = "square",
    fillOrder = "row",
    gap = 3,
    unit,
    readout = true,
    legend = true,
    active: activeProp,
    onActiveChange,
    format,
    locale = "en-US",
    title,
    description,
    titleAs,
    chartLabel = "Waffle chart",
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const R = Math.max(1, Math.floor(rows));
  const C = Math.max(1, Math.floor(columns));
  const cells = R * C;
  const [hover, setHover] = React.useState<string | null>(null);
  const [pinnedInner, setPinnedInner] = React.useState<string | null>(null);
  const pinned = activeProp !== undefined ? activeProp : pinnedInner;
  const setPinned = (k: string | null) => {
    if (activeProp === undefined) setPinnedInner(k);
    onActiveChange?.(k);
  };
  const spot = hover ?? pinned;

  const fmt = (v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const sum = data.reduce((a, d) => a + (Number.isFinite(d.value) && d.value > 0 ? d.value : 0), 0);
  const whole = Math.max(sum, total ?? 0);

  const cats = React.useMemo(() => {
    const units = waffleUnits(
      data.map((d) => d.value),
      cells,
      total,
    );
    return data.map((d, i) => ({ key: keyOf(d), label: d.label, value: d.value, color: d.color ?? categoricalColor(i), units: units[i] ?? 0 }));
  }, [data, cells, total]);

  // Unit index (fill order) -> category index, -1 for empty units.
  const owner = React.useMemo(() => {
    const out = new Int16Array(cells).fill(-1);
    let n = 0;
    cats.forEach((c, ci) => {
      for (let k = 0; k < c.units && n < cells; k++) out[n++] = ci;
    });
    return out;
  }, [cats, cells]);

  const largest = cats.reduce<(typeof cats)[number] | null>((best, c) => (!best || c.value > best.value ? c : best), null);
  const shown = cats.find((c) => c.key === spot) ?? (spot ? null : largest);
  const unitText = unit ? ` ${unit}` : "";
  const summary = cats.length
    ? `${cats.map((c) => `${c.label}: ${fmt(c.value)} (${whole ? pct.format(c.value / whole) : "0%"}, ${waffleRatio(c.units, cells)}${unitText})`).join("; ")}.`
    : `${chartLabel}: no data.`;

  // Units in DOM order (row-major for the CSS grid); `order` is the fill position.
  const units = Array.from({ length: cells }, (_, dom) => {
    const r = Math.floor(dom / C);
    const c = dom % C;
    const order = fillOrder === "column" ? c * R + r : dom;
    return { dom, order, cat: owner[order] ?? -1 };
  });
  const stagger = Math.min(0.004, 0.6 / cells);
  const round = shape === "circle" ? "rounded-pui-full" : "rounded-[22%]";
  const iconShape = shape !== "square" && shape !== "circle" ? shape : null;

  return (
    <ChartFigure
      ref={ref}
      uid={uid}
      title={title}
      description={description}
      titleAs={titleAs}
      label={typeof title === "string" ? title : chartLabel}
      summary={summary}
      {...rest}
      className={cn("w-full", className)}
    >
      {readout && shown ? (
        <div aria-hidden="true" className={cn(blockReset, "flex min-h-11 items-end gap-3")}>
          <span className={cn(blockReset, "text-3xl font-semibold leading-none tracking-tight tabular-nums")} style={{ color: mix(shown.color, "var(--pui-foreground)", 0.55), transition: "color 200ms" }}>
            {waffleRatio(shown.units, cells)}
          </span>
          <span className={cn(blockReset, "flex min-w-0 flex-col pb-0.5 text-xs leading-tight")}>
            <span className={cn(blockReset, "truncate font-medium text-pui-foreground")}>
              {shown.label}
              {unit ? <span className={cn(blockReset, "text-pui-muted-foreground")}> {unit}</span> : null}
            </span>
            <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>
              {fmt(shown.value)} &middot; {whole ? pct.format(shown.value / whole) : "0%"}
            </span>
          </span>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        onPointerLeave={() => setHover(null)}
        className={cn(blockReset, "grid w-full")}
        style={{ gridTemplateColumns: `repeat(${C}, minmax(0, 1fr))`, gap }}
      >
        {units.map(({ dom, order, cat }) => {
          const c = cat >= 0 ? cats[cat] : undefined;
          const dim = !!spot && c?.key !== spot;
          const color = c ? (dim ? withOpacity(c.color, 0.22) : c.color) : "var(--pui-muted)";
          const delay = Math.min(0.6, order * stagger);
          const style: React.CSSProperties = iconShape
            ? { color, transition: `color 220ms ${order * 3}ms` }
            : { background: color, transition: `background-color 220ms ${order * 3}ms` };
          return (
            <motion.span
              key={dom}
              data-unit={c ? c.key : ""}
              onPointerEnter={c ? () => setHover(c.key) : () => setHover(null)}
              initial={anim.entrance ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: c && spot === c.key && !anim.reducedMotion ? 1.06 : 1, opacity: 1 }}
              transition={anim.reducedMotion ? instant : anim.entrance ? { ...pop, delay } : pop}
              className={cn(
                blockReset,
                "block aspect-square min-w-0",
                iconShape ? "flex items-center justify-center [&>svg]:size-full" : round,
              )}
              style={style}
            >
              {iconShape}
            </motion.span>
          );
        })}
      </div>
      {legend && cats.length ? (
        <div role="group" aria-label="Categories" className={cn(blockReset, "flex flex-wrap items-center gap-1")}>
          {cats.map((c) => {
            const on = pinned === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                aria-label={`${c.label}: ${fmt(c.value)}, ${waffleRatio(c.units, cells)}${unitText}`}
                onClick={() => setPinned(on ? null : c.key)}
                onPointerEnter={() => setHover(c.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c.key)}
                onBlur={() => setHover(null)}
                className={cn(
                  controlReset,
                  focusRing,
                  "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 py-1 text-xs transition-[opacity,background-color] duration-150 hover:bg-pui-muted",
                  on ? "bg-pui-muted" : "",
                  spot && spot !== c.key ? "opacity-55" : "",
                )}
              >
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 shrink-0", shape === "circle" ? "rounded-pui-full" : "rounded-[3px]")} style={{ background: c.color }} />
                <span className={cn(blockReset, "text-pui-foreground")}>{c.label}</span>
                <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>{c.units}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <ChartTable
        caption={typeof title === "string" ? title : chartLabel}
        columns={["Category", "Value", "Share", "Units"]}
        rows={cats.map((c) => [c.label, fmt(c.value), whole ? pct.format(c.value / whole) : "0%", `${c.units} of ${cells}`])}
        visible={false}
      />
    </ChartFigure>
  );
});
