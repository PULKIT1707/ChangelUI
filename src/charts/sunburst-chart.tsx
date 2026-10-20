"use client";

// Sunburst: a radial partition. The current view sits in a center disc (click it to go up) and
// rings show the levels below it. Drilling rescales every arc's angles and radii at once, so the
// clicked arc opens into the full circle; hovering lights the path from the center to the arc
// and dims everything else. One Float64Array tween drives all arcs: React renders once per change.
import { AnimatePresence, motion, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import type { Accessor } from "./core/cartesian-model";
import { categoricalColor, mix } from "./core/color";
import { ChartBreadcrumb, useDrillPath } from "./core/drill";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { ancestors, descendants, partition, type HierarchyNode } from "./core/hierarchy";
import { arcPath, polar } from "./core/path";
import { buildTree, pathOf, resolvePath, type TreeItem } from "./core/tree-input";
import { useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const TAU = Math.PI * 2;
const drillTween: Transition = { duration: 0.75, ease: [0.22, 1, 0.36, 1] };

export interface SunburstNodeInfo<T> {
  id: string;
  label: string;
  value: number;
  datum: T | null;
  depth: number;
  shareOfParent: number;
  /** Share of the current view (the center). */
  shareOfView: number;
  trail: string[];
  path: string[];
  childCount: number;
}

export interface SunburstChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  /** A nested root (children in `d.children`), an array of roots, or flat rows with `parentId`. */
  data: T | readonly T[];
  value: Accessor<T, number | null | undefined>;
  label: Accessor<T, string>;
  getChildren?: (d: T) => readonly T[] | null | undefined;
  /** Stable ids (required for flat rows). Default: the label path. */
  getId?: (d: T) => string;
  parentId?: (d: T) => string | null | undefined;
  rootLabel?: string;
  /** Color per node; default: each top-level branch gets a palette color, deeper rings lighten. */
  color?: (node: SunburstNodeInfo<T>) => string;
  /** Rings drawn around the center. Default 3. */
  maxDepth?: number;
  /** Center disc radius as a fraction of the outer radius. Default 0.28. */
  centerRadius?: number;
  /** Rounded arc corners in px. Default 3. */
  cornerRadius?: number;
  /** Gap between arcs in px. Default 1.5. */
  padding?: number;
  /** Labels along arcs that are big enough. Default true. */
  labels?: boolean;
  /** Chart size in px (the chart is square). Default 360. */
  size?: number;
  format?: NumberFormat;
  locale?: string;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  breadcrumb?: boolean;
  tableToggle?: boolean;
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: string[]) => void;
  onNodeClick?: (node: SunburstNodeInfo<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveNodeChange?: (node: SunburstNodeInfo<T> | null) => void;
  summary?: string;
  chartLabel?: string;
}

type Node<T> = HierarchyNode<TreeItem<T>>;

/** [a0, a1, d0, d1] per node: angles 0..TAU and depth in rings relative to the view (0 = center disc). */
function frame<T>(nodes: readonly Node<T>[], focus: Node<T>, maxDepth: number, collapsed: boolean): Float64Array {
  const out = new Float64Array(nodes.length * 4);
  const span = focus.x1 - focus.x0 || 1;
  nodes.forEach((n, i) => {
    let a0 = Math.max(0, Math.min(1, (n.x0 - focus.x0) / span)) * TAU;
    let a1 = Math.max(0, Math.min(1, (n.x1 - focus.x0) / span)) * TAU;
    // Rings beyond the last one fold onto the outer edge; ancestors fold into the center.
    const rel = n.depth - focus.depth;
    let d0 = Math.max(0, Math.min(maxDepth + 1, rel));
    let d1 = Math.max(0, Math.min(maxDepth + 1, rel + 1));
    if (rel < 0) d0 = d1 = 0;
    if (collapsed) {
      a1 = a0 = 0;
      d0 = d1 = Math.min(d0, 1);
    }
    out[i * 4] = a0;
    out[i * 4 + 1] = a1;
    out[i * 4 + 2] = d0;
    out[i * 4 + 3] = d1;
  });
  return out;
}

function SunburstChartInner<T>(props: SunburstChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    value,
    label,
    getChildren,
    getId,
    parentId,
    rootLabel = "All",
    color,
    maxDepth = 3,
    centerRadius = 0.28,
    cornerRadius = 3,
    padding = 1.5,
    labels = true,
    size = 360,
    format,
    locale = "en-US",
    animation = "auto",
    title,
    description,
    titleAs,
    breadcrumb = true,
    tableToggle = false,
    path: pathProp,
    defaultPath,
    onPathChange,
    onNodeClick,
    onActiveNodeChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width, measured } = useChartSize(boxRef, { initialWidth: size, height: size });
  const S = Math.max(160, Math.min(size, width));
  const R = S / 2 - 4;
  const rc = R * Math.max(0.12, Math.min(0.5, centerRadius));
  const ringW = (R - rc) / Math.max(1, maxDepth);
  const drill = useDrillPath({ path: pathProp, defaultPath, onPathChange });
  const [hover, setHover] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);

  const root = React.useMemo(() => {
    const tree = buildTree<T>({ data, value, label, getChildren, id: getId, parentId, rootLabel });
    partition(tree, { width: 1, height: tree.height + 1 });
    return tree;
  }, [data, value, label, getChildren, getId, parentId, rootLabel]);
  const nodes = React.useMemo(() => descendants(root), [root]);
  const indexOf = React.useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const focus = React.useMemo(() => resolvePath(root, drill.path), [root, drill.path]);

  const info = React.useCallback(
    (n: Node<T>): SunburstNodeInfo<T> => ({
      id: n.id,
      label: n.data.label,
      value: n.value,
      datum: n.data.datum,
      depth: n.depth,
      shareOfParent: n.parent && n.parent.value ? n.value / n.parent.value : 1,
      shareOfView: focus.value ? n.value / focus.value : 0,
      trail: ancestors(n)
        .reverse()
        .slice(1)
        .map((a) => a.data.label),
      path: pathOf(n),
      childCount: n.children?.length ?? 0,
    }),
    [focus],
  );

  // Colors: a palette hue per top-level branch (stable while drilling), lighter with depth.
  const fills = React.useMemo(() => {
    const top = root.children ?? [];
    const branch = new Map<Node<T>, number>();
    top.forEach((c, i) => branch.set(c, i));
    return nodes.map((n) => {
      if (!n.parent) return "var(--pui-muted)";
      if (color) return color(info(n));
      let b: Node<T> = n;
      while (b.parent && b.parent.parent) b = b.parent;
      const base = categoricalColor(branch.get(b) ?? 0);
      const siblings = n.parent.children ?? [];
      const rank = siblings.indexOf(n) / Math.max(1, siblings.length);
      return mix(base, "var(--pui-background)", Math.max(0.3, 0.92 - (n.depth - 1) * 0.16 - rank * 0.12));
    });
  }, [nodes, root, color, info]);

  // Entrance: rings sweep out from 12 o'clock (client-only mounts, in view).
  const [entered, setEntered] = React.useState(!anim.entrance);
  React.useEffect(() => {
    if (entered) return;
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setEntered(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [entered]);

  const target = React.useMemo(() => frame(nodes, focus, maxDepth, !entered), [nodes, focus, maxDepth, entered]);
  const tween = useDataTween(target, {
    enabled: anim.updates,
    transition: drillTween,
    // Angles and depths are size-free, so a resize needs no reset; only the node set does.
    resetKey: nodes.length,
  });

  const radius = React.useCallback((d: number) => (d <= 0 ? 0 : d <= 1 ? d * rc : Math.min(R, rc + (d - 1) * ringW)), [rc, ringW, R]);
  const visible = React.useMemo(
    () =>
      nodes.filter((n) => {
        const rel = n.depth - focus.depth;
        if (rel < 1 || rel > maxDepth || !(n.value > 0)) return false;
        for (let a: Node<T> | null = n; a; a = a.parent) if (a === focus) return true;
        return false;
      }),
    [nodes, focus, maxDepth],
  );

  const activeId = focusId ?? hover;
  const active = activeId ? (nodes[indexOf.get(activeId) ?? -1] ?? null) : null;
  const trail = React.useMemo(() => new Set(active ? ancestors(active).map((n) => n.id) : []), [active]);

  const lastActive = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastActive.current === activeId) return;
    lastActive.current = activeId;
    onActiveNodeChange?.(active ? info(active) : null);
  });

  const describe = (n: Node<T>) => {
    const i = info(n);
    return `${i.trail.join(" \u203a ")}: ${fmt(n.value)}, ${pct.format(i.shareOfView)} of ${focus.data.label}${n.children?.length ? `, ${n.children.length} children` : ""}.`;
  };
  const goTo = (n: Node<T>) => {
    drill.setPath(pathOf(n));
    setHover(null);
    setAnnouncement(`${n.data.label}: ${fmt(n.value)}. ${n.children?.length ?? 0} children. Escape goes up.`);
  };
  const goUp = () => {
    if (!focus.parent) return false;
    const parent = focus.parent;
    drill.setPath(pathOf(parent));
    setHover(null);
    setFocusId(focus.id);
    setAnnouncement(`Up to ${parent.data.label}: ${fmt(parent.value)}.`);
    return true;
  };
  const activate = (n: Node<T>, event: React.PointerEvent | React.KeyboardEvent) => {
    onNodeClick?.(info(n), event);
    if (n.children?.length) {
      goTo(n);
      if (event.type === "keydown") setFocusId(n.children[0]?.id ?? null);
    }
  };

  // Hit-test in polar coordinates against the settled layout.
  const hitTest = (event: React.PointerEvent<HTMLDivElement>): Node<T> | "center" | null => {
    const r = event.currentTarget.getBoundingClientRect();
    if (!r.width) return null;
    const k = S / r.width;
    const x = (event.clientX - r.left) * k - S / 2;
    const y = (event.clientY - r.top) * k - S / 2;
    const dist = Math.hypot(x, y);
    if (dist <= rc) return "center";
    if (dist > R) return null;
    const ring = Math.floor((dist - rc) / ringW) + 1;
    let a = Math.atan2(x, -y);
    if (a < 0) a += TAU;
    for (const n of visible) {
      if (n.depth - focus.depth !== ring) continue;
      const i = indexOf.get(n.id) as number;
      if (a >= (target[i * 4] as number) && a <= (target[i * 4 + 1] as number)) return n;
    }
    return null;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const k = event.key;
    const cur = focusId ? (nodes[indexOf.get(focusId) ?? -1] ?? null) : null;
    let next: Node<T> | null = null;
    const first = focus.children?.find((c) => c.value > 0) ?? null;
    if (!cur && (k.startsWith("Arrow") || k === "Home" || k === "End")) next = k === "End" ? (focus.children?.[focus.children.length - 1] ?? null) : first;
    else if (cur && (k === "ArrowRight" || k === "ArrowLeft")) {
      const sib = (cur.parent?.children ?? []).filter((c) => c.value > 0);
      const at = sib.indexOf(cur);
      next = sib[(at + (k === "ArrowRight" ? 1 : sib.length - 1)) % sib.length] ?? cur;
    } else if (cur && k === "ArrowUp") next = cur.parent && cur.parent !== focus ? cur.parent : cur;
    else if (cur && k === "ArrowDown") next = cur.depth - focus.depth < maxDepth ? (cur.children?.find((c) => c.value > 0) ?? cur) : cur;
    else if (cur && k === "Home") next = cur.parent?.children?.[0] ?? cur;
    else if (cur && k === "End") next = cur.parent?.children?.[(cur.parent.children.length ?? 1) - 1] ?? cur;
    else if ((k === "Enter" || k === " ") && cur) {
      event.preventDefault();
      activate(cur, event);
      return;
    } else if (k === "Escape" || k === "Backspace") {
      if (goUp()) event.preventDefault();
      else if (focusId && k === "Escape") {
        event.preventDefault();
        setFocusId(null);
      }
      return;
    } else if (k === "t" || k === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocusId(next.id);
    setAnnouncement(describe(next));
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : "Sunburst");
  const summaryText = (() => {
    if (summary) return summary;
    const kids = (focus.children ?? []).filter((c) => c.value > 0);
    if (!kids.length) return `${focus.data.label}: no data.`;
    return `Sunburst of ${focus.data.label}, total ${fmt(focus.value)}, ${focus.height} levels deep. Largest: ${kids
      .slice(0, 3)
      .map((c) => `${c.data.label} ${pct.format(focus.value ? c.value / focus.value : 0)}`)
      .join(", ")}.`;
  })();

  // Tooltip anchor at the arc's outer middle.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active && active !== focus) {
    const i = indexOf.get(active.id) as number;
    const a = ((target[i * 4] as number) + (target[i * 4 + 1] as number)) / 2;
    const [px, py] = polar(a, radius(target[i * 4 + 3] as number), S / 2, S / 2);
    tip = { left: px / S, top: py / S, flipX: px > S * 0.55, below: py < S * 0.3 };
  }
  const activeInfo = active ? info(active) : null;
  const center = active && active !== focus ? active : focus;
  const centerShare = active && active !== focus ? info(active).shareOfView : null;

  const fade = anim.reducedMotion ? instant : { duration: 0.15 };
  const r2 = (v: number) => Math.round(v * 100) / 100;

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {breadcrumb ? (
        <ChartBreadcrumb
          items={ancestors(focus)
            .reverse()
            .map((n) => ({ key: n.id || "__root", label: n.data.label, detail: n === focus ? fmt(n.value) : undefined }))}
          reducedMotion={anim.reducedMotion}
          onNavigate={(i) => {
            const t = ancestors(focus).reverse()[i];
            if (t && t !== focus) {
              drill.setPath(pathOf(t));
              setHover(null);
              setFocusId(null);
            }
          }}
        />
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative mx-auto w-full select-none")} style={{ maxWidth: size, aspectRatio: "1 / 1" }}>
        <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <g transform={`translate(${S / 2},${S / 2})`}>
            {nodes.map((n, i) =>
              n.parent && n.value > 0 ? (
                <Arc
                  key={n.id}
                  tween={tween}
                  index={i}
                  radius={radius}
                  padding={padding}
                  cornerRadius={cornerRadius}
                  fill={fills[i] as string}
                  opacity={!active || active === focus ? 1 : trail.has(n.id) ? 1 : 0.32}
                  ring={active?.id === n.id}
                  fade={fade}
                />
              ) : null,
            )}
            {/* Center disc: the current view; click to go up. */}
            <motion.circle
              r={Math.max(0, rc - padding)}
              fill={focus.parent ? mix("var(--pui-muted)", "var(--pui-background)", 0.7) : "var(--pui-background)"}
              stroke="var(--pui-border)"
              initial={false}
              animate={{ scale: hover === "__center" && focus.parent ? 1.04 : 1 }}
              transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 26 }}
            />
            {labels
              ? visible.map((n) => {
                  const i = indexOf.get(n.id) as number;
                  const a0 = target[i * 4] as number;
                  const a1 = target[i * 4 + 1] as number;
                  const d0 = target[i * 4 + 2] as number;
                  const rr = (radius(d0) + radius(d0 + 1)) / 2;
                  const arcLen = (a1 - a0) * rr;
                  const text = n.data.label;
                  if (arcLen < 26 || ringW < 18) return null;
                  const maxChars = Math.floor(Math.min(ringW - 6, 140) / 6);
                  if (maxChars < 3) return null;
                  const shown = text.length > maxChars ? `${text.slice(0, maxChars - 1)}\u2026` : text;
                  // Radial labels, flipped on the left half so they read left to right.
                  const mid = (a0 + a1) / 2;
                  const deg = (mid * 180) / Math.PI;
                  const flip = mid > Math.PI;
                  const [x, y] = polar(mid, rr);
                  const rot = flip ? deg + 90 : deg - 90;
                  const tangential = arcLen > shown.length * 6.4 + 8 && arcLen < 260 && d0 >= 1;
                  return (
                    <g key={`${focus.id}|${n.id}`} transform={`translate(${r2(x)},${r2(y)}) rotate(${r2(tangential ? (mid > Math.PI / 2 && mid < (3 * Math.PI) / 2 ? deg + 180 : deg) : rot)})`}>
                      <motion.g initial={false} animate={{ opacity: !active || active === focus || trail.has(n.id) ? 1 : 0.35 }} transition={fade}>
                      <motion.text
                        initial={anim.reducedMotion || !measured ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={anim.reducedMotion ? instant : { duration: 0.25, delay: 0.45 }}
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize={10.5}
                        fontWeight={600}
                        fill="var(--pui-foreground)"
                        pointerEvents="none"
                      >
                        {shown}
                      </motion.text>
                      </motion.g>
                    </g>
                  );
                })
              : null}
          </g>
        </svg>
        {/* Center readout (HTML for crisp, wrapping text). */}
        <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 flex items-center justify-center")}>
          <div className={cn(blockReset, "flex flex-col items-center text-center")} style={{ maxWidth: `${((rc * 1.6) / S) * 100}%` }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={center.id || "__root"}
                initial={anim.reducedMotion ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.12 } }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 32 }}
                className={cn(blockReset, "flex flex-col items-center")}
              >
                <span className={cn(blockReset, "max-w-full truncate text-[11px] font-medium text-pui-muted-foreground")}>{center.data.label}</span>
                <span className={cn(blockReset, "font-semibold tabular-nums tracking-tight")} style={{ fontSize: Math.max(13, Math.min(26, rc * 0.32)) }}>
                  {fmt(center.value)}
                </span>
                {centerShare !== null ? (
                  <span className={cn(blockReset, "text-[11px] font-semibold tabular-nums")}>{pct.format(centerShare)}</span>
                ) : focus.parent ? (
                  <span className={cn(blockReset, "text-[10.5px] text-pui-muted-foreground")}>{"\u2191"} click to go up</span>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive sunburst"
          aria-label={`${nameText}, showing ${focus.data.label}. Use arrow keys to explore, Enter to drill in, Escape to go up.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => {
            const h = hitTest(event);
            setHover(h === "center" ? "__center" : (h?.id ?? null));
          }}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            if (event.button !== 0) return;
            const h = hitTest(event);
            if (h === "center") goUp();
            else if (h) activate(h, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocusId(null)}
          className={cn(
            blockReset,
            focusRing,
            "absolute inset-0 rounded-pui-full",
            (hover === "__center" && focus.parent) || (active && active.children?.length) ? "cursor-pointer" : "cursor-default",
          )}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip && !!activeInfo} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeInfo && active ? (
            <>
              <div className={cn(blockReset, "mb-1 flex max-w-60 flex-wrap items-center gap-1 text-[10.5px] text-pui-muted-foreground")}>
                {activeInfo.trail.map((t, k) => (
                  <React.Fragment key={k}>
                    {k ? <span aria-hidden="true">{"\u203a"}</span> : null}
                    <span className={k === activeInfo.trail.length - 1 ? "font-semibold text-pui-foreground" : ""}>{t}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className={cn(blockReset, "mb-1 text-sm font-semibold tabular-nums")}>{fmt(activeInfo.value)}</div>
              <TipRow swatch={fills[indexOf.get(active.id) ?? 0]} label={`Of ${focus.data.label}`} value={pct.format(activeInfo.shareOfView)} />
              {active.parent && active.parent !== focus ? <TipRow label={`Of ${active.parent.data.label}`} value={pct.format(activeInfo.shareOfParent)} /> : null}
              {activeInfo.childCount ? <TipRow label="Children" value={activeInfo.childCount} tone="muted" /> : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Left and right arrows move between siblings, up goes to the parent ring, down to the first child, Enter drills in, Escape or Backspace goes up, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={`${nameText}: ${focus.data.label}`}
        visible={tableVisible}
        columns={["Item", "Value", `Of ${focus.data.label}`, "Of parent"]}
        rows={visible.map((n) => {
          const i = info(n);
          return [i.trail.slice(focus.depth).join(" \u203a "), fmt(n.value), pct.format(i.shareOfView), pct.format(i.shareOfParent)];
        })}
      />
    </ChartFigure>
  );
}

function Arc({
  tween,
  index,
  radius,
  padding,
  cornerRadius,
  fill,
  opacity,
  ring,
  fade,
}: {
  tween: MotionValue<Float64Array>;
  index: number;
  radius: (d: number) => number;
  padding: number;
  cornerRadius: number;
  fill: string;
  opacity: number;
  ring: boolean;
  fade: Transition;
}) {
  const d = useTransform(tween, (g) => {
    const a0 = g[index * 4] as number;
    const a1 = g[index * 4 + 1] as number;
    const r0 = radius(g[index * 4 + 2] as number);
    const r1 = radius(g[index * 4 + 3] as number);
    if (a1 - a0 < 1e-4 || r1 - r0 < 0.5) return "";
    const mid = (r0 + r1) / 2 || 1;
    return arcPath({ innerRadius: r0 + padding / 2, outerRadius: r1 - padding / 2, startAngle: a0, endAngle: a1, padAngle: Math.min((a1 - a0) / 3, padding / mid), cornerRadius, digits: 2 });
  });
  return (
    <motion.path
      d={d}
      fill={fill}
      stroke={ring ? "var(--pui-foreground)" : "none"}
      strokeWidth={ring ? 1.5 : 0}
      initial={false}
      animate={{ opacity }}
      transition={fade}
      style={{ transition: "fill 0.3s ease" }}
    />
  );
}

/**
 * Sunburst: a radial partition with drill zoom (arcs rescale their angles and radii together), a
 * center disc that shows the view and goes up, hover ancestry highlight, radial labels and a
 * breadcrumb. APG-tree style keys: left/right siblings, up parent, down first child.
 */
export const SunburstChart = React.forwardRef(SunburstChartInner) as (<T>(props: SunburstChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
SunburstChart.displayName = "SunburstChart";
