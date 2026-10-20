"use client";

// Heatmap: a matrix of two categories colored on the sequential or diverging ramp, with a cohort
// (retention triangle) mode, auto cell labels that pick a readable ink, a row + column crosshair,
// a gradient legend with a live marker whose hover filters to a value band, a tooltip that
// compares the cell with its row and column averages, a diagonal-wave entrance, color crossfades
// on updates, and 2D keyboard exploration announced in a live region.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { divergingColor, sequentialColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };

export interface HeatmapCell<T> {
  x: string;
  y: string;
  xIndex: number;
  yIndex: number;
  value: number;
  datum: T;
}

export interface HeatmapChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** One row per cell. Missing cells stay empty (cohort triangles). */
  data: readonly T[];
  /** Column category. */
  x: Accessor<T, string | number>;
  /** Row category. */
  y: Accessor<T, string | number>;
  value: Accessor<T, number | null | undefined>;
  /** Column order (default: first appearance). */
  xOrder?: readonly (string | number)[];
  /** Row order (default: first appearance). */
  yOrder?: readonly (string | number)[];
  /** Default "sequential". "diverging" centers on `midpoint`. */
  scale?: "sequential" | "diverging";
  /** Color domain. Default: the data extent. */
  domain?: readonly [number, number];
  /** Diverging center. Default 0. */
  midpoint?: number;
  /** Values printed in cells: "auto" when they fit. Default "auto". */
  cellLabels?: "auto" | boolean;
  /** Row height in px. Default 30. */
  cellHeight?: number;
  /** Gap between cells in px. Default 2. */
  gap?: number;
  /** Cell corner radius. Default 4. */
  radius?: number;
  /** Cohort mode: percent format, column labels on top, empty cells hidden. Default false. */
  cohort?: boolean;
  /** Column labels. Default "bottom" ("top" in cohort mode). */
  xAxisPosition?: "top" | "bottom";
  /** Gradient legend. Default true. */
  legend?: boolean;
  /** Legend caption. */
  legendLabel?: string;
  format?: NumberFormat;
  locale?: string;
  /** Width before measuring (SSR viewBox). Default 640. */
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  onCellClick?: (cell: HeatmapCell<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveCellChange?: (cell: HeatmapCell<T> | null) => void;
  formatAnnouncement?: (cell: HeatmapCell<T>, position: { row: number; column: number; rows: number; columns: number }) => string;
  summary?: string;
  chartLabel?: string;
}

