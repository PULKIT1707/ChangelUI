"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ChevronLeftIcon, ChevronRightIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { RollingNumber } from "../text/rolling-number";

export type PaginationSize = "sm" | "md" | "lg";
export type PaginationVariant = "soft" | "outline" | "ghost";
export type PaginationRangeItem = number | "start-ellipsis" | "end-ellipsis";

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Total number of pages. */
  count: number;
  /** Current page, 1-based (controlled). */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Pages shown on each side of the current one. Default 1. */
  siblings?: number;
  /** Pages always shown at each end. Default 1. */
  boundaries?: number;
  /** "pages" shows the windowed page list; "compact" shows "Page 3 of 20" with a rolling number. Default "pages". */
  mode?: "pages" | "compact";
  /** Default "md". */
  size?: PaginationSize;
  /** Active pill style. Default "soft". */
  variant?: PaginationVariant;
  /** Show previous/next buttons. Default true. */
  showPrevNext?: boolean;
  /** Show first/last buttons. Default false. */
  showFirstLast?: boolean;
  /** Ellipses jump by a window of pages when pressed. Default true. */
  jumpOnEllipsis?: boolean;
  /** Render pages as links. The click still calls onPageChange. */
  getPageHref?: (page: number) => string;
  disabled?: boolean;
  /** Landmark name. Default "Pagination". */
  label?: string;
  /** Default "Previous page". */
  previousLabel?: string;
  /** Default "Next page". */
  nextLabel?: string;
  /** Default "First page". */
  firstLabel?: string;
  /** Default "Last page". */
  lastLabel?: string;
  /** Accessible name of a page button. Default (page) => `Page ${page}`. */
  pageLabel?: (page: number) => string;
}

const clampPage = (page: number, count: number) => Math.min(Math.max(1, Math.round(page)), Math.max(1, count));
const range = (start: number, end: number) => (end < start ? [] : Array.from({ length: end - start + 1 }, (_, i) => start + i));

/**
 * The windowed page list: boundary pages at both ends, siblings around the current page and an
 * ellipsis wherever pages are skipped. The list has a constant length once count is large, so
 * buttons never jump around as the page changes.
 */
export function paginationRange(page: number, count: number, siblings = 1, boundaries = 1): PaginationRangeItem[] {
  const total = Math.max(0, Math.floor(count));
  if (total === 0) return [];
  const current = clampPage(page, total);
  const sib = Math.max(0, Math.floor(siblings));
  const edge = Math.max(1, Math.floor(boundaries));
  // Every slot is shown when the full list fits in the windowed length.
  if (total <= edge * 2 + sib * 2 + 3) return range(1, total);

  const start = range(1, edge);
  const end = range(total - edge + 1, total);
  const windowStart = Math.max(Math.min(current - sib, total - edge - sib * 2 - 1), edge + 2);
  const windowEnd = Math.min(Math.max(current + sib, edge + sib * 2 + 2), total - edge - 1);
  return [
    ...start,
    ...(windowStart > edge + 2 ? (["start-ellipsis"] as const) : [edge + 1]),
    ...range(windowStart, windowEnd),
    ...(windowEnd < total - edge - 1 ? (["end-ellipsis"] as const) : [total - edge]),
    ...end,
  ];
}

const sizes: Record<PaginationSize, string> = {
  sm: "h-8 min-w-8 px-1.5 text-xs",
  md: "h-9 min-w-9 px-2 text-sm",
  lg: "h-11 min-w-11 px-3 text-base",
};

const iconSizes: Record<PaginationSize, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };

const pills: Record<PaginationVariant, string> = {
  soft: "bg-pui-primary text-pui-primary-foreground shadow-pui-sm",
  outline: "border border-pui-primary bg-pui-primary/10",
  ghost: "bg-pui-muted",
};

const activeText: Record<PaginationVariant, string> = {
  soft: "text-pui-primary-foreground",
  outline: "text-pui-primary-text",
  ghost: "text-pui-foreground",
};

// Direction comes through AnimatePresence's custom prop, so an exiting number uses the latest one.
const numberVariants = {
  enter: (slide: number) => ({ opacity: 0, x: slide }),
  center: { opacity: 1, x: 0 },
  exit: (slide: number) => ({ opacity: 0, x: -slide }),
};

