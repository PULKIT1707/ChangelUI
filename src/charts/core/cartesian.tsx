"use client";
// The cartesian chart runtime: <Chart> reads its series and axes from its children (statically,
// so the server renders the final chart), builds the layout model, and renders the children once
// per layer (back, marks, front, html, legends). Pointer and keyboard input go through one
// focusable overlay that updates the chart store; only subscribed parts re-render.
import { motion, useMotionValue, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../../lib/cn";
import { blockReset, focusRing } from "../../lib/styles";
import { useIsomorphicLayoutEffect } from "../../lib/use-latest-ref";
import {
  buildCartesianModel,
  readAccessor,
  seriesValuePx,
  type Accessor,
  type CartesianModel,
  type CategorySort,
  type ChartLayout,
  type Margin,
  type ResolvedSeries,
  type SeriesSpec,
  type XAxisSpec,
  type XScaleKind,
  type XValue,
  type YAxisSpec,
} from "./cartesian-model";
import { chartKeyAction, keyboardHelp } from "./keyboard";
import type { StackOffset } from "./stack";
import { createChartStore, useChartSelector, type ChartItem, type ChartState, type ChartStore, type SelectionMode } from "./store";
import { summarizeChart } from "./summary";
import { useChartSyncGroup, useSyncedDomain, useSyncedHoverX } from "./sync";
import { nearestIndex } from "./spatial";
import { clampDomain, isZoomed, keyboardPan, keyboardZoom } from "./zoom";
import { useChartAnimation, type ChartAnimation, type ChartAnimationState } from "./use-chart-motion";
import { useChartSize } from "./use-chart-size";
import { ChartPatterns } from "./patterns";

export type { Accessor, XValue } from "./cartesian-model";
export type ChartLayerName = "back" | "marks" | "front" | "html" | "legend-top" | "legend-bottom";
export type TooltipMode = "axis" | "item" | "none";

export interface ChartContextValue {
  model: CartesianModel;
  store: ChartStore;
  animation: ChartAnimationState;
  /** Prefix for SVG ids (gradients, clip paths). */
  uid: string;
  tooltip: TooltipMode;
  locale: string;
  data: readonly unknown[];
  /**
   * The live (tweened) geometry of each mounted series, by id, so overlays such as the active
   * dot read the exact values the drawn path uses, mid-animation included.
   */
  tweens: Map<string, MotionValue<Float64Array>>;
  /** The focusable plot overlay (pointer and key input for add-ons such as ChartZoom). */
  overlayRef: React.RefObject<HTMLDivElement | null>;
  /** Full x extent of the data (continuous x only), or null for band axes. */
  extent: readonly [number, number] | null;
  /** Current zoom window, or null for the full extent. */
  xDomain: readonly [number, number] | null;
  setXDomain: (domain: readonly [number, number] | null) => void;
  /** Zoom add-on registration (enables + / - / 0 and Shift+arrows, and touch-action: none). */
  zoom: ChartZoomConfig | null;
  registerZoom: (config: ChartZoomConfig | null) => void;
  /** While true (dragging a pan or a navigator), data updates apply without tweening. */
  setInteracting: (interacting: boolean) => void;
  /** Visual-only x offset of the marks (rubber-band overscroll while panning past an edge). */
  panOffset: MotionValue<number>;
  /** Visible data table (ChartDataTable toggle, or T on the plot). */
  tableVisible: boolean;
  setTableVisible: (visible: boolean | ((v: boolean) => boolean)) => void;
  tableId: string;
}

export interface ChartZoomConfig {
  /** Smallest window in x units. */
  minSpan: number;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);
const LayerContext = React.createContext<ChartLayerName | null>(null);

/** The enclosing chart (throws outside one). */
export function useChart(): ChartContextValue {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("[changelui] chart parts must be rendered inside a Chart");
  return ctx;
}

/** The enclosing chart, or null outside one (for parts that also work standalone). */
export function useOptionalChart(): ChartContextValue | null {
  return React.useContext(ChartContext);
}

/** Which layer this render pass draws (each child renders once per layer). */
export function useChartLayer(): ChartLayerName | null {
  return React.useContext(LayerContext);
}

/** Subscribes to a slice of the enclosing chart's store. */
export function useChartState<T>(selector: (state: ChartState) => T, isEqual?: (a: T, b: T) => boolean): T {
  const { store } = useChart();
  return useChartSelector(store, selector, isEqual);
}

/** The resolved series by id (null when the id is unknown). */
export function useChartSeries(id: string): ResolvedSeries | null {
  const { model } = useChart();
  return model.series.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Static child reading

type Role = { kind: "series"; series: SeriesSpec["kind"] } | { kind: "y-axis" } | { kind: "x-axis" };
const ROLE = "__puiChartRole";

/** Marks a component so <Chart> can read its props before rendering (series and axes). */
export function withChartRole<C extends object>(component: C, role: Role): C {
  return Object.assign(component, { [ROLE]: role });
}

interface ChildSpecs {
  series: SeriesSpec[];
  yAxes: YAxisSpec[];
  xAxis: XAxisSpec | null;
}

function readChildren(children: React.ReactNode, out: ChildSpecs = { series: [], yAxes: [], xAxis: null }): ChildSpecs {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    if (child.type === React.Fragment) {
      readChildren(props.children as React.ReactNode, out);
      return;
    }
    const role = (child.type as { [ROLE]?: Role })[ROLE];
    if (!role) return;
    if (role.kind === "series") {
      out.series.push({ ...(props as unknown as SeriesSpec), kind: role.series });
    } else if (role.kind === "y-axis") {
      out.yAxes.push({
        id: (props.id as string | undefined) ?? "y",
        side: (props.side as "left" | "right" | undefined) ?? "left",
        min: props.min as number | undefined,
        max: props.max as number | undefined,
        includeZero: props.includeZero as boolean | undefined,
        format: props.format as YAxisSpec["format"],
        tickCount: props.tickCount as number | undefined,
        width: props.width as number | undefined,
        visible: props.hide !== true,
      });
    } else {
      out.xAxis = {
        format: props.format as XAxisSpec["format"],
        tickCount: props.tickCount as number | undefined,
        visible: props.hide !== true,
      };
    }
  });
  return out;
}

