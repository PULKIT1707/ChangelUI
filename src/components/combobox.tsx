"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { ChevronDownIcon, XIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import {
  ListOptionRow,
  ListboxPopup,
  LoadingGlyph,
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
import type { Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type ComboboxOption = ListOption;
export type ComboboxOptionInput = ListOptionInput;
export type ComboboxOptionState = OptionRenderState;

export interface ComboboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size" | "children"> {
  /** Strings or { value, label, description, icon, group, keywords, disabled }. */
  options: readonly ComboboxOptionInput[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, option: ComboboxOption | null) => void;
  /** The text in the field. */
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (input: string) => void;
  /** Return true to keep an option for the query; false shows options as given (filter them yourself, e.g. async). */
  filter?: ((option: ComboboxOption, query: string) => boolean) | false;
  /** Shows a loading row instead of the empty state. */
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  /** Default "No results". */
  emptyLabel?: React.ReactNode;
  /** Offer to create the typed text when nothing matches it exactly. */
  creatable?: boolean;
  /** Called with the typed text when the create row is picked; the text becomes the value. */
  onCreate?: (input: string) => void;
  /** Default (input) => `Create "input"`. */
  createLabel?: (input: string) => React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Open the list when the field gains focus. Default false. */
  openOnFocus?: boolean;
  /** Default "md". */
  size?: Size;
  invalid?: boolean;
  /** Show a clear button while the field has text. Default true. */
  clearable?: boolean;
  /** Most options rendered at once (the rest are reachable by typing). */
  limit?: number;
  /** Custom option content (the highlight and check are kept). */
  renderOption?: (option: ComboboxOption, state: ComboboxOptionState) => React.ReactNode;
  /** Icon at the start of the field. */
  leadingIcon?: React.ReactNode;
  /** Classes for the field wrapper. */
  wrapperClassName?: string;
  /** Classes for the popup surface. */
  contentClassName?: string;
  /** Accessible names. */
  clearLabel?: string;
  toggleLabel?: string;
}

const CREATE = "\u0000create";
const heights: Record<Size, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<Size, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const padLead: Record<Size, string> = { sm: "ps-8", md: "ps-9", lg: "ps-10" };
const buttonSize: Record<Size, string> = { sm: "size-6", md: "size-7", lg: "size-8" };

/**
 * Autocomplete (roadmap W2): APG combobox with a listbox popup. Typing filters (accent-insensitive,
 * matches emphasized), the list height springs as results change and new results fade in staggered.
 * Supports async results (filter={false} + loading), groups, an empty state and a create row.
 * Focus stays in the input; the active option is announced through aria-activedescendant.
 */
