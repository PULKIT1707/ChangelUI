"use client";

// Ranked horizontal list ("Top pages", "Top countries"): real list semantics, values in text, the
// bar drawn behind the label. Rows can be links or buttons, re-order with a layout spring when the
// data changes, grow in with a stagger, show the change vs a previous value, and expand with
// "Show more". Micro: no chart runtime, only core math.
import { AnimatePresence, LayoutGroup, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { srOnly } from "./core/a11y";
import { categoricalColor, withOpacity } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const layoutSpring: Transition = { type: "spring", stiffness: 380, damping: 34 };

export interface BarListItem {
  /** Row name (also the React key unless `key` is set). */
  label: string;
  value: number;
  /** Stable identity when labels repeat or change. */
  key?: string;
  /** Renders the row as a link. */
  href?: string;
  /** A small icon or flag before the label. */
  icon?: React.ReactNode;
  /** Bar color (any CSS color or token). */
  color?: string;
  /** Last period's value: adds a change badge. */
  previous?: number;
  /** Muted text after the label (a path, a code). */
  description?: string;
}

export interface BarListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  items: readonly BarListItem[];
  /** Default "value" (descending). "none" keeps the given order. */
  sortBy?: "value" | "label" | "none";
  /** Default "desc". */
  order?: "asc" | "desc";
  /** Rows shown before "Show more". Default: all. */
  max?: number;
  /** Controlled expansion of the rows past `max`. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  format?: NumberFormat;
  locale?: string;
  /** Show each row's share of the total after the value. Default false. */
  showShare?: boolean;
  /** Bar color for every row. Default the first chart color. */
  color?: string;
  /** Lower is better for the change badges. Default false. */
  invertDelta?: boolean;
  /** Makes rows buttons (unless they have an href). */
  onItemClick?: (item: BarListItem, index: number) => void;
  /** Highlighted row key (or label). */
  selected?: string | null;
  /** Column headers, e.g. ["Page", "Views"]. */
  header?: readonly [React.ReactNode, React.ReactNode];
  /** Row height in px. Default 32. */
  rowHeight?: number;
  /** Accessible list name. */
  listLabel?: string;
  animation?: ChartAnimation;
}

function keyOf(item: BarListItem): string {
  return item.key ?? item.label;
}