const sameStrings = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// ---------------------------------------------------------------------------------------------
// <Chart>

export interface ChartAnnouncementContext {
  index: number;
  count: number;
  xLabel: string;
  items: Array<{ id: string; label: string; value: string }>;
}

export interface ChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "onSelect"> {
  data: readonly T[];
  /** x value per row: a column name or a function. Dates give a time axis, strings a band axis. */
  x: Accessor<T, XValue>;
  /** Force the x scale. Default "auto" (band when there are bars or string x values). */
  xScale?: "auto" | XScaleKind;
  /** "horizontal" puts the categories on the left (horizontal bars). Default "vertical". */
  layout?: ChartLayout;
  /** Height in px. Default 300. */
  height?: number;
  /** width / height; overrides height. */
  aspectRatio?: number;
  /** Width used on the server and before the first measure. Default 640. */
  initialWidth?: number;
  margin?: Partial<Margin>;
  /** Intl locale for numbers and dates. Default "en-US". */
  locale?: string;
  /** IANA zone for date labels. Default "UTC" (SSR-safe). */
  timeZone?: string;
  /** Entrance and update animation policy. Default "auto". */
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Hover model: all series at an x ("axis"), one mark ("item"), or no tooltip. Default "axis". */
  tooltip?: TooltipMode;
  /** false renders a static image (role="img"), with no overlay or keyboard stop. Default true. */
  interactive?: boolean;
  /** Offset for series that share a `stack`. Default "none". */
  stackOffset?: Extract<StackOffset, "none" | "expand" | "diverging">;
  /** Gap between bar categories as a fraction of the band, 0..1. Default 0.28. */
  barGap?: number;
  /** Band axes: order categories by their visible total; changes animate as a re-rank. Default "none". */
  sort?: CategorySort;
  /** Redundant pattern fills for bars and areas (and dash rhythms for lines), cycled by series. Default false. */
  patterns?: boolean;
  /** Zoomed x window (continuous x only), or null for the full extent. Controlled with onXDomainChange. */
  xDomain?: readonly [number, number] | null;
  defaultXDomain?: readonly [number, number] | null;
  onXDomainChange?: (domain: readonly [number, number] | null) => void;
  /** When zoomed, fit the value axes to the visible points. Default true. */
  fitYToZoom?: boolean;
  highlight?: ChartItem | null;
  defaultHighlight?: ChartItem | null;
  onHighlightChange?: (item: ChartItem | null) => void;
  selection?: ChartItem[];
  defaultSelection?: ChartItem[];
  onSelectionChange?: (items: ChartItem[]) => void;
  /** Click / Enter selection. Default "none". */
  selectionMode?: SelectionMode;
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (ids: string[]) => void;
  /** Click on a mark (bars, area layers, the nearest line point). */
  onItemClick?: (item: ChartItem, datum: T, event: React.PointerEvent | React.KeyboardEvent) => void;
  /** Click anywhere in the plot: the nearest x. */
  onAxisClick?: (axis: { index: number; x: XValue }, event: React.PointerEvent) => void;
  /** Tooltip / announcement heading for an x value. */
  formatX?: (x: XValue) => string;
  /** Live-region text for the focused point. */
  formatAnnouncement?: (ctx: ChartAnnouncementContext) => string;
  /** Replaces the generated screen-reader summary. */
  summary?: string;
  /** Render the screen-reader data table. Default true. */
  dataTable?: boolean;
  /** Accessible name of the plot overlay. Default: the title, else "Chart". */
  chartLabel?: string;
  children?: React.ReactNode;
}

