"use client";

// Shared internals for Select, Combobox and MultiSelect (roadmap W2 lib/listbox): option ids for
// aria-activedescendant, typeahead, text matching with highlight ranges, and the positioned
// listbox popup (portal, layer, flip/shift, width matching and an animated height).
// Focus never moves into the popup: the trigger or input keeps it and points at the active
// option, so options prevent mousedown.

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import * as React from "react";
import { cn } from "./cn";
import { composeEventHandlers, mergeRefs } from "./compose";
import { toIdPart } from "./ids";
import { useLayer } from "./layers";
import { easings, springs } from "./motion";
import { Portal } from "./portal";
import { usePosition } from "./position";
import { blockReset } from "./styles";
import type { Align, MotionSafeHTMLProps, Side } from "./types";
import { useIsomorphicLayoutEffect, useLatestRef } from "./use-latest-ref";

/** Deterministic option id, so server HTML, activedescendant and lookups agree without registration. */
export function optionId(rootId: string, value: string): string {
  return `${rootId}-o-${toIdPart(value)}`;
}

export interface TypeaheadOption {
  value: string;
  text: string;
  disabled?: boolean;
}

/**
 * Typeahead over option text (APG): characters typed within 500ms build a prefix; repeating one
 * character cycles through the options that start with it. Returns the matched value or null.
 */
export function useTypeahead(timeoutMs = 500) {
  const buffer = React.useRef("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return React.useCallback(
    (char: string, options: readonly TypeaheadOption[], current: string | null): string | null => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        buffer.current = "";
      }, timeoutMs);
      const next = buffer.current + char.toLowerCase();
      buffer.current = next;
      const repeated = next.length > 1 && next.split("").every((c) => c === next[0]);
      const query = repeated ? next.charAt(0) : next;
      const enabled = options.filter((o) => !o.disabled);
      const index = enabled.findIndex((o) => o.value === current);
      // A growing prefix may keep the current option; a fresh or repeated character moves past it.
      const startAt = index === -1 ? 0 : index + (!repeated && next.length > 1 ? 0 : 1);
      const ordered = [...enabled.slice(startAt), ...enabled.slice(0, startAt)];
      const match = ordered.find((o) => o.text.trim().toLowerCase().startsWith(query));
      return match?.value ?? null;
    },
    [timeoutMs],
  );
}

/** True when a keydown should feed typeahead (one printable character, no modifiers). */
export function isTypeaheadKey(event: React.KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ";
}

/** Lowercase, accent-free text for matching ("Café" matches "cafe"). */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Start/end of the query inside the text (accent- and case-insensitive), or null. */
export function matchRange(text: string, query: string): [number, number] | null {
  const q = foldText(query.trim());
  if (!q) return null;
  const index = foldText(text).indexOf(q);
  return index === -1 ? null : [index, index + q.length];
}

/** Text with the matched part emphasized. */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range[0])}
      <mark className={cn(blockReset, "rounded-[2px] bg-pui-primary/15 px-0 font-semibold text-inherit")}>
        {text.slice(range[0], range[1])}
      </mark>
      {text.slice(range[1])}
    </>
  );
}

/** Scrolls an option into view inside its listbox without moving the page. */
export function scrollOptionIntoView(id: string | undefined): void {
  if (!id || typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView?.({ block: "nearest" });
}

/** Shared option row classes; the highlight is a separate layout-animated span. */
export const optionClasses =
  "relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-pui-md px-2.5 py-1.5 text-sm text-pui-surface-foreground outline-hidden aria-disabled:cursor-not-allowed aria-disabled:opacity-45";
export const groupLabelClasses = "select-none px-2.5 pb-1 pt-2 text-xs font-medium text-pui-muted-foreground";
export const separatorClasses = "-mx-1 my-1 h-px bg-pui-border";

/** Sliding highlight behind the active option (one shared layoutId per listbox). */
export function OptionHighlight({ layoutId, reduced }: { layoutId: string; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={reduced ? undefined : layoutId}
      transition={springs.snappy}
      className={cn(blockReset, "absolute inset-0 -z-10 rounded-pui-md bg-pui-muted")}
    />
  );
}

/** Check mark that draws itself in when an option becomes selected. */
export function OptionCheck({ checked, reduced, className }: { checked: boolean; reduced: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn(blockReset, "block size-4 shrink-0 text-pui-primary-text", className)}
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { pathLength: { duration: 0.22, ease: easings.out }, opacity: { duration: 0.08 } }}
      />
    </svg>
  );
}

