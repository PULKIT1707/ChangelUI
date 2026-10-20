"use client";

import { animate, motion, motionValue, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type PanelDirection = "horizontal" | "vertical";

export interface ResizablePanelsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "horizontal" puts panels side by side. Default "horizontal". */
  direction?: PanelDirection;
  /** Sizes in percent after every committed resize (pointer up, key, collapse). */
  onLayout?: (sizes: number[]) => void;
  /** Arrow-key step in px. Default 10. */
  keyboardStep?: number;
}

export interface ResizablePanelProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Initial size in percent. Panels without one share the rest equally. */
  defaultSize?: number;
  /** Percent. Default 10. */
  minSize?: number;
  /** Percent. Default 100. */
  maxSize?: number;
  /** Dragging below half the min size (or Enter on the handle) collapses it. Default false. */
  collapsible?: boolean;
  /** Percent when collapsed (e.g. an icon rail). Default 0. */
  collapsedSize?: number;
  /** Start collapsed. Default false. */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show a grip pill in the middle of the handle. Default false. */
  withGrip?: boolean;
  disabled?: boolean;
}

interface PanelConfig {
  minSize: number;
  maxSize: number;
  collapsible: boolean;
  collapsedSize: number;
  defaultSize: number;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface GroupContextValue {
  direction: PanelDirection;
  sizes: number[];
  configs: PanelConfig[];
  mvs: MotionValue<number>[];
  panelIds: string[];
  panelRefs: { current: Array<HTMLDivElement | null> };
  draggingHandle: number | null;
  startDrag: (handle: number, event: React.PointerEvent<HTMLDivElement>) => void;
  keyResize: (handle: number, event: React.KeyboardEvent<HTMLDivElement>) => void;
  toggle: (panel: number) => void;
  setPanel: (panel: number, collapsed: boolean) => void;
}

const GroupContext = React.createContext<GroupContextValue | null>(null);
const PanelIndexContext = React.createContext(-1);
const HandleIndexContext = React.createContext(-1);

function useGroup(part: string): GroupContextValue {
  const context = React.useContext(GroupContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside ResizablePanels`);
  return context;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));
const round = (n: number) => Math.round(n * 100) / 100;

function readConfig(props: ResizablePanelProps): Omit<PanelConfig, "defaultSize"> & { defaultSize?: number; defaultCollapsed: boolean } {
  return {
    minSize: props.minSize ?? 10,
    maxSize: props.maxSize ?? 100,
    collapsible: props.collapsible ?? false,
    collapsedSize: props.collapsedSize ?? 0,
    defaultSize: props.defaultSize,
    defaultCollapsed: props.defaultCollapsed ?? false,
    onCollapsedChange: props.onCollapsedChange,
  };
}

/** Moves the boundary between panel i and i + 1 by delta percent, honoring min/max and collapse. */
function resizePair(base: readonly number[], i: number, delta: number, configs: readonly PanelConfig[]): number[] {
  const next = [...base];
  const a = base[i] ?? 0;
  const b = base[i + 1] ?? 0;
  const ca = configs[i];
  const cb = configs[i + 1];
  if (!ca || !cb) return next;
  const total = a + b;
  const rawA = a + delta;
  const rawB = total - rawA;
  let nextA: number;
  if (ca.collapsible && rawA < (ca.collapsedSize + ca.minSize) / 2) nextA = ca.collapsedSize;
  else if (cb.collapsible && rawB < (cb.collapsedSize + cb.minSize) / 2) nextA = total - cb.collapsedSize;
  else nextA = clamp(rawA, Math.max(ca.minSize, total - cb.maxSize), Math.min(ca.maxSize, total - cb.minSize));
  next[i] = nextA;
  next[i + 1] = total - nextA;
  return next;
}

const isCollapsed = (size: number | undefined, config: PanelConfig | undefined) =>
  Boolean(config?.collapsible) && (size ?? 0) <= (config?.collapsedSize ?? 0) + 0.05;

/** Split panes with drag handles, min/max sizes, collapse-to-rail and keyboard resizing. */
export const ResizablePanels = React.forwardRef<HTMLDivElement, ResizablePanelsProps>(function ResizablePanels(
  { direction = "horizontal", onLayout, keyboardStep = 10, className, children, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const baseId = React.useId();
  const elements = React.Children.toArray(children).filter(React.isValidElement);
  const panelElements = elements.filter((el) => el.type === ResizablePanel) as React.ReactElement<ResizablePanelProps>[];
  const raw = panelElements.map((el) => readConfig(el.props));
  const count = raw.length;

  // Initial layout: explicit defaults, the rest shared equally, then normalized to 100.
  const initial = React.useMemo(() => {
    const given = raw.reduce((sum, c) => sum + (c.defaultSize ?? 0), 0);
    const missing = raw.filter((c) => c.defaultSize === undefined).length;
    const share = missing ? Math.max(0, 100 - given) / missing : 0;
    const expanded = raw.map((c) => c.defaultSize ?? share);
    const sum = expanded.reduce((s, v) => s + v, 0) || 1;
    const normalized = expanded.map((v) => (v / sum) * 100);
    const sizes = normalized.map((v, i) => (raw[i]?.defaultCollapsed && raw[i]?.collapsible ? (raw[i]?.collapsedSize ?? 0) : v));
    // Give space freed by default-collapsed panels to the next expanded neighbor.
    const freed = normalized.reduce((s, v, i) => s + (v - (sizes[i] ?? v)), 0);
    if (freed > 0) {
      const target = sizes.findIndex((_, i) => !(raw[i]?.defaultCollapsed && raw[i]?.collapsible));
      if (target !== -1) sizes[target] = (sizes[target] ?? 0) + freed;
    }
    return { sizes, expanded: normalized };
    // Only the panel count re-seeds the layout; later prop changes don't reset a user's resize.
  }, [count]);

  const configs: PanelConfig[] = raw.map((c, i) => ({
    minSize: c.minSize,
    maxSize: c.maxSize,
    collapsible: c.collapsible,
    collapsedSize: c.collapsedSize,
    defaultSize: initial.expanded[i] ?? 0,
    onCollapsedChange: c.onCollapsedChange,
  }));

  const mvs = React.useMemo(() => initial.sizes.map((s) => motionValue(s)), [initial]);
  const [sizes, setSizes] = React.useState<number[]>(initial.sizes);
  const [seed, setSeed] = React.useState(initial);
  if (seed !== initial) {
    setSeed(initial);
    setSizes(initial.sizes);
  }
  const [draggingHandle, setDraggingHandle] = React.useState<number | null>(null);
  const panelRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const lastExpanded = React.useRef<number[]>([]);
  const latest = useLatestRef({ sizes, configs, onLayout, reduced, keyboardStep, direction });

  const available = () =>
    panelRefs.current.slice(0, count).reduce((sum, el) => {
      if (!el) return sum;
      const rect = el.getBoundingClientRect();
      return sum + (latest.current.direction === "horizontal" ? rect.width : rect.height);
    }, 0);

  const commit = (next: number[], animated: boolean) => {
    const { sizes: prev, configs: cfg, onLayout: notify, reduced: rm } = latest.current;
    next.forEach((size, i) => {
      const mv = mvs[i];
      if (!mv) return;
      if (animated && !rm) animate(mv, size, springs.heavy);
      else mv.set(size);
      const was = isCollapsed(prev[i], cfg[i]);
      const now = isCollapsed(size, cfg[i]);
      if (was !== now) {
        if (now) lastExpanded.current[i] = Math.max(prev[i] ?? 0, cfg[i]?.minSize ?? 0);
        cfg[i]?.onCollapsedChange?.(now);
      }
    });
    setSizes(next);
    notify?.(next.map(round));
  };

  const setPanel = (panel: number, collapse: boolean) => {
    const { sizes: current, configs: cfg } = latest.current;
    const config = cfg[panel];
    if (!config?.collapsible || isCollapsed(current[panel], config) === collapse) return;
    const neighbor = panel + 1 < count ? panel + 1 : panel - 1;
    const nCfg = cfg[neighbor];
    if (!nCfg) return;
    const size = current[panel] ?? 0;
    const nSize = current[neighbor] ?? 0;
    const total = size + nSize;
    let target = collapse ? config.collapsedSize : (lastExpanded.current[panel] ?? Math.max(config.minSize, config.defaultSize));
    target = clamp(target, collapse ? config.collapsedSize : config.minSize, Math.min(config.maxSize, total - nCfg.minSize));
    const next = [...current];
    next[panel] = target;
    next[neighbor] = total - target;
    if (collapse) lastExpanded.current[panel] = size;
    commit(next, true);
  };

  const toggle = (panel: number) => {
    const { sizes: current, configs: cfg } = latest.current;
    setPanel(panel, !isCollapsed(current[panel], cfg[panel]));
  };

  const startDrag = (handle: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    target.focus({ preventScroll: true });
    const horizontal = latest.current.direction === "horizontal";
    const rtl = horizontal && getComputedStyle(target).direction === "rtl";
    const start = horizontal ? event.clientX : event.clientY;
    const space = available();
    const base = mvs.map((mv) => mv.get());
    let next = base;
    setDraggingHandle(handle);
    const root = document.documentElement;
    const previousCursor = root.style.cursor;
    const previousSelect = root.style.userSelect;
    root.style.cursor = horizontal ? "col-resize" : "row-resize";
    root.style.userSelect = "none";

    const move = (e: PointerEvent) => {
      if (space <= 0) return;
      const delta = (((horizontal ? e.clientX : e.clientY) - start) / space) * 100 * (rtl ? -1 : 1);
      next = resizePair(base, handle, delta, latest.current.configs);
      next.forEach((size, i) => mvs[i]?.set(size));
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      root.style.cursor = previousCursor;
      root.style.userSelect = previousSelect;
      setDraggingHandle(null);
      commit(next, false);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const keyResize = (handle: number, event: React.KeyboardEvent<HTMLDivElement>) => {
    const { sizes: current, configs: cfg, keyboardStep: stepPx, direction: dir } = latest.current;
    const horizontal = dir === "horizontal";
    const rtl = horizontal && getComputedStyle(event.currentTarget).direction === "rtl";
    const space = available();
    const step = space > 0 ? (stepPx / space) * 100 : 2;
    const grow = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    const shrink = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const factor = event.shiftKey ? 5 : 1;
    const a = current[handle] ?? 0;
    let delta: number | null = null;
    let animated = false;
    if (event.key === grow) delta = step * factor;
    else if (event.key === shrink) delta = -step * factor;
    else if (event.key === "Home") {
      delta = (cfg[handle]?.collapsible ? (cfg[handle]?.collapsedSize ?? 0) : (cfg[handle]?.minSize ?? 0)) - a;
      animated = true;
    } else if (event.key === "End") {
      delta = 100 - a;
      animated = true;
    } else if (event.key === "Enter") {
      event.preventDefault();
      toggle(cfg[handle]?.collapsible ? handle : handle + 1);
      return;
    }
    if (delta === null) return;
    event.preventDefault();
    // Arrow keys step out of a collapsed panel straight to its min size.
    if (!animated && isCollapsed(a, cfg[handle]) && delta > 0) {
      delta = Math.max(delta, (cfg[handle]?.minSize ?? 0) - a);
      animated = true;
    }
    commit(resizePair(current, handle, delta, cfg), animated);
  };

  let panelIndex = -1;
  const panelIds = panelElements.map((el, i) => (el.props.id as string | undefined) ?? `${baseId}-panel-${i}`);
  const context: GroupContextValue = {
    direction,
    sizes,
    configs,
    mvs,
    panelIds,
    panelRefs,
    draggingHandle,
    startDrag,
    keyResize,
    toggle,
    setPanel,
  };

  return (
    <GroupContext.Provider value={context}>
      <div
        ref={ref}
        data-direction={direction}
        data-dragging={draggingHandle !== null ? "" : undefined}
        {...props}
        className={cn(
          blockReset,
          "flex size-full min-h-0 min-w-0 overflow-hidden",
          direction === "horizontal" ? "flex-row" : "flex-col",
          className,
        )}
      >
        {elements.map((child, i) => {
          if (child.type === ResizablePanel) {
            panelIndex += 1;
            return (
              <PanelIndexContext.Provider key={child.key ?? `p${i}`} value={panelIndex}>
                {child}
              </PanelIndexContext.Provider>
            );
          }
          if (child.type === ResizableHandle) {
            return (
              <HandleIndexContext.Provider key={child.key ?? `h${i}`} value={panelIndex}>
                {child}
              </HandleIndexContext.Provider>
            );
          }
          return child;
        })}
      </div>
    </GroupContext.Provider>
  );
});

export interface UseResizablePanelResult {
  /** Percent. */
  size: number;
  collapsed: boolean;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
}

/** Size and collapse controls of the enclosing ResizablePanel (e.g. for an icon-rail layout). */
export function useResizablePanel(): UseResizablePanelResult {
  const group = useGroup("useResizablePanel");
  const index = React.useContext(PanelIndexContext);
  const size = group.sizes[index] ?? 0;
  return {
    size,
    collapsed: isCollapsed(size, group.configs[index]),
    collapse: () => group.setPanel(index, true),
    expand: () => group.setPanel(index, false),
    toggle: () => group.toggle(index),
  };
}

export const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(function ResizablePanel(
  {
    defaultSize: _defaultSize,
    minSize: _minSize,
    maxSize: _maxSize,
    collapsible: _collapsible,
    collapsedSize: _collapsedSize,
    defaultCollapsed: _defaultCollapsed,
    onCollapsedChange: _onCollapsedChange,
    id: _id,
    className,
    style,
    ...props
  },
  ref,
) {
  const group = useGroup("ResizablePanel");
  const index = React.useContext(PanelIndexContext);
  const mv = group.mvs[index];
  const collapsed = isCollapsed(group.sizes[index], group.configs[index]);
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      group.panelRefs.current[index] = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    // panelRefs is a stable ref object.
    [index, ref],
  );
  return (
    <motion.div
      ref={setRef}
      id={group.panelIds[index]}
      data-panel=""
      data-state={collapsed ? "collapsed" : "expanded"}
      {...props}
      style={{ ...style, flexGrow: mv, flexShrink: 1, flexBasis: 0 }}
      className={cn(blockReset, "relative min-h-0 min-w-0 overflow-hidden", className)}
    />
  );
});

export const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(function ResizableHandle(
  { withGrip = false, disabled = false, className, "aria-label": ariaLabel, onPointerDown, onKeyDown, onDoubleClick, ...props },
  ref,
) {
  const group = useGroup("ResizableHandle");
  const index = React.useContext(HandleIndexContext);
  const horizontal = group.direction === "horizontal";
  const config = group.configs[index];
  const next = group.configs[index + 1];
  const size = group.sizes[index] ?? 0;
  const pair = size + (group.sizes[index + 1] ?? 0);
  const dragging = group.draggingHandle === index;
  const valid = index >= 0 && config !== undefined && next !== undefined;

  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={disabled || !valid ? -1 : 0}
      aria-label={ariaLabel ?? "Resize"}
      aria-orientation={horizontal ? "vertical" : "horizontal"}
      aria-controls={group.panelIds[index]}
      aria-valuenow={Math.round(size)}
      aria-valuemin={Math.round(config?.collapsible ? (config.collapsedSize ?? 0) : (config?.minSize ?? 0))}
      aria-valuemax={Math.round(Math.min(config?.maxSize ?? 100, pair - (next?.minSize ?? 0)))}
      aria-disabled={disabled || undefined}
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented && !disabled && valid) group.startDrag(index, event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && !disabled && valid) group.keyResize(index, event);
      }}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        if (event.defaultPrevented || disabled || !valid) return;
        if (config.collapsible) group.toggle(index);
        else if (next.collapsible) group.toggle(index + 1);
      }}
      className={cn(
        blockReset,
        "group/handle relative z-[1] flex flex-none touch-none items-center justify-center bg-pui-border outline-hidden",
        horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
        disabled && "cursor-default",
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-pui-ring",
        className,
      )}
    >
      {/* Wider invisible hit area. */}
      <span aria-hidden="true" className={cn(blockReset, "absolute", horizontal ? "inset-y-0 -inset-x-1.5" : "inset-x-0 -inset-y-1.5")} />
      {/* The visible line thickens from 1 to 3 px on hover, focus and drag. */}
      <span
        aria-hidden="true"
        className={cn(
          blockReset,
          "pointer-events-none absolute rounded-full bg-transparent transition-[width,height,background-color] duration-150 ease-out motion-reduce:transition-none",
          horizontal ? "inset-y-0 w-px" : "inset-x-0 h-px",
          !disabled && (horizontal ? "group-hover/handle:w-[3px]" : "group-hover/handle:h-[3px]"),
          !disabled && "group-hover/handle:bg-pui-primary/60",
          dragging && (horizontal ? "w-[3px] bg-pui-primary" : "h-[3px] bg-pui-primary"),
        )}
      />
      {withGrip ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "relative grid place-items-center rounded-pui-sm border border-pui-border bg-pui-surface text-pui-muted-foreground shadow-(--pui-shadow-xs) transition-colors",
            horizontal ? "h-6 w-3" : "h-3 w-6",
            "group-hover/handle:text-pui-foreground",
            dragging && "border-pui-primary text-pui-primary-text",
          )}
        >
          <svg viewBox="0 0 6 10" fill="currentColor" className={cn(blockReset, "block", horizontal ? "h-2.5 w-1.5" : "h-1.5 w-2.5 rotate-90")}>
            <circle cx="1" cy="1.5" r="0.9" />
            <circle cx="5" cy="1.5" r="0.9" />
            <circle cx="1" cy="5" r="0.9" />
            <circle cx="5" cy="5" r="0.9" />
            <circle cx="1" cy="8.5" r="0.9" />
            <circle cx="5" cy="8.5" r="0.9" />
          </svg>
        </span>
      ) : null}
    </div>
  );
});
