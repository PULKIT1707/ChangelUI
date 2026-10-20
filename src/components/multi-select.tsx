"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { invalidClasses } from "../lib/field-styles";
import { useFormReset } from "../lib/form";
import { ChevronDownIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import {
  ListOptionRow,
  ListboxPopup,
  OptionHighlight,
  defaultOptionFilter,
  foldText,
  groupLabelClasses,
  groupOptions,
  labelOf,
  normalizeOptions,
  optionClasses,
  optionId,
  scrollOptionIntoView,
  type ListOption,
  type ListOptionInput,
  type OptionRenderState,
} from "../lib/listbox";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, textSize } from "../lib/styles";
import type { MotionSafeHTMLProps, Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Chip } from "./chip";

export type MultiSelectOption = ListOption;
export type MultiSelectOptionInput = ListOptionInput;

export interface MultiSelectProps
  extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  /** Strings or { value, label, description, icon, group, keywords, disabled }. */
  options: readonly MultiSelectOptionInput[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Most values that can be picked; further options are disabled until one is removed. */
  max?: number;
  /** Chips shown before a "+N" chip. Default: all. */
  maxVisibleChips?: number;
  /** Accessible name of each chip's remove button. Default (label) => `Remove ${label}`. */
  removeLabel?: (label: string) => string;
  /** Default "Search…" (shown while nothing is picked; "Add more…" after). */
  placeholder?: string;
  /** Default "md". */
  size?: Size;
  /** Chip tone. Default "primary". */
  tone?: Tone;
  disabled?: boolean;
  invalid?: boolean;
  /** One form input per value with this name. */
  name?: string;
  /** Return true to keep an option for the query; false shows options as given. */
  filter?: ((option: MultiSelectOption, query: string) => boolean) | false;
  /** Default "No results". */
  emptyLabel?: React.ReactNode;
  /** Offer to add the typed text as a new value. */
  creatable?: boolean;
  onCreate?: (input: string) => void;
  /** Close the list after each pick. Default false. */
  closeOnSelect?: boolean;
  /** Footer with the count and a "Clear" action while something is picked. Default true. */
  showFooter?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderOption?: (option: MultiSelectOption, state: OptionRenderState) => React.ReactNode;
  /** Props for the inner text input (id for a <label htmlFor>, aria-label, ...). */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size">;
  /** Classes for the popup surface. */
  contentClassName?: string;
}

const CREATE = "\u0000create";
const minHeights: Record<Size, string> = { sm: "min-h-8 gap-1 p-1 ps-1.5", md: "min-h-9 gap-1 p-1 ps-1.5", lg: "min-h-11 gap-1.5 p-1.5 ps-2" };

/**
 * Multiple choice combobox (roadmap W2): picked values become removable chips inside the field that
 * pop in and reflow on a layout spring, with a "+N" overflow chip, a max limit, Backspace to remove
 * the last chip and a multiselectable listbox with animated checkboxes.
 */