/** Square checkbox glyph for multi-select options. */
export function OptionCheckbox({ checked, reduced }: { checked: boolean; reduced: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        blockReset,
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-(--pui-duration-fast)",
        checked ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : "border-pui-input bg-pui-background",
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(blockReset, "block size-3")}
        initial={false}
        animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : springs.bouncy}
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </motion.svg>
    </span>
  );
}

export interface ListboxPopupProps extends MotionSafeHTMLProps<HTMLDivElement> {
  open: boolean;
  /** Element the popup is placed against (trigger button or field). */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Elements that count as inside for outside-click dismissal, besides the popup. */
  insideEls?: () => ReadonlyArray<Element | null | undefined>;
  onEscape: () => void;
  onOutside: () => void;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  /** At least as wide as the anchor. Default true. */
  matchWidth?: boolean;
  /** Animate height changes (filtered results). Default false. */
  animateHeight?: boolean;
  reduced: boolean;
  container?: HTMLElement | null;
  /** Props for the scrolling role=listbox element. */
  listProps: React.HTMLAttributes<HTMLDivElement> & { id: string };
  /** Rendered above the list, outside role=listbox (search box, status). */
  header?: React.ReactNode;
  /** Rendered below the list, outside role=listbox. */
  footer?: React.ReactNode;
  listClassName?: string;
}

function PopupImpl({
  anchorRef,
  insideEls,
  onEscape,
  onOutside,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  matchWidth = true,
  animateHeight = false,
  reduced,
  listProps,
  header,
  footer,
  listClassName,
  className,
  style,
  children,
  forwardedRef,
  onMouseDown,
  ...props
}: Omit<ListboxPopupProps, "open" | "container"> & { forwardedRef?: React.Ref<HTMLDivElement> }) {
  const isPresent = useIsPresent();
  const floatingRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useMemo(() => mergeRefs(floatingRef, forwardedRef), [forwardedRef]);
  const position = usePosition({ anchor: anchorRef, floating: floatingRef, open: true, side, align, sideOffset });
  const insideRef = useLatestRef(insideEls);
  const [listHeight, setListHeight] = React.useState<number | null>(null);

  useLayer(isPresent, {
    kind: "popover",
    takesFocus: false,
    onEscape,
    onPointerDownOutside: onOutside,
    contentEls: () => [floatingRef.current, anchorRef.current, ...(insideRef.current?.() ?? [])],
  });

  // Width matching writes a CSS variable straight to the node (no render per resize).
  useIsomorphicLayoutEffect(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!matchWidth || !anchor || !floating) return;
    const apply = () => floating.style.setProperty("--pui-anchor-width", `${anchor.getBoundingClientRect().width}px`);
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [matchWidth, anchorRef]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!animateHeight || reduced || !list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setListHeight(list.offsetHeight));
    observer.observe(list);
    return () => observer.disconnect();
  }, [animateHeight, reduced]);

  const origin =
    position.side === "top" ? "bottom" : position.side === "left" ? "right" : position.side === "right" ? "left" : "top";
  const { className: listClass, ...restList } = listProps;

  return (
    <motion.div
      ref={ref}
      data-state={isPresent ? "open" : "closed"}
      data-side={position.side}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : position.side === "top" ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.97, transition: { duration: 0.1, ease: easings.inQuint } }}
      transition={{ duration: 0.14, ease: easings.out }}
      {...props}
      // Focus stays on the trigger or input: clicks on options and the scrollbar must not take it.
      onMouseDown={composeEventHandlers(onMouseDown, (event: React.MouseEvent<HTMLDivElement>) => event.preventDefault())}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        visibility: position.ready ? undefined : "hidden",
        transformOrigin: `${origin} ${align === "end" ? "right" : align === "center" ? "center" : "left"}`,
        ...style,
      }}
      className={cn(
        blockReset,
        "z-(--pui-z-popover) flex max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg backdrop-blur-(--pui-surface-blur)",
        matchWidth && "min-w-(--pui-anchor-width)",
        className,
      )}
    >
      {header}
      <motion.div
        initial={false}
        animate={animateHeight && !reduced && listHeight !== null ? { height: listHeight } : undefined}
        transition={springs.layout}
        className={cn(blockReset, "min-h-0 overflow-hidden")}
      >
        <div
          ref={listRef}
          {...restList}
          className={cn(
            blockReset,
            "isolate max-h-[min(18rem,calc(100vh-6rem))] overflow-y-auto overscroll-contain p-1 outline-hidden",
            listClassName,
            listClass,
          )}
        >
          {children}
        </div>
      </motion.div>
      {footer}
    </motion.div>
  );
}