/** A ranked horizontal bar list with links, change badges, layout re-ordering and "Show more". */
export const BarList = React.forwardRef<HTMLDivElement, BarListProps>(function BarList(
  {
    items,
    sortBy = "value",
    order = "desc",
    max,
    expanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    format,
    locale = "en-US",
    showShare = false,
    color,
    invertDelta = false,
    onItemClick,
    selected,
    header,
    rowHeight = 32,
    listLabel,
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const anim = useChartAnimation(animation);
  const [innerExpanded, setInnerExpanded] = React.useState(defaultExpanded);
  const expanded = expandedProp ?? innerExpanded;
  const setExpanded = (v: boolean) => {
    if (expandedProp === undefined) setInnerExpanded(v);
    onExpandedChange?.(v);
  };
  const [hover, setHover] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => {
    const list = [...items];
    const dir = order === "asc" ? 1 : -1;
    if (sortBy === "value") list.sort((a, b) => dir * (a.value - b.value));
    else if (sortBy === "label") list.sort((a, b) => dir * -a.label.localeCompare(b.label));
    return list;
  }, [items, sortBy, order]);
  const peak = Math.max(0, ...sorted.map((d) => d.value));
  const total = sorted.reduce((a, d) => a + Math.max(0, d.value), 0);
  const limit = max !== undefined && max < sorted.length && !expanded ? max : sorted.length;
  const visible = sorted.slice(0, limit);
  const hiddenCount = sorted.length - limit;
  const fmt = (v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const pct = (v: number, digits = 0) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(v);
  const barColor = color ?? categoricalColor(0);

  return (
    <div ref={ref} {...rest} className={cn(blockReset, "flex min-w-0 flex-col gap-1 text-pui-foreground", className)}>
      {header ? (
        <div aria-hidden="true" className={cn(blockReset, "flex items-center justify-between gap-3 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-pui-muted-foreground")}>
          <span>{header[0]}</span>
          <span>{header[1]}</span>
        </div>
      ) : null}
      <LayoutGroup>
        <ul aria-label={listLabel} className={cn(listReset, "flex flex-col gap-1")}>
          <AnimatePresence initial={false}>
            {visible.map((item, i) => {
              const key = keyOf(item);
              const share = peak > 0 ? Math.max(0, item.value) / peak : 0;
              const fill = item.color ?? barColor;
              const isSelected = selected !== undefined && selected !== null && (selected === key || selected === item.label);
              const dim = hover !== null && hover !== key;
              const change = item.previous !== undefined && item.previous !== 0 ? (item.value - item.previous) / Math.abs(item.previous) : null;
              const good = change === null || Math.abs(change) < 0.0005 ? null : change > 0 !== invertDelta;
              const shareText = total > 0 ? pct(Math.max(0, item.value) / total, 1) : "";
              const valueText = `${fmt(item.value)}${showShare && shareText ? `, ${shareText} of total` : ""}${change !== null ? `, ${change >= 0 ? "up" : "down"} ${pct(Math.abs(change), 1)}` : ""}`;
              const interactive = !!item.href || !!onItemClick;
              const body = (
                <>
                  <span aria-hidden="true" className={cn(blockReset, "absolute inset-y-0 left-0 right-0 overflow-hidden rounded-pui-md")}>
                    <motion.span
                      className={cn(blockReset, "absolute inset-y-0 left-0 rounded-pui-md")}
                      style={{ background: withOpacity(fill, isSelected ? 0.34 : hover === key ? 0.28 : 0.18), transition: "background 150ms" }}
                      initial={anim.entrance ? { width: "0%" } : false}
                      animate={{ width: `${Math.max(share * 100, item.value > 0 ? 1.5 : 0)}%` }}
                      transition={anim.reducedMotion ? instant : { ...layoutSpring, delay: anim.entrance ? Math.min(0.5, i * 0.03) : 0 }}
                    />
                    <motion.span
                      className={cn(blockReset, "absolute inset-y-1 w-0.5 rounded-pui-full")}
                      style={{ background: fill }}
                      initial={anim.entrance ? { left: "0%", opacity: 0 } : false}
                      animate={{ left: `calc(${Math.max(share * 100, item.value > 0 ? 1.5 : 0)}% - 2px)`, opacity: isSelected || hover === key ? 1 : 0 }}
                      transition={anim.reducedMotion ? instant : layoutSpring}
                    />
                  </span>
                  <span className={cn(blockReset, "relative flex min-w-0 flex-1 items-center gap-2 ps-2")}>
                    {item.icon ? (
                      <span aria-hidden="true" className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4")}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className={cn(blockReset, "min-w-0 truncate text-sm", interactive ? "group-hover:underline group-hover:underline-offset-2" : "")}>{item.label}</span>
                    {item.description ? <span className={cn(blockReset, "hidden min-w-0 truncate text-xs text-pui-muted-foreground sm:inline")}>{item.description}</span> : null}
                  </span>
                  <span className={cn(blockReset, "relative flex shrink-0 items-center gap-2 pe-2 text-sm tabular-nums")}>
                    {change !== null ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          blockReset,
                          "text-[11px] font-semibold",
                          good === null ? "text-pui-muted-foreground" : good ? "text-pui-success-text" : "text-pui-danger-text",
                        )}
                      >
                        {change >= 0 ? "\u25B2" : "\u25BC"} {pct(Math.abs(change))}
                      </span>
                    ) : null}
                    <span aria-hidden="true" className={cn(blockReset, "font-semibold")}>
                      {fmt(item.value)}
                    </span>
                    {showShare ? (
                      <span aria-hidden="true" className={cn(blockReset, "w-11 text-right text-xs text-pui-muted-foreground")}>
                        {shareText}
                      </span>
                    ) : null}
                    <span className={srOnly}>{valueText}</span>
                  </span>
                </>
              );
              const rowClass = cn(
                blockReset,
                "group relative flex w-full min-w-0 items-center justify-between gap-3 rounded-pui-md text-left no-underline text-inherit transition-opacity duration-150",
                dim ? "opacity-60" : "",
                interactive ? cn(focusRing, "cursor-pointer") : "",
              );
              const handlers = {
                onPointerEnter: () => setHover(key),
                onPointerLeave: () => setHover(null),
                onFocus: () => setHover(key),
                onBlur: () => setHover(null),
              };
              return (
                <motion.li
                  key={key}
                  layout={anim.reducedMotion ? false : "position"}
                  initial={anim.reducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, y: -6, transition: { duration: 0.12 } }}
                  transition={anim.reducedMotion ? instant : layoutSpring}
                  className={cn(blockReset, "min-w-0")}
                  style={{ minHeight: rowHeight }}
                >
                  {item.href ? (
                    <a href={item.href} aria-current={isSelected ? "true" : undefined} className={rowClass} style={{ minHeight: rowHeight }} onClick={() => onItemClick?.(item, i)} {...handlers}>
                      {body}
                    </a>
                  ) : onItemClick ? (
                    <button type="button" aria-pressed={isSelected} className={cn(controlReset, rowClass)} style={{ minHeight: rowHeight }} onClick={() => onItemClick(item, i)} {...handlers}>
                      {body}
                    </button>
                  ) : (
                    <div className={rowClass} style={{ minHeight: rowHeight }} {...handlers}>
                      {body}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {max !== undefined && sorted.length > max ? (
          <motion.div layout={anim.reducedMotion ? false : "position"} transition={anim.reducedMotion ? instant : layoutSpring} className={cn(blockReset, "flex justify-start pt-1")}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-pui-md px-2 py-1 text-xs font-medium text-pui-primary-text hover:bg-pui-muted",
              )}
            >
              {expanded ? "Show less" : `Show ${hiddenCount} more`}
              <motion.svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className={cn(blockReset, "size-3")}
                initial={false}
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={anim.reducedMotion ? instant : layoutSpring}
              >
                <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </button>
          </motion.div>
        ) : null}
      </LayoutGroup>
    </div>
  );
});
