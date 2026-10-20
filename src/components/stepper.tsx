"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import type { Orientation } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type StepStatus = "complete" | "current" | "upcoming" | "error" | "loading";

export interface StepperProps extends Omit<React.OlHTMLAttributes<HTMLOListElement>, "defaultValue" | "onChange"> {
  /** Index of the current step (0-based). Steps before it are complete. */
  value?: number;
  /** Default 0. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Default "horizontal". */
  orientation?: Orientation;
  /**
   * true (default): steps are progress only. false: every step is a button that jumps to it
   * (onValueChange), for non-linear wizards.
   */
  linear?: boolean;
  /** Indicator 28 / 36 px. Default "md". */
  size?: "sm" | "md";
  /** Visually hidden status words, in order: complete, current, upcoming, error, loading. */
  statusLabels?: Partial<Record<StepStatus, string>>;
}

export interface StepperItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Overrides the status derived from the Stepper value (e.g. "error" or "loading"). */
  status?: StepStatus;
  /** Replaces the step number in the indicator (the check still shows once complete). */
  icon?: React.ReactNode;
  /** Only for linear={false}: this step can't be selected. */
  disabled?: boolean;
}

const DEFAULT_STATUS_LABELS: Record<StepStatus, string> = {
  complete: "Completed",
  current: "Current step",
  upcoming: "Not started",
  error: "Needs attention",
  loading: "In progress",
};

interface StepperContextValue {
  value: number;
  setValue: (value: number) => void;
  orientation: Orientation;
  linear: boolean;
  size: "sm" | "md";
  ringId: string;
  reduced: boolean;
  labels: Record<StepStatus, string>;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);
const StepIndexContext = React.createContext<{ index: number; count: number }>({ index: 0, count: 1 });

function useStepper(): StepperContextValue {
  const context = React.useContext(StepperContext);
  if (!context) throw new Error("[changelui] StepperItem must be used inside Stepper");
  return context;
}

/** Wizard / checkout progress: connectors fill as steps complete and the number morphs into a check. */
export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    value: valueProp,
    defaultValue = 0,
    onValueChange,
    orientation = "horizontal",
    linear = true,
    size = "md",
    statusLabels,
    className,
    children,
    ...props
  },
  ref,
) {
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const reduced = usePrefersReducedMotion();
  const ringId = `${React.useId()}-ring`;
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const context = React.useMemo<StepperContextValue>(
    () => ({
      value,
      setValue,
      orientation,
      linear,
      size,
      ringId,
      reduced,
      labels: { ...DEFAULT_STATUS_LABELS, ...statusLabels },
    }),
    [value, setValue, orientation, linear, size, ringId, reduced, statusLabels],
  );
  return (
    <StepperContext.Provider value={context}>
      <ol
        ref={ref}
        data-orientation={orientation}
        {...props}
        className={cn(
          listReset,
          "flex text-pui-foreground",
          orientation === "horizontal" ? "w-full flex-row items-start" : "flex-col",
          className,
        )}
      >
        {items.map((child, index) => (
          <StepIndexContext.Provider key={child.key ?? index} value={{ index, count: items.length }}>
            {child}
          </StepIndexContext.Provider>
        ))}
      </ol>
    </StepperContext.Provider>
  );
});

const indicatorSize = { sm: "size-7 text-xs", md: "size-9 text-sm" } as const;
const iconSize = { sm: "size-3.5", md: "size-4" } as const;

function DrawnCheck({ className, reduced }: { className: string; reduced: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn(blockReset, "block", className)}>
      <motion.path
        d="M5 12.5 10 17.5 19 7"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3, ease: "easeOut", delay: 0.08 }}
      />
    </svg>
  );
}