/** Portaled, positioned listbox surface; mounts only while open and animates out. */
export const ListboxPopup = React.forwardRef<HTMLDivElement, ListboxPopupProps>(function ListboxPopup(
  { open, container, ...props },
  ref,
) {
  return (
    <Portal container={container}>
      <AnimatePresence>{open ? <PopupImpl key="listbox" {...props} forwardedRef={ref} /> : null}</AnimatePresence>
    </Portal>
  );
});

/** Data-driven option used by Combobox and MultiSelect. */
export interface ListOption {
  value: string;
  /** Shown text; default the value. */
  label?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Options with the same group render under one heading, in order of first appearance. */
  group?: string;
  /** Extra search terms. */
  keywords?: readonly string[];
}

export type ListOptionInput = string | ListOption;

export function normalizeOptions(options: readonly ListOptionInput[]): ListOption[] {
  return options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
}

export const labelOf = (option: ListOption): string => option.label ?? option.value;

/** Default filter: accent- and case-insensitive substring of the label or a keyword. */
export function defaultOptionFilter(option: ListOption, query: string): boolean {
  if (!query.trim()) return true;
  if (matchRange(labelOf(option), query)) return true;
  return (option.keywords ?? []).some((keyword) => matchRange(keyword, query) !== null);
}

export function groupOptions(options: readonly ListOption[]): { group: string | undefined; options: ListOption[] }[] {
  const groups: { group: string | undefined; options: ListOption[] }[] = [];
  for (const option of options) {
    let bucket = groups.find((g) => g.group === option.group);
    if (!bucket) {
      bucket = { group: option.group, options: [] };
      groups.push(bucket);
    }
    bucket.options.push(option);
  }
  return groups;
}

export interface OptionRenderState {
  selected: boolean;
  active: boolean;
  query: string;
}

export interface ListOptionRowProps {
  id: string;
  option: ListOption;
  query: string;
  active: boolean;
  selected: boolean;
  /** check: single selection; checkbox: multiple. */
  indicator: "check" | "checkbox";
  /** Entrance stagger slot (capped at 8). */
  index: number;
  layoutId: string;
  reduced: boolean;
  /** aria-selected: the active option (single combobox) or the chosen state (multiselectable). */
  ariaSelected: boolean;
  onHover: () => void;
  onPick: () => void;
  render?: (option: ListOption, state: OptionRenderState) => React.ReactNode;
}

/** One data-driven option row with the sliding highlight, match emphasis and a check or checkbox. */
export function ListOptionRow({
  id,
  option,
  query,
  active,
  selected,
  indicator,
  index,
  layoutId,
  reduced,
  ariaSelected,
  onHover,
  onPick,
  render,
}: ListOptionRowProps) {
  const disabled = option.disabled === true;
  return (
    <motion.div
      id={id}
      role="option"
      aria-selected={ariaSelected}
      aria-disabled={disabled || undefined}
      data-value={option.value}
      data-highlighted={active ? "" : undefined}
      data-state={selected ? "checked" : "unchecked"}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: easings.out, delay: Math.min(index, 8) * 0.02 }}
      onPointerMove={() => {
        if (!disabled && !active) onHover();
      }}
      onClick={() => {
        if (!disabled) onPick();
      }}
      className={cn(blockReset, optionClasses)}
    >
      {active ? <OptionHighlight layoutId={layoutId} reduced={reduced} /> : null}
      {indicator === "checkbox" ? <OptionCheckbox checked={selected} reduced={reduced} /> : null}
      {render ? (
        render(option, { selected, active, query })
      ) : (
        <>
          {option.icon ? (
            <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 text-pui-muted-foreground [&_svg]:size-4")}>
              {option.icon}
            </span>
          ) : null}
          <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
            <span className={cn(blockReset, "truncate")}>
              <HighlightedText text={labelOf(option)} query={query} />
            </span>
            {option.description ? (
              <span className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>{option.description}</span>
            ) : null}
          </span>
        </>
      )}
      {indicator === "check" ? <OptionCheck checked={selected} reduced={reduced} className="ms-auto" /> : null}
    </motion.div>
  );
}

/** Small spinner for loading rows. */
export function LoadingGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={cn(blockReset, "block size-4 shrink-0 animate-spin motion-reduce:animate-none", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
