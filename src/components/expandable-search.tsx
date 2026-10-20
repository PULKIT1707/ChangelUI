"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { XIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ExpandableSearchProps
  extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "onSubmit" | "defaultValue" | "children"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Enter in the field, or picking a suggestion. */
  onSubmit?: (value: string) => void;
  /** Default "Search". */
  placeholder?: string;
  /** Expanded width in px. Default 240. */
  width?: number;
  /** Default "md" (36px). */
  size?: "sm" | "md" | "lg";
  /** Recent searches or quick links shown under the field while it's focused. */
  suggestions?: string[];
  /** Heading above the suggestions. Default "Recent". */
  suggestionsLabel?: string;
  /** A single key (e.g. "/") that expands and focuses the field from anywhere on the page. */
  shortcut?: string;
  /** Collapse when focus leaves an empty field. Default true. */
  collapseOnBlur?: boolean;
  /** Accessible name of the toggle and the field. Default "Search". */
  label?: string;
  /** Accessible name of the close button. Default "Close search". */
  closeLabel?: string;
  /** Props for the input element. */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange">;
}

const heights = { sm: 32, md: 36, lg: 44 } as const;
const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" } as const;

function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * A search icon that morphs into a full field, for toolbars and headers where space is tight.
 * The width springs open, focus moves into the field, Escape clears then collapses, and an
 * optional list of recent searches drops in under it.
 */
