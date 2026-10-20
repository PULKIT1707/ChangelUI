"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { hiddenInputClasses, useFormReset } from "../lib/form";
import { ChevronDownIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import {
  ListboxPopup,
  OptionCheck,
  OptionHighlight,
  groupLabelClasses,
  isTypeaheadKey,
  optionClasses,
  optionId,
  scrollOptionIntoView,
  separatorClasses,
  useTypeahead,
  type TypeaheadOption,
} from "../lib/listbox";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Align, MotionSafeHTMLProps, Side, Size } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface SelectProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shown while nothing is selected. Default "Select…". */
  placeholder?: string;
  /** Adds a form input with the selected value. */
  name?: string;
  /** The form blocks submit until a value is picked (focuses the trigger). */
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Default "md". */
  size?: Size;
  /** Custom trigger content for the selected value. */
  renderValue?: (value: string, label: React.ReactNode) => React.ReactNode;
  children?: React.ReactNode;
}

export interface SelectTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** Leading icon inside the trigger (the selected item's icon wins). */
  icon?: React.ReactNode;
}

export interface SelectContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Default "bottom" (flips when there is no room). */
  side?: Side;
  /** Default "start". */
  align?: Align;
  /** Default 6 px. */
  sideOffset?: number;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
  /** Classes for the scrolling listbox inside the surface. */
  listClassName?: string;
}

export interface SelectItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value: string;
  disabled?: boolean;
  /** Text for typeahead and the trigger when children are not plain text. */
  textValue?: string;
  /** Leading icon, also shown in the trigger when selected. */
  icon?: React.ReactNode;
  /** Second line under the label. */
  description?: React.ReactNode;
}

export type SelectGroupProps = React.HTMLAttributes<HTMLDivElement>;
export type SelectLabelProps = React.HTMLAttributes<HTMLDivElement>;
export type SelectSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