export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    options: optionsProp,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    inputValue: inputProp,
    defaultInputValue,
    onInputValueChange,
    filter = defaultOptionFilter,
    loading = false,
    loadingLabel = "Loading…",
    emptyLabel = "No results",
    creatable = false,
    onCreate,
    createLabel = (input) => `Create “${input}”`,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    openOnFocus = false,
    size = "md",
    invalid = false,
    clearable = true,
    limit,
    renderOption,
    leadingIcon,
    wrapperClassName,
    contentClassName,
    clearLabel = "Clear",
    toggleLabel = "Show suggestions",
    disabled = false,
    name,
    placeholder = "Search…",
    className,
    onKeyDown,
    onBlur,
    onFocus,
    ...inputProps
  },
  ref,
) {
  const rootId = `pui-cbx-${toIdPart(React.useId())}`;
  const listId = `${rootId}-list`;
  const statusId = `${rootId}-status`;
  const reduced = usePrefersReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const options = React.useMemo(() => normalizeOptions(optionsProp), [optionsProp]);

  const [value, setValueState] = useControllableState<string | null>({ value: valueProp, defaultValue });
  const selectedOption = value === null ? null : (options.find((o) => o.value === value) ?? { value, label: value });
  const [input, setInput] = useControllableState<string>({
    value: inputProp,
    defaultValue: () => defaultInputValue ?? (selectedOption ? labelOf(selectedOption) : ""),
    onChange: onInputValueChange,
  });
  const [open, setOpenState] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [dirty, setDirty] = React.useState(false);
  const [activeChoice, setActiveChoice] = React.useState<string | null>(null);

  // Until the user types, the field mirrors the selected option's label (also when value is controlled).
  const text = !dirty && inputProp === undefined && selectedOption ? labelOf(selectedOption) : input;
  const query = dirty ? input : "";
  const filtered = filter === false || !query.trim() ? options : options.filter((option) => filter(option, query));
  const shown = limit !== undefined ? filtered.slice(0, limit) : filtered;
  const trimmed = input.trim();
  const exact = options.some((o) => foldText(labelOf(o)) === foldText(trimmed));
  const showCreate = creatable && dirty && trimmed !== "" && !exact && !loading;
  const navigable = [...shown.filter((o) => !o.disabled).map((o) => o.value), ...(showCreate ? [CREATE] : [])];
  const active =
    activeChoice !== null && navigable.includes(activeChoice)
      ? activeChoice
      : dirty && trimmed
        ? (navigable[0] ?? null)
        : value !== null && navigable.includes(value)
          ? value
          : null;
  const idFor = (v: string) => (v === CREATE ? `${rootId}-create` : optionId(rootId, v));
  const activeId = open && active !== null ? idFor(active) : undefined;

  const setOpen = (next: boolean) => {
    if (next && disabled) return;
    if (!next) setActiveChoice(null);
    setOpenState(next);
  };

  const commit = (next: string | null) => {
    if (next === CREATE) {
      onCreate?.(trimmed);
      setValueState(trimmed);
      onValueChange?.(trimmed, { value: trimmed, label: trimmed });
      setInput(trimmed);
    } else {
      const option = next === null ? null : (options.find((o) => o.value === next) ?? null);
      setValueState(next);
      onValueChange?.(next, option);
      setInput(option ? labelOf(option) : "");
    }
    setDirty(false);
    setOpen(false);
  };

  const restore = () => {
    setDirty(false);
    const text = selectedOption ? labelOf(selectedOption) : "";
    if (text !== input) setInput(text);
  };

  const move = (delta: number | "first" | "last") => {
    if (navigable.length === 0) return;
    const index = active === null ? -1 : navigable.indexOf(active);
    const next =
      delta === "first"
        ? 0
        : delta === "last"
          ? navigable.length - 1
          : index === -1
            ? delta > 0
              ? 0
              : navigable.length - 1
            : Math.min(Math.max(index + delta, 0), navigable.length - 1);
    const target = navigable[next] ?? null;
    setActiveChoice(target);
    if (target !== null) scrollOptionIntoView(idFor(target));
  };

  const groups = groupOptions(shown);
  let rowIndex = 0;
  const showEmpty = open && !loading && shown.length === 0 && !showCreate;
  const status = loading
    ? "Loading results"
    : open && dirty
      ? `${shown.length} ${shown.length === 1 ? "result" : "results"}${showCreate ? ", create option available" : ""}`
      : "";

  return (
    <div
      ref={fieldRef}
      data-state={open ? "open" : "closed"}
      data-size={size}
      className={cn(blockReset, "relative flex w-full items-center", wrapperClassName)}
    >
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute start-3 inline-flex text-pui-muted-foreground [&_svg]:size-4")}
        >
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={mergedRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        data-invalid={invalid ? "" : undefined}
        {...inputProps}
        value={text}
        onChange={(event) => {
          setInput(event.target.value);
          setDirty(true);
          setActiveChoice(null);
          if (!open) setOpen(true);
        }}
        onClick={composeEventHandlers(inputProps.onClick, () => {
          if (!open) setOpen(true);
        })}
        onFocus={composeEventHandlers(onFocus, () => {
          if (openOnFocus) setOpen(true);
        })}
        onBlur={composeEventHandlers(onBlur, () => {
          if (open) setOpen(false);
          restore();
        })}
        onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.nativeEvent.isComposing) return;
          const { key } = event;
          if (key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            else if (!event.altKey) move(1);
          } else if (key === "ArrowUp") {
            event.preventDefault();
            if (event.altKey) setOpen(false);
            else if (!open) {
              setOpen(true);
              move("last");
            } else move(-1);
          } else if (open && (key === "PageDown" || key === "PageUp")) {
            event.preventDefault();
            move(key === "PageDown" ? 10 : -10);
          } else if (key === "Enter") {
            if (!open) return;
            event.preventDefault();
            if (active !== null) commit(active);
            else setOpen(false);
          } else if (key === "Escape" && !open) {
            if (text !== "" && clearable) {
              event.preventDefault();
              setInput("");
              setDirty(true);
              if (value !== null) {
                setValueState(null);
                onValueChange?.(null, null);
              }
            }
          } else if (key === "Tab" && open) {
            setOpen(false);
          }
        })}
        className={cn(
          controlReset,
          fieldClasses,
          "shadow-pui-xs",
          heights[size],
          textSize[size],
          leadingIcon ? padLead[size] : padStart[size],
          clearable ? "pe-16" : "pe-9",
          invalid && invalidClasses,
          className,
        )}
      />
      {name !== undefined ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <div className={cn(blockReset, "absolute end-1 flex items-center gap-0.5")}>
        <AnimatePresence initial={false}>
          {clearable && text !== "" && !disabled ? (
            <motion.button
              key="clear"
              type="button"
              tabIndex={-1}
              aria-label={clearLabel}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setInput("");
                setDirty(true);
                setActiveChoice(null);
                if (value !== null) {
                  setValueState(null);
                  onValueChange?.(null, null);
                }
                inputRef.current?.focus();
              }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={springs.snappy}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground",
                buttonSize[size],
              )}
            >
              <XIcon className="size-3.5" />
            </motion.button>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          tabIndex={-1}
          aria-label={toggleLabel}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDirty(false);
            setOpen(!open);
            inputRef.current?.focus();
          }}
          className={cn(
            controlReset,
            "inline-flex cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground disabled:cursor-not-allowed disabled:opacity-50",
            buttonSize[size],
          )}
        >
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open && !reduced ? 180 : 0 }}
            transition={springs.snappy}
            className={cn(blockReset, "inline-flex")}
          >
            <ChevronDownIcon className="size-4" />
          </motion.span>
        </button>
      </div>
      <span id={statusId} role="status" className="sr-only">
        {status}
      </span>
      <ListboxPopup
        open={open}
        anchorRef={fieldRef}
        onEscape={() => {
          setOpen(false);
          restore();
        }}
        onOutside={() => {
          setOpen(false);
          restore();
        }}
        animateHeight
        reduced={reduced}
        className={contentClassName}
        listProps={{ id: listId, role: "listbox", "aria-label": inputProps["aria-label"] ?? "Suggestions" }}
      >
        {groups.map((group, groupIndex) => {
          const rows = group.options.map((option) => {
            const index = rowIndex++;
            return (
              <ListOptionRow
                key={option.value}
                id={optionId(rootId, option.value)}
                option={option}
                query={query}
                active={active === option.value}
                selected={value === option.value}
                ariaSelected={active === option.value}
                indicator="check"
                index={index}
                layoutId={`${rootId}-hl`}
                reduced={reduced}
                onHover={() => setActiveChoice(option.value)}
                onPick={() => commit(option.value)}
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
            aria-selected={active === CREATE}
            data-highlighted={active === CREATE ? "" : undefined}
            onPointerMove={() => {
              if (active !== CREATE) setActiveChoice(CREATE);
            }}
            onClick={() => commit(CREATE)}
            className={cn(blockReset, optionClasses, "text-pui-primary-text")}
          >
            {active === CREATE ? <OptionHighlight layoutId={`${rootId}-hl`} reduced={reduced} /> : null}
            <span
              aria-hidden="true"
              className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center rounded-pui-sm bg-pui-primary/15 text-xs font-semibold")}
            >
              +
            </span>
            <span className={cn(blockReset, "truncate")}>{createLabel(trimmed)}</span>
          </div>
        ) : null}
        {loading ? (
          <div className={cn(blockReset, "flex items-center gap-2 px-2.5 py-2 text-sm text-pui-muted-foreground")}>
            <LoadingGlyph />
            {loadingLabel}
          </div>
        ) : null}
        {showEmpty ? (
          <div className={cn(blockReset, "px-2.5 py-6 text-center text-sm text-pui-muted-foreground")}>{emptyLabel}</div>
        ) : null}
      </ListboxPopup>
    </div>
  );
});
