"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { InboxIcon, RotateCcwIcon, SearchIcon, TriangleAlertIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
export type EmptyStateVariant = "no-data" | "no-results" | "error";
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Picks the icon, the default copy and the tone. Default "no-data". */
  variant?: EmptyStateVariant;
  /** Replaces the variant icon inside the front card. */
  icon?: React.ReactNode;
  /** Default copy per variant; "no-results" echoes `query`. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** The search text that found nothing ("no-results"). */
  query?: string;
  /** Shows a "Clear filters" button ("no-results"). */
  onClearFilters?: () => void;
  /** Default "Clear filters". */
  clearLabel?: string;
  /** Shows a "Try again" button ("error"). */
  onRetry?: () => void;
  /** Default "Try again". */
  retryLabel?: string;
  /** Your buttons (primary first), shown after the built-in ones. */
  actions?: React.ReactNode;
  /** Small print under the actions, e.g. a docs link. */
  footer?: React.ReactNode;
  /** Heading element. Default "h3". */
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Dashed outline, for empty drop zones and table bodies. Default false. */
  bordered?: boolean;
  /** Default "md". */
  size?: "sm" | "md";
}
const copy: Record<EmptyStateVariant, { title: (q?: string) => string; description: string }> = {
  "no-data": { title: () => "Nothing here yet", description: "When you add items, they'll show up here." },
  "no-results": {
    title: (q) => (q ? `No results for “${q}”` : "No matching results"),
    description: "Try a different search term or clear your filters.",
  },
  error: { title: () => "Something went wrong", description: "We couldn't load this. Check your connection and try again." },
};
const variantIcon: Record<EmptyStateVariant, React.ReactNode> = {
  "no-data": <InboxIcon className="size-full" />,
  "no-results": <SearchIcon className="size-full" />,
  error: <TriangleAlertIcon className="size-full" />,
};
/**
 * Empty state for lists, tables and dashboards: a fanned card-stack illustration on a faded dot
 * grid, a title and description per variant (no data, no results that echo the query, error),
 * built-in clear-filters and retry actions plus your own. No-results and error announce politely.
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    variant = "no-data",
    icon,
    title,
    description,
    query,
    onClearFilters,
    clearLabel = "Clear filters",
    onRetry,
    retryLabel = "Try again",
    actions,
    footer,
    titleAs: TitleTag = "h3",
    bordered = false,
    size = "md",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const small = size === "sm";
  const text = copy[variant];
  const showClear = variant === "no-results" && onClearFilters;
  const showRetry = variant === "error" && onRetry;
  const hasActions = showClear || showRetry || actions != null;
  return (
    <div
      ref={ref}
      role={variant === "no-data" ? undefined : "status"}
      aria-labelledby={`${id}-title`}
      data-variant={variant}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "group/empty flex w-full min-w-0 flex-col items-center text-center text-pui-foreground",
        small ? "gap-3 px-4 py-6" : "gap-4 px-6 py-10",
        bordered && "rounded-pui-xl border border-dashed border-pui-border",
        className,
      )}
    >
      <Illustration variant={variant} icon={icon} small={small} reduced={reduced} />
      <div className={cn(blockReset, "flex max-w-sm flex-col gap-1.5")}>
        <TitleTag
          id={`${id}-title`}
          className={cn(blockReset, "font-semibold break-words text-pui-foreground", small ? "text-sm" : "text-base")}
        >
          {title ?? text.title(query)}
        </TitleTag>
        <p className={cn(blockReset, "text-pui-muted-foreground", small ? "text-xs" : "text-sm leading-relaxed")}>
          {description ?? text.description}
        </p>
      </div>
      {hasActions ? (
        <div className={cn(blockReset, "flex flex-wrap items-center justify-center gap-2")}>
          {showRetry ? (
            <Button size="sm" variant="outline" tone="neutral" leadingIcon={<RotateCcwIcon className="size-3.5" />} onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {showClear ? (
            <Button size="sm" variant="outline" tone="neutral" leadingIcon={<XIcon className="size-3.5" />} onClick={onClearFilters}>
              {clearLabel}
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
      {footer ? <div className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{footer}</div> : null}
    </div>
  );
});
/** Three fanned cards; the front one holds the icon. The fan opens on mount and a bit more on hover. */
function Illustration({ variant, icon, small, reduced }: { variant: EmptyStateVariant; icon?: React.ReactNode; small: boolean; reduced: boolean }) {
  const danger = variant === "error";
  const card = cn(
    blockReset,
    "absolute inset-0 flex flex-col justify-end gap-1 rounded-pui-lg border border-pui-border bg-pui-surface p-2 shadow-pui-sm",
  );
  const lines = (
    <>
      <span className={cn(blockReset, "h-1 w-3/4 rounded-pui-full bg-pui-muted")} />
      <span className={cn(blockReset, "h-1 w-1/2 rounded-pui-full bg-pui-muted")} />
    </>
  );
  const fan = (rotate: number, x: number) =>
    reduced
      ? { initial: false as const, animate: { rotate, x } }
      : { initial: { rotate: 0, x: 0, opacity: 0 }, animate: { rotate, x, opacity: 1 }, transition: { ...springs.smooth, delay: 0.05 } };
  return (
    <div aria-hidden="true" className={cn(blockReset, "relative flex items-center justify-center", small ? "h-20 w-36" : "h-28 w-48")}>
      <span
        className={cn(blockReset, "absolute -inset-x-8 -inset-y-6")}
        style={{
          backgroundImage: "radial-gradient(var(--pui-border) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage: "radial-gradient(closest-side, black, transparent)",
          WebkitMaskImage: "radial-gradient(closest-side, black, transparent)",
        }}
      />
      <span className={cn(blockReset, "relative", small ? "h-14 w-12" : "h-20 w-16")}>
        <span
          className={cn(
            blockReset,
            "absolute inset-0 transition-transform duration-(--pui-duration-slow) ease-pui-out group-hover/empty:-translate-x-1.5 group-hover/empty:-rotate-3 motion-reduce:transition-none",
          )}
        >
          <motion.span {...fan(-12, small ? -20 : -28)} className={cn(card, "opacity-80")}>
            {lines}
          </motion.span>
        </span>
        <span
          className={cn(
            blockReset,
            "absolute inset-0 transition-transform duration-(--pui-duration-slow) ease-pui-out group-hover/empty:translate-x-1.5 group-hover/empty:rotate-3 motion-reduce:transition-none",
          )}
        >
          <motion.span {...fan(12, small ? 20 : 28)} className={cn(card, "opacity-80")}>
            {lines}
          </motion.span>
        </span>
        <motion.span
          initial={reduced ? false : { y: 8, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={springs.bouncy}
          className={cn(
            card,
            "items-center justify-center p-0 transition-[translate] duration-(--pui-duration-slow) ease-pui-out group-hover/empty:-translate-y-1 motion-reduce:transition-none",
          )}
        >
          <span
            className={cn(
              blockReset,
              "flex items-center justify-center rounded-pui-md",
              small ? "size-7 p-1.5" : "size-9 p-2",
              danger ? "bg-pui-danger/12 text-pui-danger-text" : "bg-pui-primary/12 text-pui-primary-text",
            )}
          >
            {icon ?? variantIcon[variant]}
          </span>
        </motion.span>
      </span>
    </div>
  );
}
