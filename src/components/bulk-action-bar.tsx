"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { EllipsisIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** "danger" for destructive actions. Default "neutral". */
  tone?: "neutral" | "danger";
  disabled?: boolean;
}
export interface BulkActionBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Selected items. The bar shows while this is above 0. */
  count: number;
  /** Items that match the current view; enables the "Select all N" step. */
  total?: number;
  /** Shows "Select all N" while count < total. */
  onSelectAll?: () => void;
  /** Clears the selection (the X button and Escape). */
  onClear: () => void;
  actions: readonly BulkAction[];
  /** Actions shown as buttons; the rest go into a More menu. Default 3. */
  maxVisible?: number;
  /** "fixed" to the viewport bottom, "absolute" to the bottom of a positioned parent, or "static" in flow. Default "fixed". */
  position?: "fixed" | "absolute" | "static";
  /** Singular and plural names for the count. Default ["item", "items"]. */
  noun?: readonly [string, string];
  /** Escape clears the selection (not while typing in a field). Default true. */
  clearOnEscape?: boolean;
  /** Number formatting locale. */
  locale?: string;
}
const positions = {
  fixed: "fixed inset-x-0 bottom-4 z-(--pui-z-popover)",
  absolute: "absolute inset-x-0 bottom-3 z-10",
  static: "relative",
} as const;
const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
const itemButton = cn(
  focusRing,
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pui-md px-2.5 text-xs font-medium transition-colors duration-(--pui-duration-fast) focus-visible:outline-pui-background disabled:cursor-not-allowed disabled:opacity-50",
);
/** Animated count: the old number slides out as the new one slides in. */
function Count({ value, label, reduced }: { value: number; label: string; reduced: boolean }) {
  return (
    <span className={cn(blockReset, "relative inline-flex h-6 min-w-6 items-center justify-center overflow-hidden rounded-pui-md bg-pui-background px-1.5 text-xs font-semibold tabular-nums text-pui-foreground")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduced ? false : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: "-100%", opacity: 0 }}
          transition={reduced ? { duration: 0 } : springs.snappy}
          className={cn(blockReset, "block")}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
/**
 * Floating bar for acting on a table or list selection where the eye already is. It springs up when
 * something is selected, shows the live count, offers the Gmail-style step from "this page" to
 * "Select all N", keeps the main actions one click away with the rest in a More menu, clears on X or
 * Escape and announces changes. Arrow keys move between its buttons (role="toolbar").
 */
export const BulkActionBar = React.forwardRef<HTMLDivElement, BulkActionBarProps>(function BulkActionBar(
  {
    count,
    total,
    onSelectAll,
    onClear,
    actions,
    maxVisible = 3,
    position = "fixed",
    noun = ["item", "items"],
    clearOnEscape = true,
    locale,
    className,
    "aria-label": ariaLabel = "Bulk actions",
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const open = count > 0;
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const visible = actions.slice(0, Math.max(0, maxVisible));
  const overflow = actions.slice(Math.max(0, maxVisible));
  const word = count === 1 ? noun[0] : noun[1];
  const allSelected = total !== undefined && count >= total;
  const canSelectAll = onSelectAll && total !== undefined && count < total;
  const onClearRef = useLatestRef(onClear);
  React.useEffect(() => {
    if (!open || !clearOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isEditable(event.target)) return;
      onClearRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, clearOnEscape, onClearRef]);
  const onToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + step + items.length) % items.length;
    items[next]?.focus();
  };
  const status = open ? `${nf.format(count)} ${word} selected${allSelected && total !== undefined ? `, all ${nf.format(total)}` : ""}` : "";
  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="bar"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={reduced ? { duration: 0.12 } : springs.snappy}
            className={cn(blockReset, "pointer-events-none flex justify-center px-2", positions[position])}
          >
            <div
              ref={ref}
              role="toolbar"
              aria-label={ariaLabel}
              data-position={position}
              onKeyDown={onToolbarKeyDown}
              {...props}
              className={cn(
                blockReset,
                "pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-pui-xl bg-pui-foreground p-1.5 text-pui-background shadow-pui-lg [scrollbar-width:none]",
                className,
              )}
            >
              <span className={cn(blockReset, "flex shrink-0 items-center gap-2 ps-1.5 pe-1 text-xs font-medium whitespace-nowrap")}>
                <Count value={count} label={nf.format(count)} reduced={reduced} />
                <span className={blockReset}>
                  {allSelected && total !== undefined && total > 1 ? `All ${word}` : word} selected
                </span>
              </span>
              {canSelectAll ? (
                <button type="button" onClick={onSelectAll} className={cn(controlReset, itemButton, "text-pui-background/70 underline-offset-2 hover:text-pui-background hover:underline")}>
                  Select all {nf.format(total)}
                </button>
              ) : null}
              <span aria-hidden="true" className={cn(blockReset, "mx-1 h-5 w-px shrink-0 bg-pui-background/20")} />
              {visible.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  aria-label={action.icon ? action.label : undefined}
                  className={cn(
                    controlReset,
                    itemButton,
                    action.tone === "danger" ? "hover:bg-pui-danger hover:text-pui-danger-foreground" : "hover:bg-pui-background/12",
                  )}
                >
                  {action.icon ? (
                    <span aria-hidden="true" className={cn(blockReset, "inline-flex size-4 items-center justify-center [&>svg]:size-4", action.tone === "danger" && "text-pui-danger")}>
                      {action.icon}
                    </span>
                  ) : null}
                  <span className={cn(blockReset, action.icon && "max-sm:sr-only")} aria-hidden={action.icon ? true : undefined}>
                    {action.label}
                  </span>
                </button>
              ))}
              {overflow.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label="More actions" className={cn(controlReset, itemButton, "px-2 hover:bg-pui-background/12 data-[state=open]:bg-pui-background/12")}>
                    <EllipsisIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end">
                    {overflow.map((action) => (
                      <DropdownMenuItem key={action.id} icon={action.icon} tone={action.tone} disabled={action.disabled} onSelect={action.onClick}>
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <span aria-hidden="true" className={cn(blockReset, "mx-1 h-5 w-px shrink-0 bg-pui-background/20")} />
              <button type="button" aria-label="Clear selection" onClick={onClear} className={cn(controlReset, itemButton, "gap-1 px-2 text-pui-background/70 hover:bg-pui-background/12 hover:text-pui-background")}>
                <XIcon className="size-4" />
                <span aria-hidden="true" className={cn(blockReset, "hidden rounded-pui-sm border border-pui-background/25 px-1 text-[0.625rem] leading-4 sm:inline")}>
                  Esc
                </span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span role="status" aria-live="polite" className={cn(blockReset, "sr-only")}>
        {status}
      </span>
    </>
  );
});