const buttonBase =
  "relative isolate inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-pui-md font-medium tabular-nums text-pui-muted-foreground no-underline transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40";

function DoubleChevron({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(direction === "left" && "-scale-x-100", "rtl:-scale-x-100", className)}
    >
      <path d="m4 4 4 4-4 4M8.5 4l4 4-4 4" />
    </svg>
  );
}

function Dots({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <circle cx="3.5" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12.5" cy="8" r="1.2" />
    </svg>
  );
}

interface PageControlProps {
  page: number;
  href?: string;
  disabled?: boolean;
  current?: boolean;
  label: string;
  size: PaginationSize;
  onSelect: (page: number) => void;
  className?: string;
  children: React.ReactNode;
}

/** A page button, or a link when getPageHref is set. Disabled links drop their href. */
function PageControl({ page, href, disabled, current, label, size, onSelect, className, children }: PageControlProps) {
  const common = {
    "aria-label": label,
    "aria-current": current ? ("page" as const) : undefined,
    "aria-disabled": disabled || undefined,
    "data-page": page,
    className: cn(controlReset, buttonBase, sizes[size], focusRing, className),
  };
  if (href !== undefined) {
    return (
      <a
        {...common}
        href={disabled ? undefined : href}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onSelect(page);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" {...common} disabled={disabled} onClick={() => onSelect(page)}>
      {children}
    </button>
  );
}

/** Page navigation with a sliding active pill and sibling/boundary windowing. */
export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    count,
    page: pageProp,
    defaultPage = 1,
    onPageChange,
    siblings = 1,
    boundaries = 1,
    mode = "pages",
    size = "md",
    variant = "soft",
    showPrevNext = true,
    showFirstLast = false,
    jumpOnEllipsis = true,
    getPageHref,
    disabled = false,
    label = "Pagination",
    previousLabel = "Previous page",
    nextLabel = "Next page",
    firstLabel = "First page",
    lastLabel = "Last page",
    pageLabel = (p) => `Page ${p}`,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const reduced = usePrefersReducedMotion();
  const total = Math.max(1, Math.floor(count));
  const [rawPage, setPage] = useControllableState({ value: pageProp, defaultValue: defaultPage, onChange: onPageChange });
  const page = clampPage(rawPage, total);
  // Slide direction of the page numbers: +1 forward, -1 back (derived during render, no effect).
  const [prev, setPrev] = React.useState(page);
  const [direction, setDirection] = React.useState(1);
  if (prev !== page) {
    setPrev(page);
    setDirection(page > prev ? 1 : -1);
  }

  const select = (next: number) => {
    if (disabled) return;
    const target = clampPage(next, total);
    if (target !== page) setPage(target);
  };
  const href = (p: number) => getPageHref?.(clampPage(p, total));
  const jump = siblings * 2 + 1;
  const items = paginationRange(page, total, siblings, boundaries);
  const icon = iconSizes[size];

  const edgeButtons = (where: "start" | "end") => {
    const atStart = page <= 1;
    const atEnd = page >= total;
    const out: React.ReactNode[] = [];
    if (where === "start") {
      if (showFirstLast)
        out.push(
          <li key="first" className={cn(blockReset, "inline-flex")}>
            <PageControl page={1} href={href(1)} disabled={disabled || atStart} label={firstLabel} size={size} onSelect={select}>
              <DoubleChevron direction="left" className={icon} />
            </PageControl>
          </li>,
        );
      if (showPrevNext)
        out.push(
          <li key="prev" className={cn(blockReset, "inline-flex")}>
            <PageControl page={page - 1} href={href(page - 1)} disabled={disabled || atStart} label={previousLabel} size={size} onSelect={select}>
              <ChevronLeftIcon className={cn(icon, "rtl:-scale-x-100")} />
            </PageControl>
          </li>,
        );
    } else {
      if (showPrevNext)
        out.push(
          <li key="next" className={cn(blockReset, "inline-flex")}>
            <PageControl page={page + 1} href={href(page + 1)} disabled={disabled || atEnd} label={nextLabel} size={size} onSelect={select}>
              <ChevronRightIcon className={cn(icon, "rtl:-scale-x-100")} />
            </PageControl>
          </li>,
        );
      if (showFirstLast)
        out.push(
          <li key="last" className={cn(blockReset, "inline-flex")}>
            <PageControl page={total} href={href(total)} disabled={disabled || atEnd} label={lastLabel} size={size} onSelect={select}>
              <DoubleChevron direction="right" className={icon} />
            </PageControl>
          </li>,
        );
    }
    return out;
  };

  const slide = reduced ? 0 : 8 * direction;
  const numberTransition = reduced ? { duration: 0 } : { duration: 0.18, ease: easings.out };

  return (
    <nav
      ref={ref}
      aria-label={label}
      data-mode={mode}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, disabled && "opacity-60", className)}
    >
      <ul className={cn(listReset, "flex flex-wrap items-center gap-1")}>
        {edgeButtons("start")}
        {mode === "compact" ? (
          <li className={cn(blockReset, "inline-flex items-center gap-1.5 px-2 text-sm text-pui-muted-foreground")}>
            <span className={cn(blockReset, "sr-only")} aria-live="polite">
              {pageLabel(page)} of {total}
            </span>
            <span aria-hidden="true" className={cn(blockReset, "inline-flex items-center gap-1.5")}>
              Page
              <span
                className={cn(
                  blockReset,
                  "inline-flex min-w-8 justify-center rounded-pui-md bg-pui-muted px-1.5 py-0.5 font-semibold tabular-nums text-pui-foreground",
                )}
              >
                <RollingNumber value={page} />
              </span>
              of <span className={cn(blockReset, "tabular-nums text-pui-foreground")}>{total}</span>
            </span>
          </li>
        ) : (
          items.map((item, slot) => {
            // Keyed by slot, so the numbers slide while the buttons stay put.
            const key = `slot-${slot}`;
            if (item === "start-ellipsis" || item === "end-ellipsis") {
              const forward = item === "end-ellipsis";
              const target = forward ? Math.min(total, page + jump) : Math.max(1, page - jump);
              return (
                <li key={key} className={cn(blockReset, "inline-flex")}>
                  {jumpOnEllipsis ? (
                    <PageControl
                      page={target}
                      href={href(target)}
                      disabled={disabled}
                      label={`${forward ? "Forward" : "Back"} ${jump} pages, ${pageLabel(target)}`}
                      size={size}
                      onSelect={select}
                      className="group"
                    >
                      <Dots className={cn(icon, "transition-[opacity,transform] duration-(--pui-duration-fast) group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0 motion-reduce:transition-none")} />
                      <DoubleChevron
                        direction={forward ? "right" : "left"}
                        className={cn(
                          icon,
                          "absolute scale-75 opacity-0 transition-[opacity,transform] duration-(--pui-duration-fast) group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
                        )}
                      />
                    </PageControl>
                  ) : (
                    <span aria-hidden="true" className={cn(blockReset, "inline-flex items-center justify-center text-pui-muted-foreground", sizes[size])}>
                      <Dots className={icon} />
                    </span>
                  )}
                </li>
              );
            }
            const current = item === page;
            return (
              <li key={key} className={cn(blockReset, "inline-flex")}>
                <PageControl
                  page={item}
                  href={href(item)}
                  disabled={disabled}
                  current={current}
                  label={pageLabel(item)}
                  size={size}
                  onSelect={select}
                  className={cn("overflow-hidden", current && cn(activeText[variant], "hover:bg-transparent", variant === "soft" ? "hover:text-pui-primary-foreground" : ""))}
                >
                  {current ? (
                    <motion.span
                      layoutId={`${id}-pill`}
                      transition={reduced ? { duration: 0 } : springs.snappy}
                      aria-hidden="true"
                      data-pui-pagination-pill=""
                      className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-md", pills[variant])}
                    />
                  ) : null}
                  <AnimatePresence initial={false} mode="popLayout" custom={slide}>
                    <motion.span
                      key={item}
                      custom={slide}
                      variants={numberVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={numberTransition}
                      className={cn(blockReset, "inline-block")}
                    >
                      {item}
                    </motion.span>
                  </AnimatePresence>
                </PageControl>
              </li>
            );
          })
        )}
        {edgeButtons("end")}
      </ul>
    </nav>
  );
});