export const ExpandableSearch = React.forwardRef<HTMLDivElement, ExpandableSearchProps>(function ExpandableSearch(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    expanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    onSubmit,
    placeholder = "Search",
    width = 240,
    size = "md",
    suggestions,
    suggestionsLabel = "Recent",
    shortcut,
    collapseOnBlur = true,
    label = "Search",
    closeLabel = "Close search",
    inputProps,
    className,
    style,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const [expanded, setExpanded] = useControllableState({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
    name: "expanded",
  });
  const [focused, setFocused] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const pendingFocus = React.useRef<"input" | "toggle" | null>(null);
  const height = heights[size];

  const matches = React.useMemo(() => {
    if (!suggestions?.length) return [];
    const q = value.trim().toLowerCase();
    return (q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions).slice(0, 6);
  }, [suggestions, value]);
  const listOpen = expanded && focused && matches.length > 0;

  const open = React.useCallback(() => {
    pendingFocus.current = "input";
    setExpanded(true);
    inputRef.current?.focus();
  }, [setExpanded]);

  const close = React.useCallback(
    (returnFocus: boolean) => {
      setValue("");
      setActive(-1);
      setExpanded(false);
      if (returnFocus) {
        pendingFocus.current = "toggle";
        toggleRef.current?.focus();
      }
    },
    [setExpanded, setValue],
  );

  // Focus after the input mounts (opening) or after it unmounts (closing).
  React.useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "input" && expanded) inputRef.current?.focus();
    if (target === "toggle" && !expanded) toggleRef.current?.focus();
  }, [expanded]);

  const latest = useLatestRef({ open, shortcut });
  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== latest.current.shortcut || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      latest.current.open();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latest, shortcut]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    onSubmit?.(text);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    inputProps?.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (active >= 0) setActive(-1);
      else if (value) setValue("");
      else close(true);
    } else if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = active >= 0 ? matches[active] : undefined;
      if (picked !== undefined) {
        setValue(picked);
        setActive(-1);
        submit(picked);
      } else submit(value);
    }
  };

  const widthTransition = reduced ? { duration: 0 } : springs.layout;
  const iconSize = size === "lg" ? "size-5" : "size-4";

  return (
    <motion.div
      ref={mergedRef}
      role="search"
      data-state={expanded ? "expanded" : "collapsed"}
      initial={false}
      animate={{ width: expanded ? width : height }}
      transition={widthTransition}
      {...props}
      onBlur={(event) => {
        onBlur?.(event);
        const next = event.relatedTarget as Node | null;
        if (next && rootRef.current?.contains(next)) return;
        setFocused(false);
        setActive(-1);
        if (collapseOnBlur && expanded && !value) close(false);
      }}
      style={{ height, ...style }}
      className={cn(
        blockReset,
        "relative inline-flex max-w-full shrink-0 items-center rounded-full border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm transition-[border-color,box-shadow] duration-(--pui-duration-base) focus-within:border-pui-ring focus-within:shadow-pui-md",
        textSizes[size],
        className,
      )}
    >
      <motion.button
        ref={toggleRef}
        type="button"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={inputId}
        tabIndex={expanded ? -1 : 0}
        onClick={() => (expanded ? inputRef.current?.focus() : open())}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        transition={springs.press}
        style={{ width: height - 2, height: height - 2 }}
        className={cn(
          controlReset,
          "grid shrink-0 cursor-pointer place-items-center rounded-full text-pui-muted-foreground transition-colors hover:text-pui-foreground",
          expanded && "cursor-text",
          focusRing,
        )}
      >
        <motion.span
          className={cn(blockReset, "grid place-items-center")}
          initial={false}
          animate={{ rotate: expanded && !reduced ? -12 : 0, scale: expanded ? 0.92 : 1 }}
          transition={springs.bouncy}
        >
          <SearchGlyph aria-hidden="true" className={iconSize} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="field"
            className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-1 pe-1")}
            initial={{ opacity: 0, x: reduced ? 0 : -6 }}
            animate={{ opacity: 1, x: 0, transition: { delay: reduced ? 0 : 0.06, duration: 0.18, ease: easings.out } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              role="combobox"
              aria-label={label}
              aria-autocomplete={suggestions ? "list" : "none"}
              aria-expanded={listOpen}
              aria-controls={suggestions ? listId : undefined}
              aria-activedescendant={listOpen && active >= 0 ? `${id}-opt-${active}` : undefined}
              autoComplete="off"
              enterKeyHint="search"
              placeholder={placeholder}
              {...inputProps}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setActive(-1);
              }}
              onFocus={(event) => {
                inputProps?.onFocus?.(event);
                setFocused(true);
              }}
              onKeyDown={onKeyDown}
              className={cn(
                controlReset,
                "h-full min-w-0 flex-1 bg-transparent text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground [&::-webkit-search-cancel-button]:hidden",
                inputProps?.className,
              )}
            />
            {shortcut && !value ? (
              <kbd
                aria-hidden="true"
                className={cn(
                  blockReset,
                  "pointer-events-none hidden rounded-pui-sm border border-pui-border bg-pui-muted px-1.5 font-mono text-[0.7rem] leading-5 text-pui-muted-foreground sm:inline-block",
                )}
              >
                {shortcut}
              </kbd>
            ) : null}
            <motion.button
              type="button"
              aria-label={closeLabel}
              onClick={() => close(true)}
              initial={false}
              whileTap={reduced ? undefined : { scale: 0.85 }}
              transition={springs.press}
              className={cn(
                controlReset,
                "grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
                focusRing,
              )}
            >
              <XIcon aria-hidden="true" className="size-3.5" />
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {listOpen ? (
          <motion.div
            key="list"
            className={cn(
              blockReset,
              "absolute inset-x-0 top-full z-(--pui-z-popover) mt-2 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-1 text-pui-surface-foreground shadow-pui-lg",
            )}
            style={{ transformOrigin: "top" }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={reduced ? { duration: 0.12 } : springs.snappy}
          >
            <p className={cn(blockReset, "px-2 pt-1 pb-1 text-[0.7rem] font-medium uppercase tracking-wide text-pui-muted-foreground")}>
              {suggestionsLabel}
            </p>
            <ul id={listId} role="listbox" aria-label={suggestionsLabel} className={cn(listReset)}>
              {matches.map((text, i) => (
                <motion.li
                  key={text}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  initial={reduced ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : i * 0.025, duration: 0.16, ease: easings.out }}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => {
                    setValue(text);
                    setActive(-1);
                    submit(text);
                  }}
                  className={cn(
                    blockReset,
                    "relative flex cursor-pointer items-center gap-2 rounded-pui-md px-2 py-1.5 text-pui-foreground",
                  )}
                >
                  {i === active ? (
                    <motion.span
                      layoutId={reduced ? undefined : `${id}-highlight`}
                      aria-hidden="true"
                      className={cn(blockReset, "absolute inset-0 -z-0 rounded-pui-md bg-pui-muted")}
                      transition={springs.snappy}
                    />
                  ) : null}
                  <SearchGlyph aria-hidden="true" className="relative size-3.5 text-pui-muted-foreground" />
                  <span className={cn(blockReset, "relative truncate")}>{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
});
