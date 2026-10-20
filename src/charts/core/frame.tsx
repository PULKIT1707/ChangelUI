"use client";
// Shared shell for the standalone charts (histogram, box plot, funnel, waterfall): the figure with
// its caption and sr-only summary, a gliding glass tooltip, and the data table that is sr-only by
// default and becomes visible with T or the optional "Show data" toggle.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../../lib/cn";
import { blockReset, controlReset, focusRing } from "../../lib/styles";
import { srOnly } from "./a11y";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };

/** A DOM-safe id prefix for clip paths, gradients and aria wiring. */
export function useChartUid(): string {
  return React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

export interface ChartFigureProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  uid: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Accessible name when there is no string title. */
  label: string;
  summary: string;
}

/** figure[role=group][aria-roledescription=chart] with caption, children and the sr-only summary. */
export const ChartFigure = React.forwardRef<HTMLElement, ChartFigureProps>(function ChartFigure(
  { uid, title, description, titleAs: TitleTag = "h3", label, summary, className, children, ...rest },
  ref,
) {
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
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
      {children}
      <p id={descId} className={srOnly}>
        {summary}
      </p>
    </figure>
  );
});

export interface ChartTipProps {
  /** Anchor as a fraction of the plot box (0..1). */
  left: number;
  top: number;
  /** Place the card to the left of the anchor. */
  flipX?: boolean;
  /** Place the card below the anchor. */
  below?: boolean;
  open: boolean;
  reducedMotion: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** Glass tooltip card that glides between anchors and flips at the edges. aria-hidden: the live region speaks. */
export function ChartTip({ left, top, flipX = false, below = false, open, reducedMotion, children, className }: ChartTipProps) {
  const pos = { left: `${left * 100}%`, top: `${top * 100}%` };
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="tip"
          role="presentation"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, ...pos }}
          animate={{ opacity: 1, scale: 1, ...pos }}
          exit={reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
          transition={reducedMotion ? instant : glide}
          className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
        >
          <div
            className={cn(
              blockReset,
              "min-w-40 rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md",
              className,
            )}
            style={{ transform: `translate(${flipX ? "calc(-100% + 20px)" : "-20px"}, ${below ? "12px" : "calc(-100% - 12px)"})` }}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** One label/value row inside a ChartTip. */
export function TipRow({ swatch, label, value, tone }: { swatch?: string; label: React.ReactNode; value: React.ReactNode; tone?: "up" | "down" | "muted" }) {
  return (
    <div className={cn(blockReset, "flex items-center justify-between gap-4 text-[11px] tabular-nums")}>
      <span className={cn(blockReset, "flex items-center gap-1.5 text-pui-muted-foreground")}>
        {swatch ? <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: swatch }} /> : null}
        {label}
      </span>
      <span
        className={cn(
          blockReset,
          "font-semibold",
          tone === "up" ? "text-pui-success-text" : tone === "down" ? "text-pui-danger-text" : tone === "muted" ? "text-pui-muted-foreground" : "",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export interface ChartTableProps {
  caption: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly React.ReactNode[]>;
  visible: boolean;
  /** Header cell for the first column of every row (th scope=row). Default true. */
  rowHeaders?: boolean;
}

/** The chart's data as a table: sr-only until `visible`. */
export function ChartTable({ caption, columns, rows, visible, rowHeaders = true }: ChartTableProps) {
  const capped = rows.slice(0, 500);
  return (
    <div className={visible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : srOnly}>
      <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
        <caption className={cn(blockReset, visible ? "px-3 py-2 text-left font-medium" : "")}>
          {caption}
          {rows.length > 500 ? ` (first 500 of ${rows.length} rows)` : ""}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capped.map((row, i) => (
            <tr key={i} className={cn(blockReset, "border-t border-pui-border")}>
              {row.map((cell, j) =>
                j === 0 && rowHeaders ? (
                  <th key={j} scope="row" className={cn(blockReset, "px-3 py-1 font-normal")}>
                    {cell}
                  </th>
                ) : (
                  <td key={j} className={cn(blockReset, "px-3 py-1")}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ChartChip {
  id: string;
  label: React.ReactNode;
  color: string;
  /** Extra text after the label (a count, a share). */
  meta?: React.ReactNode;
}

/**
 * Legend chips for standalone charts: aria-pressed toggles (Alt+click solos), hover/focus
 * reports the chip so the plot can spotlight it, and hidden chips strike through.
 */
export function ChartChips({
  chips,
  hidden,
  onToggle,
  onHover,
  active,
  reducedMotion,
  label = "Series",
  className,
}: {
  chips: readonly ChartChip[];
  hidden: ReadonlySet<string>;
  /** `solo` is true for Alt+click. Omit to render static (non-toggling) chips. */
  onToggle?: (id: string, solo: boolean) => void;
  onHover?: (id: string | null) => void;
  /** Spotlighted id: other chips dim. */
  active?: string | null;
  reducedMotion: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn(blockReset, "flex flex-wrap items-center gap-1", className)}>
      {chips.map((c) => {
        const off = hidden.has(c.id);
        const body = (
          <>
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scale: off ? 0.7 : 1, opacity: off ? 0.4 : 1 }}
              transition={reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 30 }}
              className={cn(blockReset, "size-2.5 shrink-0 rounded-[3px]")}
              style={{ background: c.color }}
            />
            <span className={off ? "line-through decoration-1" : ""}>{c.label}</span>
            {c.meta !== undefined ? <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>{c.meta}</span> : null}
          </>
        );
        const cls = cn(
          controlReset,
          focusRing,
          "inline-flex min-h-6 items-center gap-1.5 rounded-pui-md px-2 py-1 text-xs transition-[opacity,background-color] duration-150",
          off ? "text-pui-muted-foreground" : "text-pui-foreground",
          active && active !== c.id ? "opacity-55" : "",
        );
        return onToggle ? (
          <button
            key={c.id}
            type="button"
            aria-pressed={!off}
            title="Click to toggle, Alt+click to show only this one"
            onClick={(event) => onToggle(c.id, event.altKey)}
            onPointerEnter={() => !off && onHover?.(c.id)}
            onPointerLeave={() => onHover?.(null)}
            onFocus={() => !off && onHover?.(c.id)}
            onBlur={() => onHover?.(null)}
            className={cn(cls, "cursor-pointer hover:bg-pui-muted")}
          >
            {body}
          </button>
        ) : (
          <span key={c.id} onPointerEnter={() => onHover?.(c.id)} onPointerLeave={() => onHover?.(null)} className={cls}>
            {body}
          </span>
        );
      })}
    </div>
  );
}

/** Toggle helper for ChartChips: plain click flips one id, solo shows only that id (or all again). */
export function toggleHidden(prev: ReadonlySet<string>, all: readonly string[], id: string, solo: boolean): Set<string> {
  if (solo) {
    const onlyThis = all.every((k) => (k === id ? !prev.has(k) : prev.has(k)));
    return onlyThis ? new Set() : new Set(all.filter((k) => k !== id));
  }
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else if (all.length - next.size > 1) next.add(id);
  return next;
}

/** Pointer position in viewBox units for an overlay that covers the whole svg. */
export function pointerIn(event: React.PointerEvent<Element>, W: number, H: number): { x: number; y: number } | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
}

/** A small "Show data" / "Hide data" button for the visible table. */
export function ChartTableToggle({
  visible,
  onToggle,
  showLabel = "Show data",
  hideLabel = "Hide data",
  controls,
}: {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
  /** Id of the table it shows (aria-controls). */
  controls?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={visible}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        controlReset,
        focusRing,
        "inline-flex h-7 items-center gap-1.5 self-start rounded-pui-md border border-pui-border px-2.5 text-xs text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <rect x="2" y="2.5" width="12" height="11" rx="2" />
        <path d="M2 6.5h12M6 6.5v7" />
      </svg>
      {visible ? hideLabel : showLabel}
    </button>
  );
}
