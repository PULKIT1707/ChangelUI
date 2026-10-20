"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { ChevronDownIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import { easings } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type AccordionVariant = "bordered" | "separated" | "plain";

interface AccordionBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Level of the heading that wraps each trigger. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Default "bordered". */
  variant?: AccordionVariant;
  disabled?: boolean;
}

export interface AccordionSingleProps {
  type?: "single";
  /** Controlled open item; null means none (and is still controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Allow closing the open item. Default true. */
  collapsible?: boolean;
}

export interface AccordionMultipleProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type AccordionProps = AccordionBaseProps & (AccordionSingleProps | AccordionMultipleProps);

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the chevron; null hides it. */
  icon?: React.ReactNode | null;
}

export interface AccordionContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Keep the content mounted (hidden) while closed. Default false. */
  forceMount?: boolean;
}

type AccordionState = string | null | string[];

interface AccordionContextValue {
  id: string;
  openValues: readonly string[];
  toggle: (value: string) => void;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  variant: AccordionVariant;
  disabled: boolean;
}

interface AccordionItemContextValue {
  value: string;
  open: boolean;
  disabled: boolean;
  triggerId: string;
  contentId: string;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItem(part: string): AccordionItemContextValue {
  const item = React.useContext(AccordionItemContext);
  if (!item) throw new Error(`[changelui] ${part} must be used inside AccordionItem`);
  return item;
}

const headingTags = { 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

const rootVariants: Record<AccordionVariant, string> = {
  bordered: "rounded-pui-lg border border-pui-border",
  separated: "flex flex-col gap-2",
  plain: "",
};

const itemVariants: Record<AccordionVariant, string> = {
  bordered: "border-b border-pui-border last:border-b-0",
  separated: "rounded-pui-lg border border-pui-border bg-pui-surface",
  plain: "border-b border-pui-border",
};

const TRIGGER_SELECTOR = "[data-pui-accordion-trigger]:not([disabled])";

/** Arrow Up/Down (wrapping) and Home/End between the enabled triggers of the closest Accordion. */
function navigate(event: React.KeyboardEvent<HTMLButtonElement>): void {
  const target = event.currentTarget;
  const root = target.closest("[data-pui-accordion]");
  if (!root) return;
  const triggers = [...root.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR)].filter(
    (el) => el.closest("[data-pui-accordion]") === root,
  );
  const index = triggers.indexOf(target);
  if (index === -1) return;
  let next: number;
  if (event.key === "ArrowDown") next = (index + 1) % triggers.length;
  else if (event.key === "ArrowUp") next = (index - 1 + triggers.length) % triggers.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = triggers.length - 1;
  else return;
  event.preventDefault();
  triggers[next]?.focus();
}

/** Disclosure list with single or multiple open items and height animation (design 7.1 #22). */
export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(function Accordion(props, ref) {
  const {
    type = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    collapsible = true,
    headingLevel = 3,
    variant = "bordered",
    disabled = false,
    className,
    children,
    ...rest
  } = props as AccordionBaseProps & {
    type?: "single" | "multiple";
    value?: AccordionState;
    defaultValue?: AccordionState;
    onValueChange?: (value: AccordionState) => void;
    collapsible?: boolean;
  };
  const multiple = type === "multiple";
  const id = React.useId();
  const [state, setState] = useControllableState<AccordionState>({
    value: valueProp,
    defaultValue: defaultValue ?? (multiple ? [] : null),
    onChange: onValueChange,
  });
  const openValues = React.useMemo<readonly string[]>(
    () => (Array.isArray(state) ? state : state === null || state === undefined ? [] : [state]),
    [state],
  );
  const toggle = React.useCallback(
    (item: string) => {
      setState((prev) => {
        if (multiple) {
          const list = Array.isArray(prev) ? prev : [];
          return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
        }
        if (prev === item) return collapsible ? null : prev;
        return item;
      });
    },
    [setState, multiple, collapsible],
  );
  const context = React.useMemo<AccordionContextValue>(
    () => ({ id, openValues, toggle, headingLevel, variant, disabled }),
    [id, openValues, toggle, headingLevel, variant, disabled],
  );

  return (
    <AccordionContext.Provider value={context}>
      <div
        ref={ref}
        data-pui-accordion=""
        data-variant={variant}
        data-disabled={disabled ? "" : undefined}
        {...rest}
        className={cn(blockReset, "w-full text-pui-foreground", rootVariants[variant], className)}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, disabled: disabledProp, className, children, ...props },
  ref,
) {
  const accordion = React.useContext(AccordionContext);
  if (!accordion) throw new Error("[changelui] AccordionItem must be used inside Accordion");
  const open = accordion.openValues.includes(value);
  const disabled = accordion.disabled || disabledProp === true;
  const base = `${accordion.id}-item-${toIdPart(value)}`;
  const item = React.useMemo<AccordionItemContextValue>(
    () => ({ value, open, disabled, triggerId: `${base}-trigger`, contentId: `${base}-content` }),
    [value, open, disabled, base],
  );
  return (
    <AccordionItemContext.Provider value={item}>
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        {...props}
        className={cn(blockReset, itemVariants[accordion.variant], className)}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(function AccordionTrigger(
  { icon, className, onClick, onKeyDown, children, ...props },
  ref,
) {
  const accordion = React.useContext(AccordionContext);
  const item = useAccordionItem("AccordionTrigger");
  const HeadingTag = headingTags[accordion?.headingLevel ?? 3];
  return (
    <HeadingTag className={cn(blockReset, "flex text-sm font-medium leading-normal")}>
      <button
        ref={ref}
        type="button"
        id={item.triggerId}
        aria-expanded={item.open}
        aria-controls={item.contentId}
        data-pui-accordion-trigger=""
        data-state={item.open ? "open" : "closed"}
        data-disabled={item.disabled ? "" : undefined}
        disabled={item.disabled}
        {...props}
        onClick={composeEventHandlers(onClick, () => accordion?.toggle(item.value))}
        onKeyDown={composeEventHandlers(onKeyDown, navigate)}
        className={cn(
          controlReset,
          "flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-pui-md px-4 py-3 text-start transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted/60",
          focusRing,
          disabledStyles,
          className,
        )}
      >
        <span className={cn(blockReset, "flex-1")}>{children}</span>
        {icon === null ? null : (
          <span
            aria-hidden="true"
            data-pui-accordion-icon=""
            className={cn(
              blockReset,
              "inline-flex shrink-0 text-pui-muted-foreground transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none",
              item.open && "rotate-180",
            )}
          >
            {icon ?? <ChevronDownIcon className="size-4" />}
          </span>
        )}
      </button>
    </HeadingTag>
  );
});

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(function AccordionContent(
  { forceMount = false, className, children, ...props },
  ref,
) {
  const item = useAccordionItem("AccordionContent");
  const reduced = usePrefersReducedMotion();
  const transition = reduced ? { duration: 0 } : { duration: 0.25, ease: easings.out };
  const region = (
    <motion.div
      key="content"
      ref={ref}
      role="region"
      id={item.contentId}
      aria-labelledby={item.triggerId}
      data-state={item.open ? "open" : "closed"}
      hidden={forceMount && !item.open}
      initial={forceMount ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={transition}
      {...props}
      className={cn(blockReset, "overflow-hidden", className)}
    >
      <div className={cn(blockReset, "px-4 pb-4 text-sm text-pui-muted-foreground")}>{children}</div>
    </motion.div>
  );
  if (forceMount) return region;
  return <AnimatePresence initial={false}>{item.open ? region : null}</AnimatePresence>;
});