export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(function MultiSelect(
  {
    options: optionsProp,
    value: valueProp,
    defaultValue,
    onValueChange,
    max,
    maxVisibleChips,
    removeLabel = (label) => `Remove ${label}`,
    placeholder = "Search…",
    size = "md",
    tone = "primary",
    disabled = false,
    invalid = false,
    name,
    filter = defaultOptionFilter,
    emptyLabel = "No results",
    creatable = false,
    onCreate,
    closeOnSelect = false,
    showFooter = true,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    renderOption,
    inputProps,
    contentClassName,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const rootId = `pui-ms-${toIdPart(React.useId())}`;
  const listId = `${rootId}-list`;
  const reduced = usePrefersReducedMotion();
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(fieldRef, ref), [ref]);
  const options = React.useMemo(() => normalizeOptions(optionsProp), [optionsProp]);
  const [value, setValue] = useControllableState<string[]>({
    value: valueProp,
    defaultValue: defaultValue ?? [],
    onChange: onValueChange,
  });
  const [open, setOpenState] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [input, setInput] = React.useState("");
  const [activeChoice, setActiveChoice] = React.useState<string | null>(null);
  useFormReset(fieldRef, () => setValue(defaultValue ?? []));

  const atMax = max !== undefined && value.length >= max;
  const query = input;
  const filtered = filter === false || !query.trim() ? options : options.filter((option) => filter(option, query));
  const trimmed = input.trim();
  const exact = options.some((o) => foldText(labelOf(o)) === foldText(trimmed));
  const showCreate = creatable && trimmed !== "" && !exact && !atMax;
  const blocked = (option: ListOption) => option.disabled === true || (atMax && !value.includes(option.value));
  const navigable = [...filtered.filter((o) => !blocked(o)).map((o) => o.value), ...(showCreate ? [CREATE] : [])];
  const active =
    activeChoice !== null && navigable.includes(activeChoice) ? activeChoice : trimmed ? (navigable[0] ?? null) : null;
  const idFor = (v: string) => (v === CREATE ? `${rootId}-create` : optionId(rootId, v));

  const labelFor = (v: string) => {
    const option = options.find((o) => o.value === v);
    return option ? labelOf(option) : v;
  };

  const setOpen = (next: boolean) => {
    if (next && disabled) return;
    if (!next) setActiveChoice(null);
    setOpenState(next);
  };

  const toggle = (v: string) => {
    if (v === CREATE) {
      onCreate?.(trimmed);
      if (!value.includes(trimmed)) setValue([...value, trimmed]);
    } else if (value.includes(v)) setValue(value.filter((x) => x !== v));
    else if (!atMax) setValue([...value, v]);
    setInput("");
    if (closeOnSelect) setOpen(false);
  };

  const remove = (v: string) => {
    setValue(value.filter((x) => x !== v));
    inputRef.current?.focus();
  };

  const move = (delta: number) => {
    if (navigable.length === 0) return;
    const index = active === null ? -1 : navigable.indexOf(active);
    const next = index === -1 ? (delta > 0 ? 0 : navigable.length - 1) : Math.min(Math.max(index + delta, 0), navigable.length - 1);
    const target = navigable[next] ?? null;
    setActiveChoice(target);
    if (target !== null) scrollOptionIntoView(idFor(target));
  };

  const visibleChips = maxVisibleChips !== undefined ? value.slice(0, maxVisibleChips) : value;
  const hidden = value.slice(visibleChips.length);
  const groups = groupOptions(filtered);
  let rowIndex = 0;
  const chipSize = size === "lg" ? "md" : "sm";
  const status = open
    ? `${value.length} selected${max !== undefined ? ` of at most ${max}` : ""}. ${filtered.length} ${filtered.length === 1 ? "option" : "options"}`
    : "";

  return (
    <div
      ref={mergedRef}
      data-state={open ? "open" : "closed"}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      {...props}
      onClick={composeEventHandlers(onClick, (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || (event.target as HTMLElement).closest("button")) return;
        inputRef.current?.focus();
        setOpen(true);
      })}
      className={cn(
        blockReset,
        "relative flex w-full min-w-0 cursor-text flex-wrap items-center rounded-pui-md border border-pui-input bg-transparent text-pui-foreground shadow-pui-xs transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        "focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
        "pe-9",
        minHeights[size],
        textSize[size],
        disabled && "pointer-events-none opacity-50",
        invalid && invalidClasses,
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visibleChips.map((v) => (
          <Chip
            key={v}
            size={chipSize}
            tone={tone}
            variant="soft"
            onRemove={() => remove(v)}
            removeLabel={removeLabel(labelFor(v))}
            disabled={disabled}
            className="max-w-[12rem]"
          >
            <span className={cn(blockReset, "truncate")}>{labelFor(v)}</span>
          </Chip>
        ))}
        {hidden.length > 0 ? (
          <Chip
            key="\u0000more"
            size={chipSize}
            variant="outline"
            tone="neutral"
            title={hidden.map(labelFor).join(", ")}
            aria-label={`${hidden.length} more: ${hidden.map(labelFor).join(", ")}`}
            className="tabular-nums"
          >
            +{hidden.length}
          </Chip>
        ) : null}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active !== null ? idFor(active) : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={value.length > 0 ? "Add more…" : placeholder}
        {...inputProps}
        value={input}
        onChange={(event) => {
          setInput(event.target.value);
          setActiveChoice(null);
          if (!open) setOpen(true);
        }}
        onBlur={(event) => {
          inputProps?.onBlur?.(event);
          if (open) setOpen(false);
          setInput("");
        }}
        onKeyDown={(event) => {
          inputProps?.onKeyDown?.(event);
          if (event.defaultPrevented || event.nativeEvent.isComposing) return;
          const { key } = event;
          if (key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            else move(1);
          } else if (key === "ArrowUp") {
            event.preventDefault();
            if (open) move(-1);
          } else if (key === "Enter") {
            if (!open) return;
            event.preventDefault();
            if (active !== null) toggle(active);
          } else if (key === "Backspace" && input === "" && value.length > 0) {
            event.preventDefault();
            setValue(value.slice(0, -1));
          } else if (key === "Tab" && open) {
            setOpen(false);
          }
        }}
        className={cn(
          controlReset,
          "h-7 min-w-[6ch] flex-1 bg-transparent px-1.5 text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground",
          inputProps?.className,
        )}
      />
      {name !== undefined ? value.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
      <motion.span
        aria-hidden="true"
        animate={{ rotate: open && !reduced ? 180 : 0 }}
        transition={springs.snappy}
        className={cn(blockReset, "pointer-events-none absolute end-2.5 top-1/2 -mt-2 inline-flex text-pui-muted-foreground")}
      >
        <ChevronDownIcon className="size-4" />
      </motion.span>
      <span role="status" className="sr-only">
        {status}
      </span>
      <ListboxPopup
        open={open}
        anchorRef={fieldRef}
        onEscape={() => {
          setOpen(false);
          inputRef.current?.focus();
        }}
        onOutside={() => setOpen(false)}
        animateHeight
        reduced={reduced}
        className={contentClassName}
        listProps={{
          id: listId,
          role: "listbox",
          "aria-multiselectable": true,
          "aria-label": inputProps?.["aria-label"] ?? props["aria-label"] ?? "Options",
        }}
        footer={
          showFooter && value.length > 0 ? (
            <div
              className={cn(
                blockReset,
                "flex items-center justify-between gap-3 border-t border-pui-border px-3 py-1.5 text-xs text-pui-muted-foreground",
              )}
            >
              <span className={cn(blockReset, "tabular-nums")}>
                {value.length}
                {max !== undefined ? ` / ${max}` : ""} selected{atMax ? " · limit reached" : ""}
              </span>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setValue([]);
                  inputRef.current?.focus();
                }}
                className={cn(
                  controlReset,
                  focusRing,
                  "cursor-pointer rounded-pui-sm px-1.5 py-0.5 font-medium text-pui-foreground hover:bg-pui-muted",
                )}
              >
                Clear
              </button>
            </div>
          ) : null
        }
      >
        {groups.map((group, groupIndex) => {
          const rows = group.options.map((option) => {
            const index = rowIndex++;
            const selected = value.includes(option.value);
            return (
              <ListOptionRow
                key={option.value}
                id={optionId(rootId, option.value)}
                option={blocked(option) && !option.disabled ? { ...option, disabled: true } : option}
                query={query}
                active={active === option.value}
                selected={selected}
                ariaSelected={selected}
                indicator="checkbox"
                index={index}
                layoutId={`${rootId}-hl`}
                reduced={reduced}
                onHover={() => setActiveChoice(option.value)}
                onPick={() => toggle(option.value)}
                render={renderOption}
              />
            );
          });
          if (!group.group) return <React.Fragment key={`g-${groupIndex}`}>{rows}</React.Fragment>;
          const headingId = `${rootId}-g${groupIndex}`;
          return (
            <div key={`g-${group.group}`} role="group" aria-labelledby={headingId} className={cn(blockReset, "flex flex-col")}>
              <div id={headingId} className={cn(blockReset, groupLabelClasses)}>
                {group.group}
              </div>
              {rows}
            </div>
          );
        })}
        {showCreate ? (
          <div
            id={`${rootId}-create`}
            role="option"
            aria-selected={false}
            data-highlighted={active === CREATE ? "" : undefined}
            onPointerMove={() => {
              if (active !== CREATE) setActiveChoice(CREATE);
            }}
            onClick={() => toggle(CREATE)}
            className={cn(blockReset, optionClasses, "text-pui-primary-text")}
          >
            {active === CREATE ? <OptionHighlight layoutId={`${rootId}-hl`} reduced={reduced} /> : null}
            <span
              aria-hidden="true"
              className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center rounded-pui-sm bg-pui-primary/15 text-xs font-semibold")}
            >
              +
            </span>
            <span className={cn(blockReset, "truncate")}>Add “{trimmed}”</span>
          </div>
        ) : null}
        {filtered.length === 0 && !showCreate ? (
          <div className={cn(blockReset, "px-2.5 py-6 text-center text-sm text-pui-muted-foreground")}>{emptyLabel}</div>
        ) : null}
      </ListboxPopup>
    </div>
  );
});