const sr = "absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]";

function ChartInner<T>(props: ChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    xScale = "auto",
    layout = "vertical",
    height = 300,
    aspectRatio,
    initialWidth = 640,
    margin,
    locale = "en-US",
    timeZone = "UTC",
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    tooltip = "axis",
    interactive = true,
    stackOffset = "none",
    barGap = 0.28,
    sort = "none",
    patterns = false,
    xDomain,
    defaultXDomain = null,
    onXDomainChange,
    fitYToZoom = true,
    highlight,
    defaultHighlight = null,
    onHighlightChange,
    selection,
    defaultSelection,
    onSelectionChange,
    selectionMode = "none",
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
    onItemClick,
    onAxisClick,
    formatX,
    formatAnnouncement,
    summary,
    dataTable = true,
    chartLabel,
    children,
    className,
    ...rest
  } = props;

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const specs = React.useMemo(() => readChildren(children), [children]);
  const [store] = React.useState(() =>
    createChartStore({
      highlight: highlight ?? defaultHighlight,
      selection: selection ?? defaultSelection ?? [],
      hidden: hiddenSeries ?? defaultHiddenSeries ?? specs.series.filter((s) => s.hidden).map((s) => s.id),
      xDomain: xDomain ?? defaultXDomain,
    }),
  );
  // Controlled keys: report changes, and mirror the props back into the store.
  useIsomorphicLayoutEffect(() => {
    store.configure(
      { highlight: highlight !== undefined, selection: selection !== undefined, hidden: hiddenSeries !== undefined, xDomain: xDomain !== undefined },
      { onHighlightChange, onSelectionChange, onHiddenSeriesChange, onXDomainChange },
    );
    const patch: Partial<ChartState> = {};
    if (highlight !== undefined) patch.highlight = highlight;
    if (selection !== undefined) patch.selection = selection;
    if (hiddenSeries !== undefined) patch.hidden = hiddenSeries;
    // null is a real value here (the full extent), so it is written explicitly.
    if (xDomain !== undefined) store.set({ xDomain: xDomain ?? null });
    store.set(patch);
  });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const size = useChartSize(containerRef, { initialWidth, height, aspectRatio });
  const anim = useChartAnimation(animation);
  const hidden = useChartSelector(store, (s) => s.hidden, sameStrings);
  const activeDomain = useChartSelector(store, (s) => s.xDomain, (a, b) => a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1]));

  const marginTop = margin?.top;
  const marginRight = margin?.right;
  const marginBottom = margin?.bottom;
  const marginLeft = margin?.left;
  const domainStart = activeDomain?.[0];
  const domainEnd = activeDomain?.[1];
  const model = React.useMemo(
    () =>
      buildCartesianModel({
        data,
        x,
        xScale,
        layout,
        width: size.width,
        height: size.height,
        margin: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
        series: specs.series,
        yAxes: specs.yAxes,
        xAxis: specs.xAxis,
        hidden,
        stackOffset,
        barGap,
        locale,
        timeZone,
        xDomain: domainStart === undefined || domainEnd === undefined ? null : [domainStart, domainEnd],
        fitY: fitYToZoom,
        formatX,
        sort,
        patterns,
      }),
    [data, x, xScale, layout, size.width, size.height, marginTop, marginRight, marginBottom, marginLeft, specs, hidden, stackOffset, barGap, locale, timeZone, domainStart, domainEnd, fitYToZoom, formatX, sort, patterns],
  );
  useIsomorphicLayoutEffect(() => store.setSize(model.plotW, model.plotH), [store, model.plotW, model.plotH]);

  const { entrance, reducedMotion } = anim;
  const [interacting, setInteracting] = React.useState(false);
  const updates = anim.updates && !interacting;
  const [tweens] = React.useState(() => new Map<string, MotionValue<Float64Array>>());
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [zoom, registerZoom] = React.useState<ChartZoomConfig | null>(null);
  const extent = React.useMemo<readonly [number, number] | null>(() => {
    if (model.xKind === "band" || !model.n) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of model.xNum) {
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return Number.isFinite(lo) && hi > lo ? [lo, hi] : null;
  }, [model.xKind, model.n, model.xNum]);
  const setXDomain = React.useCallback((domain: readonly [number, number] | null) => store.setXDomain(domain), [store]);
  const panOffset = useMotionValue(0);
  const [tableVisible, setTableVisible] = React.useState(false);
  const tableId = `${uid}-table`;
  const ctx = React.useMemo<ChartContextValue>(
    () => ({
      model,
      store,
      animation: { entrance, updates, reducedMotion },
      uid,
      tooltip,
      locale,
      data,
      tweens,
      overlayRef,
      extent,
      xDomain: activeDomain,
      setXDomain,
      zoom,
      registerZoom,
      setInteracting,
      panOffset,
      tableVisible,
      setTableVisible,
      tableId,
    }),
    [model, store, entrance, updates, reducedMotion, uid, tooltip, locale, data, tweens, extent, activeDomain, setXDomain, zoom, panOffset, tableVisible, tableId],
  );

  // Client-only mounts play the entrance when the chart first scrolls into view (the marks layer
  // mounts then), not off-screen. Server and hydrated renders never wait: their HTML is the chart.
  const [seen, setSeen] = React.useState(!entrance);
  React.useEffect(() => {
    if (seen) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSeen(true);
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  // A pan that ended past an edge springs back.
  React.useEffect(() => () => panOffset.stop(), [panOffset]);

  // Shared zoom window (ChartSyncGroup syncZoom).
  const syncedDomain = useSyncedDomain();
  const zoomSync = useChartSyncGroup();
  React.useEffect(() => {
    if (!zoomSync?.syncZoom) return;
    return store.subscribe(() => zoomSync.store.setDomain(store.getState().xDomain));
  }, [zoomSync, store]);
  React.useEffect(() => {
    if (zoomSync?.syncZoom) store.setXDomain(syncedDomain);
  }, [zoomSync, syncedDomain, store]);

  // Sync groups: publish our hovered x, and follow the group's when we are idle.
  const sync = useChartSyncGroup();
  const syncedX = useSyncedHoverX(uid);
  React.useEffect(() => {
    if (!sync) return;
    return store.subscribe(() => {
      const s = store.getState();
      if (s.pointer || s.focus) sync.store.setHover(s.activeIndex === null ? null : (model.xNum[s.activeIndex] ?? null), uid);
    });
  }, [sync, store, model, uid]);
  React.useEffect(() => {
    if (!sync) return;
    const s = store.getState();
    if (s.pointer || s.focus) return;
    store.setActiveIndex(syncedX === null ? null : nearestIndex(model.xNum, syncedX));
  }, [sync, syncedX, store, model]);

  const visible = model.series.filter((s) => !s.hidden);
  const horizontal = layout === "horizontal";
  const itemMode = tooltip === "item";

  const announce = (index: number, seriesId: string | null) => {
    const rows = (seriesId ? visible.filter((s) => s.id === seriesId) : visible)
      .map((s) => ({ s, v: s.values[index] }))
      .filter((r): r is { s: ResolvedSeries; v: number } => typeof r.v === "number");
    const context: ChartAnnouncementContext = {
      index,
      count: model.n,
      xLabel: model.formatX(index),
      items: rows.map(({ s, v }) => ({ id: s.id, label: s.label, value: model.formatValue(s, v) })),
    };
    const text = formatAnnouncement
      ? formatAnnouncement(context)
      : `${context.xLabel}: ${context.items.map((r) => `${r.label} ${r.value}`).join(", ") || "no data"}. Point ${(model.rank?.[index] ?? index) + 1} of ${model.n}.`;
    store.announce(text);
  };

  // --- pointer ---------------------------------------------------------------------------------
  const frame = React.useRef(0);
  const latest = React.useRef<{ x: number; y: number } | null>(null);

  const toPlot = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = rect.width ? model.plotW / rect.width : 1;
    const sy = rect.height ? model.plotH / rect.height : 1;
    return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
  };

  /** The mark under a plot point: a bar, an area layer, or a line within 14 px. */
  const hitTest = (p: { x: number; y: number }): { index: number; item: ChartItem | null } => {
    const along = horizontal ? p.y : p.x;
    const across = horizontal ? p.x : p.y;
    const index = model.n ? model.indexAt(along) : -1;
    if (index < 0) return { index, item: null };
    let best: ChartItem | null = null;
    let bestDist = 14;
    for (const s of visible) {
      const g = s.geometry;
      if (s.kind === "bar") {
        const bx = g[index * 4] ?? 0;
        const by = g[index * 4 + 1] ?? 0;
        const bw = g[index * 4 + 2] ?? 0;
        const bh = g[index * 4 + 3] ?? 0;
        if (p.x >= bx - 1 && p.x <= bx + bw + 1 && p.y >= by - 2 && p.y <= by + bh + 2) return { index, item: { seriesId: s.id, index } };
      } else if (s.kind === "area" && (s.stack !== undefined || s.lows)) {
        const top = g[index * 3 + 1] ?? Number.NaN;
        const base = g[index * 3 + 2] ?? Number.NaN;
        if (across >= Math.min(top, base) && across <= Math.max(top, base)) best = { seriesId: s.id, index };
      } else {
        const d = Math.abs(seriesValuePx(model, s, index) - across);
        if (d < bestDist) {
          bestDist = d;
          best = { seriesId: s.id, index };
        }
      }
    }
    return { index, item: best };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    latest.current = toPlot(event);
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const p = latest.current;
      if (!p) return;
      const { index, item } = hitTest(p);
      store.setPointer(p);
      store.setActiveIndex(index < 0 ? null : index);
      store.setHighlight(item);
    });
  };
  const onPointerLeave = () => {
    latest.current = null;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    store.setPointer(null);
    store.setHighlight(null);
    if (!store.getState().focus) store.setActiveIndex(null);
    sync?.store.setHover(null, uid);
  };
  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onClick = (event: React.PointerEvent<HTMLDivElement>) => {
    const { index, item } = hitTest(toPlot(event));
    if (index < 0) return;
    onAxisClick?.({ index, x: model.xValues[index] as XValue }, event);
    if (!item) return;
    store.select(item, selectionMode, event.shiftKey || event.metaKey || event.ctrlKey);
    onItemClick?.(item, data[index] as T, event);
  };

  // --- keyboard --------------------------------------------------------------------------------
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const s = store.getState();
    const seriesIndex = s.focus ? Math.max(0, visible.findIndex((v) => v.id === s.focus?.seriesId)) : -1;
    // Sorted band axes walk the visual order: keys move by slot, focus stores the data index.
    const toSlot = (i: number) => (i < 0 ? i : (model.rank?.[i] ?? i));
    const toIndex = (k: number) => model.order?.[k] ?? k;
    const action = chartKeyAction(event.key, event, {
      index: toSlot(s.focus?.index ?? -1),
      count: model.n,
      seriesIndex,
      seriesCount: visible.length,
      mode: itemMode || model.hasBars ? "item" : "axis",
      hasSelection: s.selection.length > 0,
      zoomable: !!zoom && !!extent,
      zoomed: !!extent && isZoomed(s.xDomain, extent),
    });
    if (!action) return;
    event.preventDefault();
    if (action.type === "focus") {
      const series = visible[action.seriesIndex] ?? visible[0];
      const index = toIndex(action.index);
      const item = { seriesId: series?.id ?? "", index };
      store.setFocus(item);
      store.setActiveIndex(index);
      store.setHighlight(itemMode || model.hasBars ? item : null);
      announce(index, itemMode || model.hasBars ? (series?.id ?? null) : null);
    } else if (action.type === "select" && s.focus) {
      store.select(s.focus, selectionMode, action.additive);
      onItemClick?.(s.focus, data[s.focus.index] as T, event);
    } else if (action.type === "clear-selection") {
      store.clearSelection();
    } else if (action.type === "toggle-table") {
      setTableVisible((v) => !v);
    } else if (zoom && extent) {
      const current = s.xDomain ?? extent;
      const limits = { extent, minSpan: zoom.minSpan };
      if (action.type === "reset-zoom") store.setXDomain(null);
      else if (action.type === "zoom") {
        const anchor = s.focus ? model.xNum[s.focus.index] : undefined;
        const next = clampDomain(keyboardZoom(current, action.direction, anchor, limits), limits);
        store.setXDomain(isZoomed(next, extent) ? next : null);
        store.announce(isZoomed(next, extent) ? `Zoomed to ${model.formatXValue(next[0])} \u2013 ${model.formatXValue(next[1])}` : "Zoom reset");
      } else if (action.type === "pan") {
        const next = keyboardPan(current, action.direction, limits);
        store.setXDomain(next);
        store.announce(`Showing ${model.formatXValue(next[0])} \u2013 ${model.formatXValue(next[1])}`);
      }
    }
  };
  const onBlur = () => {
    store.setFocus(null);
    if (!store.getState().pointer) {
      store.setActiveIndex(null);
      store.setHighlight(null);
    }
  };

  const summaryText = summary ?? summarizeChart(visible.map((s) => ({ label: s.label, xs: model.xValues.map((_, i) => model.formatX(i)), ys: s.values, format: s.format })));
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  const helpId = `${uid}-help`;
  const label = chartLabel ?? (typeof title === "string" ? title : "Chart");
  const { margin: m, width: W, height: H } = model;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const layer = (name: ChartLayerName) => <LayerContext.Provider value={name}>{children}</LayerContext.Provider>;

  return (
    <ChartContext.Provider value={ctx}>
      <figure
        ref={ref}
        role="group"
        aria-roledescription="chart"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        aria-describedby={descId}
        data-layout={layout}
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
        {layer("legend-top")}
        <div ref={containerRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: size.height }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            aria-hidden={interactive ? true : undefined}
            role={interactive ? undefined : "img"}
            aria-label={interactive ? undefined : summaryText}
            className={cn(blockReset, "block overflow-visible")}
          >
            <defs>
              <clipPath id={`${uid}-clip`}>
                <rect x={-4} y={-6} width={model.plotW + 8} height={model.plotH + 12} />
              </clipPath>
            </defs>
            {model.series.some((s) => s.pattern) ? <ChartPatterns idPrefix={`${uid}-pat`} /> : null}
            <g transform={`translate(${m.left},${m.top})`}>
              {layer("back")}
              <g clipPath={`url(#${uid}-clip)`}>
                <motion.g style={{ x: panOffset }}>{seen ? layer("marks") : null}</motion.g>
              </g>
              {layer("front")}
            </g>
          </svg>
          {interactive ? (
            <div
              ref={overlayRef}
              tabIndex={0}
              role="application"
              aria-roledescription="interactive chart"
              aria-label={`${label}. Use arrow keys to explore.`}
              aria-describedby={helpId}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onPointerUp={onClick}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              className={cn(blockReset, focusRing, "absolute rounded-pui-sm", selectionMode !== "none" || onItemClick ? "cursor-pointer" : "cursor-crosshair")}
              style={{ left: pct(m.left, W), top: pct(m.top, H), width: pct(model.plotW, W), height: pct(model.plotH, H), touchAction: zoom ? "none" : "pan-y" }}
            />
          ) : null}
          {layer("html")}
        </div>
        {layer("legend-bottom")}
        <span id={helpId} className={sr}>
          {keyboardHelp(itemMode || model.hasBars ? "item" : "axis", !!zoom && !!extent)}
        </span>
        <p id={descId} className={sr}>
          {summaryText}
        </p>
        <LiveRegion store={store} />
        {dataTable ? <ChartTable id={tableId} model={model} visible={tableVisible} caption={typeof title === "string" ? title : label} /> : null}
      </figure>
    </ChartContext.Provider>
  );
}