function HeatmapChartInner<T>(props: HeatmapChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    y,
    value,
    xOrder,
    yOrder,
    scale = "sequential",
    domain,
    midpoint = 0,
    cellLabels = "auto",
    cellHeight = 30,
    gap = 2,
    radius = 4,
    cohort = false,
    xAxisPosition,
    legend = true,
    legendLabel,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    onCellClick,
    onActiveCellChange,
    formatAnnouncement,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height: 100 });
  const [hover, setHover] = React.useState<{ c: number; r: number } | null>(null);
  const [focus, setFocus] = React.useState<{ c: number; r: number } | null>(null);
  const [band, setBand] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const fmt = React.useCallback(
    (v: number) => formatNumber(v, format ?? (cohort ? { style: "percent", maximumFractionDigits: 0 } : { notation: "compact", maximumFractionDigits: 1 }), locale),
    [format, cohort, locale],
  );

  // Matrix.
  const model = React.useMemo(() => {
    const cols: string[] = xOrder ? xOrder.map(String) : [];
    const rows: string[] = yOrder ? yOrder.map(String) : [];
    const colIdx = new Map(cols.map((c, i) => [c, i]));
    const rowIdx = new Map(rows.map((r, i) => [r, i]));
    const cells: Array<{ c: number; r: number; v: number; datum: T }> = [];
    data.forEach((d, i) => {
      const xs = String(readAccessor(x, d, i));
      const ys = String(readAccessor(y, d, i));
      const raw = readAccessor(value, d, i);
      if (!colIdx.has(xs)) {
        if (xOrder) return;
        colIdx.set(xs, cols.length);
        cols.push(xs);
      }
      if (!rowIdx.has(ys)) {
        if (yOrder) return;
        rowIdx.set(ys, rows.length);
        rows.push(ys);
      }
      if (typeof raw !== "number" || !Number.isFinite(raw)) return;
      cells.push({ c: colIdx.get(xs) as number, r: rowIdx.get(ys) as number, v: raw, datum: d });
    });
    const grid: Array<Array<number | null>> = rows.map(() => cols.map(() => null));
    const datums: Array<Array<T | null>> = rows.map(() => cols.map(() => null));
    for (const cell of cells) {
      (grid[cell.r] as Array<number | null>)[cell.c] = cell.v;
      (datums[cell.r] as Array<T | null>)[cell.c] = cell.datum;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const cell of cells) {
      lo = Math.min(lo, cell.v);
      hi = Math.max(hi, cell.v);
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const avg = (list: Array<number | null>) => {
      const vs = list.filter((v): v is number => v !== null);
      return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    };
    const rowAvg = grid.map((row) => avg(row));
    const colAvg = cols.map((_, c) => avg(grid.map((row) => row[c] ?? null)));
    return { cols, rows, grid, datums, cells, lo, hi, rowAvg, colAvg };
  }, [data, x, y, value, xOrder, yOrder]);

  const { cols, rows, grid } = model;
  const [d0, d1] = domain ? [domain[0], domain[1]] : [model.lo, model.hi];
  const diverging = scale === "diverging";
  const tOf = (v: number) => (diverging ? Math.max(-1, Math.min(1, (v - midpoint) / (Math.max(Math.abs(d0 - midpoint), Math.abs(d1 - midpoint)) || 1))) : Math.max(0, Math.min(1, (v - d0) / (d1 - d0 || 1))));
  const colorOf = (v: number) => (diverging ? divergingColor(v, d0, d1, midpoint) : sequentialColor(tOf(v)));
  const legendT = (v: number) => (diverging ? (tOf(v) + 1) / 2 : tOf(v));

  // Geometry.
  const xTop = (xAxisPosition ?? (cohort ? "top" : "bottom")) === "top";
  const yLabelW = Math.min(160, Math.ceil(Math.max(0, ...rows.map((r) => estimateTextWidth(r, 11)))) + 12);
  const m = { left: yLabelW, right: 4, top: xTop ? 22 : 4, bottom: xTop ? 4 : 22 };
  const W = Math.max(120, width);
  const plotW = Math.max(10, W - m.left - m.right);
  const nc = Math.max(1, cols.length);
  const nr = Math.max(1, rows.length);
  const cw = Math.max(2, (plotW - gap * (nc - 1)) / nc);
  const ch = cellHeight;
  const H = m.top + nr * ch + (nr - 1) * gap + m.bottom;
  const cx = (c: number) => m.left + c * (cw + gap);
  const cy = (r: number) => m.top + r * (ch + gap);
  const widestValue = Math.max(estimateTextWidth(fmt(d0), 10), estimateTextWidth(fmt(d1), 10));
  const showLabels = cellLabels === true || (cellLabels === "auto" && cw >= widestValue + 8 && ch >= 18);
  const xLabelEvery = Math.max(1, Math.ceil((Math.max(0, ...cols.map((c) => estimateTextWidth(c, 10))) + 6) / (cw + gap)));

  const active = focus ?? hover;
  const cellAt = (c: number, r: number): HeatmapCell<T> | null => {
    const v = grid[r]?.[c];
    const datum = model.datums[r]?.[c];
    if (v === null || v === undefined || datum === null || datum === undefined) return null;
    return { x: cols[c] as string, y: rows[r] as string, xIndex: c, yIndex: r, value: v, datum };
  };
  const activeCell = active ? cellAt(active.c, active.r) : null;

  const lastActive = React.useRef<string>("");
  React.useEffect(() => {
    const k = activeCell ? `${activeCell.xIndex}:${activeCell.yIndex}` : "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveCellChange?.(activeCell);
  }, [activeCell, onActiveCellChange]);

  const describe = (cell: HeatmapCell<T>) => {
    if (formatAnnouncement) return formatAnnouncement(cell, { row: cell.yIndex, column: cell.xIndex, rows: rows.length, columns: cols.length });
    const ra = model.rowAvg[cell.yIndex];
    const vs = ra !== null && ra !== undefined && ra !== 0 ? `, ${getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format((cell.value - ra) / Math.abs(ra))} vs row average` : "";
    return `${cell.y}, ${cell.x}: ${fmt(cell.value)}${vs}. Row ${cell.yIndex + 1} of ${rows.length}, column ${cell.xIndex + 1} of ${cols.length}.`;
  };

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const px = ((event.clientX - rect.left) / rect.width) * W - m.left;
    const py = ((event.clientY - rect.top) / rect.height) * H - m.top;
    if (px < 0 || py < 0) return null;
    const c = Math.floor(px / (cw + gap));
    const r = Math.floor(py / (ch + gap));
    if (c < 0 || c >= cols.length || r < 0 || r >= rows.length) return null;
    return { c, r };
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cols.length || !rows.length || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { c: -1, r: 0 };
    let next: { c: number; r: number } | null = null;
    if (event.key === "ArrowRight") next = { c: Math.min(cols.length - 1, cur.c + 1), r: cur.r };
    else if (event.key === "ArrowLeft") next = { c: cur.c < 0 ? cols.length - 1 : Math.max(0, cur.c - 1), r: cur.r };
    else if (event.key === "ArrowDown") next = { c: Math.max(0, cur.c), r: Math.min(rows.length - 1, cur.r + 1) };
    else if (event.key === "ArrowUp") next = { c: Math.max(0, cur.c), r: Math.max(0, cur.r - 1) };
    else if (event.key === "Home") next = { c: 0, r: event.ctrlKey ? 0 : cur.r };
    else if (event.key === "End") next = { c: cols.length - 1, r: cur.r };
    else if (event.key === "PageDown") next = { c: Math.max(0, cur.c), r: rows.length - 1 };
    else if (event.key === "PageUp") next = { c: Math.max(0, cur.c), r: 0 };
    else if ((event.key === "Enter" || event.key === " ") && focus) {
      event.preventDefault();
      const cell = cellAt(focus.c, focus.r);
      if (cell) onCellClick?.(cell, event);
      return;
    } else if (event.key === "Escape" && focus) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    const cell = cellAt(next.c, next.r);
    setAnnouncement(cell ? describe(cell) : `${rows[next.r]}, ${cols[next.c]}: no data.`);
  };

  // Summary.
  let maxCell: (typeof model.cells)[number] | undefined;
  let minCell: (typeof model.cells)[number] | undefined;
  for (const cell of model.cells) {
    if (!maxCell || cell.v > maxCell.v) maxCell = cell;
    if (!minCell || cell.v < minCell.v) minCell = cell;
  }
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Heatmap");
  const summaryText =
    summary ??
    (maxCell && minCell
      ? `${rows.length} rows by ${cols.length} columns. Highest ${fmt(maxCell.v)} at ${rows[maxCell.r]}, ${cols[maxCell.c]}; lowest ${fmt(minCell.v)} at ${rows[minCell.r]}, ${cols[minCell.c]}.`
      : "No data.");
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeCell) {
    const tx = cx(activeCell.xIndex) + cw / 2;
    const ty = cy(activeCell.yIndex);
    tip = { left: tx / W, top: (ty + (ty < 70 ? ch : 0)) / H, flipX: tx / W > 0.6, below: ty < 70 };
  }
  const rel = (v: number, avg: number | null | undefined) =>
    avg === null || avg === undefined || avg === 0 ? null : getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format((v - avg) / Math.abs(avg));
  const legendStops = Array.from({ length: 9 }, (_, k) => {
    const t = k / 8;
    return diverging ? divergingColor(d0 + (d1 - d0) * t, d0, d1, midpoint) : sequentialColor(t);
  });
  const markerT = activeCell ? legendT(activeCell.value) : band;
  const total = cols.length * rows.length;

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={descId}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={titleId} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Row / column crosshair */}
          {active ? (
            <g pointerEvents="none">
              <rect x={m.left - 4} y={cy(active.r) - 1} width={plotW + 8} height={ch + 2} rx={radius + 1} fill="var(--pui-muted)" opacity={0.8} />
              <rect x={cx(active.c) - 1} y={m.top - 4} width={cw + 2} height={H - m.top - m.bottom + 8} rx={radius + 1} fill="var(--pui-muted)" opacity={0.8} />
            </g>
          ) : null}
          {/* Row labels */}
          {rows.map((r, i) => (
            <text
              key={r}
              x={m.left - 8}
              y={cy(i) + ch / 2}
              dy="0.35em"
              textAnchor="end"
              fontSize={11}
              fontWeight={active?.r === i ? 700 : 400}
              fill={active?.r === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}
            >
              {r}
            </text>
          ))}
          {/* Column labels */}
          {cols.map((c, i) =>
            i % xLabelEvery === 0 || active?.c === i ? (
              <text
                key={c}
                x={cx(i) + cw / 2}
                y={xTop ? m.top - 8 : H - m.bottom + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight={active?.c === i ? 700 : 400}
                fill={active?.c === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}
              >
                {c}
              </text>
            ) : null,
          )}
          {/* Cells */}
          {grid.map((row, r) =>
            row.map((v, c) => {
              if (v === null) {
                return cohort ? null : <rect key={`${r}:${c}`} x={cx(c)} y={cy(r)} width={cw} height={ch} rx={radius} fill="none" stroke="var(--pui-border)" strokeDasharray="2 3" />;
              }
              const t = tOf(v);
              const inBand = band === null || Math.abs(legendT(v) - band) <= 0.12;
              const inCross = !active || active.r === r || active.c === c;
              const isActive = active?.r === r && active?.c === c;
              const opacity = !inBand ? 0.12 : inCross ? 1 : 0.5;
              const delay = anim.entrance ? Math.min(0.5, (r + c) * 0.025 + ((r * nc + c) / Math.max(1, total)) * 0.1) : 0;
              const ink = Math.abs(t) > 0.55 ? "var(--pui-background)" : "var(--pui-foreground)";
              return (
                <g key={`${r}:${c}`}>
                  <motion.rect
                    x={cx(c)}
                    y={cy(r)}
                    width={cw}
                    height={ch}
                    rx={radius}
                    initial={anim.entrance ? { opacity: 0, scale: 0.4 } : false}
                    animate={{ opacity, scale: 1 }}
                    transition={anim.reducedMotion ? instant : { opacity: anim.entrance && !active && band === null ? { duration: 0.35, delay } : { duration: 0.15 }, scale: { type: "spring", stiffness: 300, damping: 24, delay } }}
                    style={{ fill: colorOf(v), transition: anim.reducedMotion ? undefined : "fill 300ms", transformBox: "fill-box", transformOrigin: "center" }}
                    stroke={isActive ? "var(--pui-foreground)" : "none"}
                    strokeWidth={isActive ? 2 : 0}
                  />
                  {showLabels ? (
                    <text
                      x={cx(c) + cw / 2}
                      y={cy(r) + ch / 2}
                      dy="0.35em"
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={ink}
                      opacity={opacity < 1 ? opacity * 0.9 : 1}
                      pointerEvents="none"
                      className="tabular-nums"
                      style={{ transition: "opacity 150ms" }}
                    >
                      {fmt(v)}
                    </text>
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to move between cells.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const p = pick(event);
            const cell = p ? cellAt(p.c, p.r) : null;
            if (cell) onCellClick?.(cell, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover && onCellClick ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <AnimatePresence>
          {tip && activeCell ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
              animate={{ opacity: 1, scale: 1, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={anim.reducedMotion ? instant : glide}
              className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
            >
              <div
                className={cn(blockReset, "min-w-44 rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: `translate(${tip.flipX ? "calc(-100% + 24px)" : "-24px"}, ${tip.below ? "10px" : "calc(-100% - 10px)"})` }}
              >
                <div className={cn(blockReset, "text-[11px] font-semibold text-pui-muted-foreground")}>
                  {activeCell.y} &middot; {activeCell.x}
                </div>
                <div className={cn(blockReset, "mt-0.5 flex items-center gap-2")}>
                  <span aria-hidden="true" className={cn(blockReset, "size-3 rounded-[3px] border border-pui-border")} style={{ background: colorOf(activeCell.value) }} />
                  <span className={cn(blockReset, "text-sm font-semibold tabular-nums")}>{fmt(activeCell.value)}</span>
                </div>
                <div className={cn(blockReset, "mt-1.5 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[11px] tabular-nums")}>
                  {[
                    ["Row avg", model.rowAvg[activeCell.yIndex]],
                    ["Column avg", model.colAvg[activeCell.xIndex]],
                  ].map(([name, avg]) => {
                    const a = avg as number | null | undefined;
                    const r = rel(activeCell.value, a);
                    return (
                      <React.Fragment key={name as string}>
                        <span className={cn(blockReset, "text-pui-muted-foreground")}>{name as string}</span>
                        <span className={cn(blockReset, "text-right")}>
                          {a === null || a === undefined ? "n/a" : fmt(a)}
                          {r ? <span className={cn(blockReset, "ms-1.5 font-semibold", r.startsWith("-") || r.startsWith("\u2212") ? "text-pui-danger-text" : "text-pui-success-text")}>{r}</span> : null}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {legend ? (
        <div className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pui-muted-foreground")} style={{ paddingInlineStart: m.left }}>
          {legendLabel ? <span className={cn(blockReset, "font-medium")}>{legendLabel}</span> : null}
          <span className={cn(blockReset, "tabular-nums")}>{fmt(d0)}</span>
          <div
            aria-hidden="true"
            className={cn(blockReset, "relative h-2.5 min-w-32 flex-1 cursor-crosshair rounded-pui-full")}
            style={{ maxWidth: 260, background: `linear-gradient(to right, ${legendStops.join(", ")})` }}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width) setBand(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
            }}
            onPointerLeave={() => setBand(null)}
          >
            <AnimatePresence>
              {markerT !== null ? (
                <motion.span
                  key="marker"
                  className={cn(blockReset, "absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pui-full border-2 border-pui-background bg-pui-foreground shadow-pui-sm")}
                  initial={anim.reducedMotion ? false : { opacity: 0, left: `${markerT * 100}%` }}
                  animate={{ opacity: 1, left: `${markerT * 100}%` }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={anim.reducedMotion ? instant : glide}
                />
              ) : null}
            </AnimatePresence>
          </div>
          <span className={cn(blockReset, "tabular-nums")}>{fmt(d1)}</span>
          {band !== null ? (
            <span className={cn(blockReset, "tabular-nums text-pui-foreground")}>
              showing ~{fmt(d0 + (d1 - d0) * band)}
            </span>
          ) : null}
        </div>
      ) : null}
      <span id={`${uid}-help`} className={srOnly}>
        Arrow keys move between cells, Page Up and Page Down jump to the first and last row, Home and End to the row ends, Enter activates, Escape clears, T shows the data table.
      </span>
      <p id={descId} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
      <div className={tableVisible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : srOnly}>
        <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
          <caption className={cn(blockReset, tableVisible ? "px-3 py-2 text-left font-medium" : "")}>{nameText}</caption>
          <thead>
            <tr>
              <td />
              {cols.map((c) => (
                <th key={c} scope="col" className={cn(blockReset, "px-2 py-1.5 font-medium")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r} className={cn(blockReset, "border-t border-pui-border")}>
                <th scope="row" className={cn(blockReset, "px-2 py-1 font-normal")}>
                  {r}
                </th>
                {cols.map((c, ci) => {
                  const v = grid[ri]?.[ci];
                  return (
                    <td key={c} className={cn(blockReset, "px-2 py-1")}>
                      {v === null || v === undefined ? "" : fmt(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Heatmap and cohort-retention matrix with a row and column crosshair, a gradient legend that
 * filters by value band, readable auto labels and 2D keyboard exploration.
 */
export const HeatmapChart = React.forwardRef(HeatmapChartInner) as (<T>(props: HeatmapChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
HeatmapChart.displayName = "HeatmapChart";