interface ScannedItem extends TypeaheadOption {
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SelectContextValue {
  rootId: string;
  listId: string;
  value: string | null;
  select: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  active: string | null;
  setActive: (value: string | null) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: ScannedItem[];
  size: Size;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  placeholder: string;
  name?: string;
  reduced: boolean;
  renderValue?: SelectProps["renderValue"];
  resetValue: () => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);
const GroupLabelContext = React.createContext<string | null>(null);

function useSelect(part: string): SelectContextValue {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside Select`);
  return context;
}

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

/** Finds SelectItems in the element tree, so the trigger knows labels before (and without) opening. */
function scanItems(node: React.ReactNode, out: ScannedItem[]): ScannedItem[] {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as Partial<SelectItemProps> & { children?: React.ReactNode };
    if (child.type === SelectItem && typeof props.value === "string") {
      out.push({
        value: props.value,
        text: props.textValue ?? textOf(props.children),
        label: props.children,
        icon: props.icon,
        disabled: props.disabled === true,
      });
      return;
    }
    if (props.children) scanItems(props.children, out);
  });
  return out;
}

/** Enabled options in the open listbox, in DOM order (falls back to the scanned list). */
function liveOptions(listId: string, fallback: ScannedItem[]): TypeaheadOption[] {
  const list = typeof document === "undefined" ? null : document.getElementById(listId);
  if (!list) return fallback;
  return [...list.querySelectorAll<HTMLElement>('[role="option"]')].map((el) => ({
    value: el.dataset.value ?? "",
    text: el.dataset.text ?? el.textContent ?? "",
    disabled: el.getAttribute("aria-disabled") === "true",
  }));
}

const heights: Record<Size, string> = { sm: "h-8 ps-2.5 pe-2", md: "h-9 ps-3 pe-2.5", lg: "h-11 ps-3.5 pe-3" };

/**
 * Styled single select (roadmap W2): APG select-only combobox. The trigger keeps focus and points
 * at the active option; a highlight slides between options, the check draws itself in, and
 * typeahead, Home/End and PageUp/PageDown work open or closed. A hidden input joins forms.
 */
export function Select({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placeholder = "Select…",
  name,
  required = false,
  disabled = false,
  invalid = false,
  size = "md",
  renderValue,
  children,
}: SelectProps) {
  const rootId = `pui-select-${toIdPart(React.useId())}`;
  const reduced = usePrefersReducedMotion();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      if (next !== null) onValueChange?.(next);
    },
  });
  const [open, setOpenState] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [active, setActive] = React.useState<string | null>(null);
  const items = scanItems(children, []);

  const setOpen = (next: boolean) => {
    if (next && disabled) return;
    if (next) {
      const selected = items.find((item) => item.value === value && !item.disabled);
      setActive(selected?.value ?? items.find((item) => !item.disabled)?.value ?? null);
    }
    setOpenState(next);
  };

  const context: SelectContextValue = {
    rootId,
    listId: `${rootId}-list`,
    value,
    select: (next) => {
      setValue(next);
      setOpenState(false);
    },
    open,
    setOpen,
    active,
    setActive,
    triggerRef,
    items,
    size,
    disabled,
    invalid,
    required,
    placeholder,
    name,
    reduced,
    renderValue,
    resetValue: () => setValue(defaultValue),
  };

  return <SelectContext.Provider value={context}>{children}</SelectContext.Provider>;
}

/** The field-styled button (role="combobox") that shows the value and opens the list. */
export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(function SelectTrigger(
  { icon, className, onClick, onKeyDown, onKeyUp, onBlur, children, ...props },
  ref,
) {
  const select = useSelect("SelectTrigger");
  const typeahead = useTypeahead();
  const lastTypeRef = React.useRef(0);
  const mergedRef = React.useMemo(() => mergeRefs(select.triggerRef, ref), [select.triggerRef, ref]);
  useFormReset(select.triggerRef, select.resetValue);

  const selected = select.items.find((item) => item.value === select.value);
  const hasValue = select.value !== null;
  const activeId = select.open && select.active !== null ? optionId(select.rootId, select.active) : undefined;

  const moveTo = (next: string | null | undefined) => {
    if (next === null || next === undefined) return;
    select.setActive(next);
    scrollOptionIntoView(optionId(select.rootId, next));
  };

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (select.disabled) return;
    const { key } = event;
    const typing = Date.now() - lastTypeRef.current < 500;
    if (isTypeaheadKey(event) || (key === " " && typing)) {
      event.preventDefault();
      lastTypeRef.current = Date.now();
      const options = select.open ? liveOptions(select.listId, select.items) : select.items;
      const match = typeahead(key, options, select.open ? select.active : select.value);
      if (!select.open) {
        select.setOpen(true);
        if (match) select.setActive(match);
      } else moveTo(match);
      return;
    }
    if (!select.open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " " || key === "Home" || key === "End") {
        event.preventDefault();
        select.setOpen(true);
        const enabled = select.items.filter((item) => !item.disabled);
        if (key === "Home" || (key === "ArrowUp" && !hasValue)) select.setActive(enabled[key === "Home" ? 0 : enabled.length - 1]?.value ?? null);
        if (key === "End") select.setActive(enabled[enabled.length - 1]?.value ?? null);
      }
      return;
    }
    const options = liveOptions(select.listId, select.items).filter((o) => !o.disabled);
    const index = options.findIndex((o) => o.value === select.active);
    const at = (i: number) => options[Math.min(Math.max(i, 0), options.length - 1)]?.value;
    if (key === "ArrowDown") moveTo(at(index + 1));
    else if (key === "ArrowUp") moveTo(at(index === -1 ? options.length - 1 : index - 1));
    else if (key === "Home") moveTo(at(0));
    else if (key === "End") moveTo(at(options.length - 1));
    else if (key === "PageDown") moveTo(at(index + 10));
    else if (key === "PageUp") moveTo(at(index - 10));
    else if (key === "Enter" || key === " ") {
      if (select.active !== null) select.select(select.active);
      else select.setOpen(false);
    } else if (key === "Tab") {
      select.setOpen(false);
      return;
    } else return;
    event.preventDefault();
  };

  return (
    <>
      <button
        ref={mergedRef}
        id={`${select.rootId}-trigger`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={select.open}
        aria-controls={select.open ? select.listId : undefined}
        aria-activedescendant={activeId}
        aria-invalid={select.invalid || undefined}
        aria-required={select.required || undefined}
        disabled={select.disabled}
        data-state={select.open ? "open" : "closed"}
        data-size={select.size}
        data-placeholder={hasValue ? undefined : ""}
        {...props}
        onClick={composeEventHandlers(onClick, () => {
          // Safari does not focus buttons on click; the trigger must hold focus for the keyboard.
          select.triggerRef.current?.focus();
          select.setOpen(!select.open);
        })}
        onKeyDown={composeEventHandlers(onKeyDown, onKey)}
        onKeyUp={composeEventHandlers(onKeyUp, (event: React.KeyboardEvent<HTMLButtonElement>) => {
          // Space activates buttons on keyup; keydown already handled it.
          if (event.key === " ") event.preventDefault();
        })}
        onBlur={composeEventHandlers(onBlur, () => {
          if (select.open) select.setOpen(false);
        })}
        className={cn(
          controlReset,
          fieldClasses,
          "group/select relative inline-flex cursor-pointer items-center justify-between gap-2 text-start shadow-pui-xs",
          "data-[state=open]:border-pui-ring data-[state=open]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
          heights[select.size],
          textSize[select.size],
          select.invalid && invalidClasses,
          className,
        )}
      >
        <span className={cn(blockReset, "relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden")}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={select.value ?? "\u0000placeholder"}
              initial={select.reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={select.reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
              transition={{ duration: 0.18, ease: easings.out }}
              className={cn(
                blockReset,
                "flex min-w-0 items-center gap-2",
                hasValue ? "text-pui-foreground" : "text-pui-muted-foreground",
              )}
            >
              {(selected?.icon ?? icon) ? (
                <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 text-pui-muted-foreground [&_svg]:size-4")}>
                  {selected?.icon ?? icon}
                </span>
              ) : null}
              <span className={cn(blockReset, "truncate")}>
                {children ??
                  (hasValue && select.value !== null
                    ? select.renderValue
                      ? select.renderValue(select.value, selected?.label ?? select.value)
                      : (selected?.label ?? select.value)
                    : select.placeholder)}
              </span>
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: select.open && !select.reduced ? 180 : 0 }}
          transition={springs.snappy}
          className={cn(blockReset, "inline-flex shrink-0 text-pui-muted-foreground group-hover/select:text-pui-foreground")}
        >
          <ChevronDownIcon className="size-4" />
        </motion.span>
      </button>
      {select.name !== undefined || select.required ? (
        <input
          aria-hidden="true"
          tabIndex={-1}
          name={select.name}
          value={select.value ?? ""}
          required={select.required}
          disabled={select.disabled}
          onChange={() => {}}
          onInvalid={() => select.triggerRef.current?.focus()}
          className={cn(controlReset, hiddenInputClasses)}
        />
      ) : null}
    </>
  );
});

/** The floating listbox. Opens below the trigger, flips when there is no room. */
export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(function SelectContent(
  {
    side = "bottom",
    align = "start",
    sideOffset = 6,
    container,
    listClassName,
    className,
    children,
    onMouseDown,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const select = useSelect("SelectContent");
  const { open, active, rootId, listId, triggerRef } = select;
  const activeRef = useLatestRef(active);
  React.useEffect(() => {
    if (!open) return;
    // After the first measurement frame: name the list after the trigger and bring the active option into view.
    const frame = requestAnimationFrame(() => {
      const list = document.getElementById(listId);
      const trigger = triggerRef.current;
      if (list && trigger?.id && !list.hasAttribute("aria-label")) list.setAttribute("aria-labelledby", trigger.id);
      scrollOptionIntoView(activeRef.current ? optionId(rootId, activeRef.current) : undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, rootId, listId, triggerRef, activeRef]);

  return (
    <ListboxPopup
      ref={ref}
      open={open}
      anchorRef={select.triggerRef}
      onEscape={() => {
        select.setOpen(false);
        select.triggerRef.current?.focus();
      }}
      onOutside={() => select.setOpen(false)}
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      reduced={select.reduced}
      listClassName={listClassName}
      listProps={{ id: select.listId, role: "listbox", "aria-label": ariaLabel, tabIndex: -1 }}
      {...props}
      onMouseDown={composeEventHandlers(onMouseDown, (event: React.MouseEvent<HTMLDivElement>) => event.preventDefault())}
      className={className}
    >
      {children}
    </ListboxPopup>
  );
});

/** One option: label, optional icon and description, and a check when selected. */
export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(function SelectItem(
  { value, disabled = false, textValue, icon, description, className, children, onPointerMove, onClick, ...props },
  ref,
) {
  const select = useSelect("SelectItem");
  const selected = select.value === value;
  const isActive = select.active === value;
  return (
    <div
      ref={ref}
      id={optionId(select.rootId, value)}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-value={value}
      data-text={textValue ?? textOf(children)}
      data-state={selected ? "checked" : "unchecked"}
      data-highlighted={isActive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      onPointerMove={composeEventHandlers(onPointerMove, () => {
        if (!disabled && !isActive) select.setActive(value);
      })}
      onClick={composeEventHandlers(onClick, () => {
        if (!disabled) select.select(value);
      })}
      className={cn(blockReset, optionClasses, className)}
    >
      {isActive ? <OptionHighlight layoutId={`${select.rootId}-hl`} reduced={select.reduced} /> : null}
      {icon ? (
        <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 text-pui-muted-foreground [&_svg]:size-4")}>
          {icon}
        </span>
      ) : null}
      <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
        <span className={cn(blockReset, "truncate", selected && "font-medium")}>{children}</span>
        {description ? (
          <span className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>{description}</span>
        ) : null}
      </span>
      <OptionCheck checked={selected} reduced={select.reduced} />
    </div>
  );
});

/** Groups options under a SelectLabel. */
export const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(function SelectGroup(
  { className, children, ...props },
  ref,
) {
  const labelId = `pui-sg-${toIdPart(React.useId())}`;
  return (
    <GroupLabelContext.Provider value={labelId}>
      <div ref={ref} role="group" aria-labelledby={labelId} {...props} className={cn(blockReset, "flex flex-col", className)}>
        {children}
      </div>
    </GroupLabelContext.Provider>
  );
});

/** Heading of a SelectGroup. */
export const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(function SelectLabel(
  { className, id, ...props },
  ref,
) {
  const groupLabelId = React.useContext(GroupLabelContext);
  return <div ref={ref} id={id ?? groupLabelId ?? undefined} {...props} className={cn(blockReset, groupLabelClasses, className)} />;
});

/** A rule between groups. */
export const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(function SelectSeparator(
  { className, ...props },
  ref,
) {
  return <div ref={ref} role="separator" {...props} className={cn(blockReset, separatorClasses, className)} />;
});