function Indicator({ status, index, icon }: { status: StepStatus; index: number; icon?: React.ReactNode }) {
  const { size, ringId, reduced } = useStepper();
  const swap = reduced
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } }
    : {
        initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
      };
  let content: React.ReactNode;
  if (status === "complete") content = <DrawnCheck className={iconSize[size]} reduced={reduced} />;
  else if (status === "error") content = <span className="font-semibold">!</span>;
  else if (status === "loading")
    content = (
      <span
        className={cn(
          blockReset,
          "block rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin",
          iconSize[size],
        )}
      />
    );
  else content = icon ?? <span className="tabular-nums">{index + 1}</span>;
  const key = status === "complete" || status === "error" || status === "loading" ? status : "idle";

  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn(
        blockReset,
        "relative z-[1] grid shrink-0 place-items-center rounded-full border-2 font-medium transition-colors duration-200",
        indicatorSize[size],
        status === "complete" && "border-pui-primary bg-pui-primary text-pui-primary-foreground",
        status === "current" && "border-pui-primary bg-pui-background text-pui-primary-text",
        status === "loading" && "border-pui-primary bg-pui-background text-pui-primary-text",
        status === "upcoming" && "border-pui-border bg-pui-background text-pui-muted-foreground",
        status === "error" && "border-pui-danger bg-pui-danger text-pui-danger-foreground",
      )}
    >
      {status === "current" || status === "loading" ? (
        <motion.span
          layoutId={reduced ? undefined : ringId}
          transition={springs.layout}
          className={cn(blockReset, "pointer-events-none absolute -inset-1.5 rounded-full border-2 border-pui-primary/35")}
        />
      ) : null}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={key} {...swap} transition={reduced ? { duration: 0 } : springs.snappy} className="grid place-items-center">
          {content}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Connector({ filled }: { filled: boolean }) {
  const { orientation, reduced } = useStepper();
  const horizontal = orientation === "horizontal";
  return (
    <span
      aria-hidden="true"
      className={cn(
        blockReset,
        "relative overflow-hidden rounded-full bg-pui-border",
        horizontal ? "mx-2 h-0.5 min-w-4 flex-1" : "my-1.5 w-0.5 flex-1 min-h-6",
      )}
    >
      <motion.span
        initial={false}
        animate={horizontal ? { scaleX: filled ? 1 : 0 } : { scaleY: filled ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : springs.smooth}
        className={cn(
          blockReset,
          "absolute inset-0 block rounded-full bg-pui-primary",
          horizontal ? "origin-left rtl:origin-right" : "origin-top",
        )}
      />
    </span>
  );
}

export const StepperItem = React.forwardRef<HTMLLIElement, StepperItemProps>(function StepperItem(
  { title, description, status: statusProp, icon, disabled = false, className, ...props },
  ref,
) {
  const stepper = useStepper();
  const { index, count } = React.useContext(StepIndexContext);
  const derived: StepStatus = index < stepper.value ? "complete" : index === stepper.value ? "current" : "upcoming";
  const status = statusProp ?? derived;
  const isCurrent = index === stepper.value;
  const last = index === count - 1;
  const horizontal = stepper.orientation === "horizontal";
  const interactive = !stepper.linear;

  const text = (
    <span className={cn(blockReset, "flex min-w-0 flex-col gap-0.5", horizontal ? "pe-2" : "pb-6 pt-1")}>
      <span
        className={cn(
          blockReset,
          "font-medium leading-tight",
          stepper.size === "sm" ? "text-xs" : "text-sm",
          status === "upcoming" ? "text-pui-muted-foreground" : "text-pui-foreground",
          status === "error" && "text-pui-danger-text",
        )}
      >
        {title}
      </span>
      {description ? (
        <span className={cn(blockReset, "text-xs leading-snug text-pui-muted-foreground")}>{description}</span>
      ) : null}
      <span className="sr-only">, {stepper.labels[status]}</span>
    </span>
  );

  const indicator = <Indicator status={status} index={index} icon={icon} />;
  const indicatorRow = horizontal ? (
    <span className={cn(blockReset, "flex w-full items-center")}>
      {indicator}
      {!last ? <Connector filled={index < stepper.value} /> : null}
    </span>
  ) : (
    <span className={cn(blockReset, "flex flex-col items-center self-stretch")}>
      {indicator}
      {!last ? <Connector filled={index < stepper.value} /> : null}
    </span>
  );

  const body = horizontal ? (
    <>
      {indicatorRow}
      <span className={cn(blockReset, "mt-2 block")}>{text}</span>
    </>
  ) : (
    <>
      {indicatorRow}
      {text}
    </>
  );

  const layout = horizontal ? "flex flex-col items-start text-start" : "flex flex-row items-start gap-3 text-start";

  return (
    <li
      ref={ref}
      aria-current={isCurrent ? "step" : undefined}
      data-status={status}
      {...props}
      className={cn(blockReset, horizontal ? (last ? "flex-none" : "min-w-0 flex-1") : "flex", className)}
    >
      {interactive ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => stepper.setValue(index)}
          className={cn(
            controlReset,
            layout,
            "w-full cursor-pointer rounded-pui-md disabled:cursor-not-allowed disabled:opacity-50",
            "[&:hover:not(:disabled)_[data-status=upcoming]]:border-pui-primary/60",
            focusRing,
          )}
        >
          {body}
        </button>
      ) : (
        <div className={cn(blockReset, layout, "w-full")}>{body}</div>
      )}
    </li>
  );
});
