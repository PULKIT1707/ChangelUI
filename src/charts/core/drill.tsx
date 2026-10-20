"use client";
// Shared drill-down model for hierarchical charts (treemap, sunburst) and drillable presets
// (bar, pie): a controllable path of node ids from the root, and the breadcrumb that shows it.
// Click or Enter drills in; Escape or Backspace goes up one level; a crumb jumps to that level.
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../../hooks/use-controllable-state";
import { cn } from "../../lib/cn";
import { blockReset, controlReset, focusRing } from "../../lib/styles";
import { useLatestRef } from "../../lib/use-latest-ref";

export interface DrillPathOptions {
  /** Controlled path of node ids below the root (root first is not included). */
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: string[]) => void;
}

export interface DrillPath {
  path: readonly string[];
  /** Drill to a node: the full id path below the root. */
  setPath: (path: readonly string[]) => void;
  /** Up one level; returns false at the root. */
  up: () => boolean;
}

const EMPTY: readonly string[] = [];

/** value/defaultValue/onChange for a drill path. */
export function useDrillPath({ path, defaultPath = EMPTY, onPathChange }: DrillPathOptions): DrillPath {
  const [value, setValue] = useControllableState<readonly string[]>({
    value: path,
    defaultValue: defaultPath,
    onChange: onPathChange ? (p) => onPathChange([...p]) : undefined,
    name: "path",
  });
  const valueRef = useLatestRef(value);
  const setPath = React.useCallback((next: readonly string[]) => setValue(next), [setValue]);
  const up = React.useCallback(() => {
    const cur = valueRef.current;
    if (!cur.length) return false;
    setValue(cur.slice(0, -1));
    return true;
  }, [setValue, valueRef]);
  return { path: value, setPath, up };
}

export interface BreadcrumbItem {
  key: string;
  label: string;
  /** Optional muted suffix, e.g. a value. */
  detail?: string;
}

export interface ChartBreadcrumbProps {
  /** Root first; the last item is the current level. */
  items: readonly BreadcrumbItem[];
  /** Jump to items[index]. */
  onNavigate: (index: number) => void;
  reducedMotion: boolean;
  /** Accessible name. Default "Drill-down path". */
  label?: string;
  className?: string;
}

/** Breadcrumb for drill levels: crumbs slide in as you drill and an "up" button leads. */
export function ChartBreadcrumb({ items, onNavigate, reducedMotion, label = "Drill-down path", className }: ChartBreadcrumbProps) {
  const depth = items.length - 1;
  const transition = reducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };
  return (
    <nav aria-label={label} className={cn(blockReset, "flex min-h-7 min-w-0 items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onNavigate(Math.max(0, depth - 1))}
        disabled={depth === 0}
        aria-label="Up one level"
        className={cn(
          controlReset,
          focusRing,
          "inline-flex size-7 shrink-0 items-center justify-center rounded-pui-md border border-pui-border text-pui-muted-foreground transition-[color,background-color,opacity] hover:bg-pui-muted hover:text-pui-foreground disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 13V3.5M3.5 7.5 8 3l4.5 4.5" />
        </svg>
      </button>
      <ol className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-0.5 text-xs")}>
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => {
            const current = i === depth;
            return (
              <motion.li
                key={item.key}
                layout={reducedMotion ? false : "position"}
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -6, transition: { duration: 0.12 } }}
                transition={transition}
                className={cn(blockReset, "flex min-w-0 items-center gap-0.5")}
              >
                {i > 0 ? (
                  <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-pui-muted-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path d="m6 3.5 4.5 4.5L6 12.5" />
                  </svg>
                ) : null}
                {current ? (
                  <span aria-current="location" className={cn(blockReset, "truncate rounded-pui-sm px-1.5 py-0.5 font-semibold text-pui-foreground")}>
                    {item.label}
                    {item.detail ? <span className={cn(blockReset, "ms-1.5 font-normal tabular-nums text-pui-muted-foreground")}>{item.detail}</span> : null}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(i)}
                    className={cn(controlReset, focusRing, "truncate rounded-pui-sm px-1.5 py-0.5 text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground")}
                  >
                    {item.label}
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </nav>
  );
}

/**
 * Drill stack for flat presets (bar, pie): each level is a slice of data with a label. Returns the
 * current data and level, a push, and the breadcrumb items.
 */
export function useDrillStack<T>(root: readonly T[], rootLabel: string) {
  const [stack, setStack] = React.useState<Array<{ key: string; label: string; data: readonly T[] }>>([]);
  const level = stack.length;
  const data = level ? (stack[level - 1] as { data: readonly T[] }).data : root;
  const push = React.useCallback((label: string, children: readonly T[]) => {
    setStack((s) => [...s, { key: `${s.length + 1}:${label}`, label, data: children }]);
  }, []);
  const goTo = React.useCallback((index: number) => setStack((s) => s.slice(0, Math.max(0, index))), []);
  const crumbs: BreadcrumbItem[] = [{ key: "root", label: rootLabel }, ...stack.map((s) => ({ key: s.key, label: s.label }))];
  // A new root dataset (e.g. randomized) resets the drill (derived state, set during render).
  const [prevRoot, setPrevRoot] = React.useState(root);
  if (prevRoot !== root) {
    setPrevRoot(root);
    if (stack.length) setStack([]);
  }
  return { data, level, push, goTo, crumbs, key: stack.length ? (stack[level - 1] as { key: string }).key : "root" };
}

/** Moves keyboard focus to the chart's interactive overlay after a keyboard drill remounted it. */
export function focusChartOverlay(figure: HTMLElement | null): void {
  if (!figure) return;
  requestAnimationFrame(() => {
    const overlay = figure.querySelector<HTMLElement>('[role="application"]');
    overlay?.focus({ preventScroll: true });
  });
}