/** Polite live region, debounced 150 ms so arrow-key repeat doesn't flood the screen reader. */
function LiveRegion({ store }: { store: ChartStore }) {
  const announcement = useChartSelector(store, (s) => s.announcement);
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setSpoken(announcement), 150);
    return () => clearTimeout(id);
  }, [announcement]);
  return (
    <div role="status" aria-live="polite" className={sr}>
      {spoken}
    </div>
  );
}

function ChartTable({ id, model, visible, caption }: { id: string; model: CartesianModel; visible: boolean; caption: string }) {
  const rows = Math.min(model.n, 500);
  const shown = model.series.filter((s) => !s.hidden);
  return (
    <div id={id} className={visible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : sr}>
      <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
        <caption className={cn(blockReset, visible ? "px-3 py-2 text-left font-medium" : "")}>
          {caption}
          {model.n > rows ? ` (first ${rows} of ${model.n} rows)` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
              x
            </th>
            {shown.map((s) => (
              <th key={s.id} scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className={cn(blockReset, "border-t border-pui-border")}>
              <th scope="row" className={cn(blockReset, "px-3 py-1 font-normal")}>
                {model.formatX(i)}
              </th>
              {shown.map((s) => {
                const v = s.values[i];
                const lo = s.lows?.[i];
                return (
                  <td key={s.id} className={cn(blockReset, "px-3 py-1")}>
                    {v === null || v === undefined ? "\u2013" : lo !== null && lo !== undefined ? `${model.formatValue(s, lo)} \u2013 ${model.formatValue(s, v)}` : model.formatValue(s, v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Composable chart container: declare series, axes, grid, tooltip and legend as children.
 * Generic over the row type; use `typedChart<Row>()` for typed children.
 */
export const Chart = React.forwardRef(ChartInner) as (<T>(props: ChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
Chart.displayName = "Chart";

export { readAccessor };
