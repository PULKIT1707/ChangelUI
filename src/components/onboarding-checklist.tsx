"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, XIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface OnboardingStep {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Call to action shown while the step is expanded, e.g. a Button. */
  action?: React.ReactNode;
  done?: boolean;
  /** Shows an "Optional" tag; optional steps still count toward progress. */
  optional?: boolean;
}
export interface OnboardingChecklistProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  steps: readonly OnboardingStep[];
  /** Default "Get started". */
  title?: React.ReactNode;
  /** Under the title. Default "{done} of {total} done". */
  description?: React.ReactNode;
  /** Makes each step's circle a checkbox so people can tick steps off by hand. */
  onStepToggle?: (id: string, done: boolean) => void;
  /** Shows a dismiss button in the header (and in the completed state). */
  onDismiss?: () => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Completed state. Default "You're all set". */
  completeTitle?: React.ReactNode;
  /** Default "Every step is done. You can close this checklist." */
  completeDescription?: React.ReactNode;
  /** Extra action in the completed state. */
  completeAction?: React.ReactNode;
}
/**
 * Activation checklist card: a progress ring, the next unfinished step opened with its call to
 * action, finished steps checked off with a spring, auto-advance to the next step, collapse and
 * dismiss, and a small celebration once everything is done.
 */
export const OnboardingChecklist = React.forwardRef<HTMLElement, OnboardingChecklistProps>(function OnboardingChecklist(
  {
    steps,
    title = "Get started",
    description,
    onStepToggle,
    onDismiss,
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    completeTitle = "You're all set",
    completeDescription = "Every step is done. You can close this checklist.",
    completeAction,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
    name: "collapsed",
  });
  const [selected, setSelected] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = total > 0 && doneCount === total;
  const firstOpen = steps.find((s) => !s.done)?.id ?? null;
  const selectedStep = selected === null ? undefined : steps.find((s) => s.id === selected);
  const expandedId = selectedStep ? selectedStep.id : firstOpen;
  // When the expanded step gets finished, hand focus of the list to the next unfinished step.
  const doneKey = steps.map((s) => (s.done ? "1" : "0")).join("");
  const prevDone = React.useRef(doneKey);
  React.useEffect(() => {
    if (prevDone.current === doneKey) return;
    const before = prevDone.current;
    prevDone.current = doneKey;
    const gained = [...doneKey].filter((c, i) => c === "1" && before[i] !== "1").length;
    if (gained > 0) {
      setSelected((sel) => (sel !== null && steps.find((s) => s.id === sel)?.done ? null : sel));
      setAnnouncement(doneCount === total ? `All ${total} steps complete` : `${doneCount} of ${total} steps complete`);
    }
  }, [doneKey, doneCount, total, steps]);
  const transition = reduced ? { duration: 0 } : { duration: 0.28, ease: easings.out };
  const headingId = `${id}-title`;
  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      data-complete={allDone ? "" : undefined}
      data-state={collapsed ? "collapsed" : "expanded"}
      {...props}
      className={cn(
        blockReset,
        "w-full min-w-0 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-sm",
        className,
      )}
    >
      <div className={cn(blockReset, "flex items-center gap-3 p-4")}>
        <ProgressRing value={doneCount} max={total} reduced={reduced} label={`${doneCount} of ${total} steps complete`} />
        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
          <h3 id={headingId} className={cn(blockReset, "truncate text-base leading-6 font-semibold text-pui-foreground")}>
            {title}
          </h3>
          <p className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>
            {description ?? `${doneCount} of ${total} done`}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={`${id}-body`}
          aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            controlReset,
            focusRing,
            "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
          )}
        >
          <ChevronDownIcon className={cn("size-4 transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none", !collapsed && "rotate-180")} />
        </button>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss checklist"
            onClick={onDismiss}
            className={cn(
              controlReset,
              focusRing,
              "-ms-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
            )}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="body"
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className={cn(blockReset, "overflow-hidden")}
          >
            <div className={cn(blockReset, "border-t border-pui-border")}>
              {allDone ? (
                <Complete
                  reduced={reduced}
                  title={completeTitle}
                  description={completeDescription}
                  action={completeAction}
                  onDismiss={onDismiss}
                />
              ) : (
                <ol className={cn(listReset, "flex flex-col p-2")}>
                  {steps.map((step, index) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      index={index}
                      baseId={`${id}-${index}`}
                      expanded={expandedId === step.id}
                      onExpand={() => setSelected(step.id)}
                      onStepToggle={onStepToggle}
                      reduced={reduced}
                      transition={transition}
                    />
                  ))}
                </ol>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </section>
  );
});
function StepRow({
  step,
  index,
  baseId,
  expanded,
  onExpand,
  onStepToggle,
  reduced,
  transition,
}: {
  step: OnboardingStep;
  index: number;
  baseId: string;
  expanded: boolean;
  onExpand: () => void;
  onStepToggle?: (id: string, done: boolean) => void;
  reduced: boolean;
  transition: object;
}) {
  const done = step.done === true;
  const titleId = `${baseId}-title`;
  const panelId = `${baseId}-panel`;
  const hasPanel = step.description != null || step.action != null;
  const indicator = (
    <span
      aria-hidden="true"
      className={cn(
        blockReset,
        "relative flex size-5 items-center justify-center rounded-pui-full border-[1.5px] transition-[background-color,border-color] duration-(--pui-duration-base) ease-pui-out",
        done ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : expanded ? "border-pui-primary" : "border-pui-border",
      )}
    >
      <AnimatePresence initial={false}>
        {done ? (
          <motion.span
            key="check"
            initial={reduced ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0 }}
            transition={springs.bouncy}
            className={cn(blockReset, "flex")}
          >
            <CheckIcon className="size-3" strokeWidth={3} />
          </motion.span>
        ) : (
          <span key="num" className={cn(blockReset, "text-[0.65rem] font-semibold tabular-nums", expanded ? "text-pui-primary-text" : "text-pui-muted-foreground")}>
            {index + 1}
          </span>
        )}
      </AnimatePresence>
    </span>
  );
  return (
    <li
      data-done={done ? "" : undefined}
      data-expanded={expanded ? "" : undefined}
      className={cn(
        blockReset,
        "rounded-pui-lg transition-colors duration-(--pui-duration-base)",
        expanded && !done ? "bg-pui-muted/60" : undefined,
      )}
    >
      <div className={cn(blockReset, "flex items-center gap-1 px-1.5")}>
        {onStepToggle ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-labelledby={titleId}
            onClick={() => onStepToggle(step.id, !done)}
            className={cn(controlReset, focusRing, "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pui-full")}
          >
            {indicator}
          </button>
        ) : (
          <span className={cn(blockReset, "flex size-8 shrink-0 items-center justify-center")}>{indicator}</span>
        )}
        <button
          type="button"
          aria-expanded={hasPanel ? expanded : undefined}
          aria-controls={hasPanel ? panelId : undefined}
          onClick={onExpand}
          className={cn(
            controlReset,
            focusRing,
            "flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-pui-md px-1.5 text-start",
          )}
        >
          <span
            id={titleId}
            className={cn(
              blockReset,
              "min-w-0 truncate font-medium transition-colors duration-(--pui-duration-base)",
              done ? "text-pui-muted-foreground line-through decoration-pui-muted-foreground/60" : "text-pui-foreground",
            )}
          >
            {step.title}
          </span>
          <span className={cn(blockReset, "sr-only")}>{done ? ", done" : ", not done"}</span>
          {step.optional ? (
            <span className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-muted px-1.5 py-px text-[0.65rem] text-pui-muted-foreground")}>Optional</span>
          ) : null}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && hasPanel ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={titleId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className={cn(blockReset, "overflow-hidden")}
          >
            <div className={cn(blockReset, "flex flex-col items-start gap-3 ps-12 pe-3 pb-3")}>
              {step.description ? <p className={cn(blockReset, "text-pui-muted-foreground leading-relaxed")}>{step.description}</p> : null}
              {step.action && !done ? step.action : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
function ProgressRing({ value, max, reduced, label }: { value: number; max: number; reduced: boolean; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(1, value / max) : 0;
  const complete = max > 0 && value >= max;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(blockReset, "relative flex size-11 shrink-0 items-center justify-center")}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true" className={cn(blockReset, "absolute inset-0 size-full -rotate-90")}>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-pui-muted" />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - fraction) }}
          transition={reduced ? { duration: 0 } : springs.smooth}
          className={complete ? "stroke-pui-success" : "stroke-pui-primary"}
        />
      </svg>
      <span aria-hidden="true" className={cn(blockReset, "relative text-[0.7rem] font-semibold tabular-nums text-pui-foreground")}>
        {complete ? <CheckIcon className="size-4 text-pui-success-text" strokeWidth={3} /> : `${value}/${max}`}
      </span>
    </span>
  );
}
const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, color: `var(--pui-chart-${(i % 5) + 1})` };
});
function Complete({
  reduced,
  title,
  description,
  action,
  onDismiss,
}: {
  reduced: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className={cn(blockReset, "flex flex-col items-center gap-3 px-6 py-7 text-center")}>
      <span aria-hidden="true" className={cn(blockReset, "relative flex size-12 items-center justify-center")}>
        {!reduced
          ? BURST.map((dot, i) => (
              <motion.span
                key={i}
                className={cn(blockReset, "absolute size-1.5 rounded-pui-full")}
                style={{ backgroundColor: dot.color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: dot.x, y: dot.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.8, ease: easings.out, delay: 0.1 }}
              />
            ))
          : null}
        <motion.span
          initial={reduced ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.bouncy}
          className={cn(blockReset, "flex size-12 items-center justify-center rounded-pui-full bg-pui-success/15 text-pui-success-text")}
        >
          <CheckIcon className="size-6" strokeWidth={2.5} />
        </motion.span>
      </span>
      <span className={cn(blockReset, "flex flex-col gap-1")}>
        <span className={cn(blockReset, "text-base font-semibold text-pui-foreground")}>{title}</span>
        <span className={cn(blockReset, "text-pui-muted-foreground")}>{description}</span>
      </span>
      {action || onDismiss ? (
        <span className={cn(blockReset, "flex flex-wrap justify-center gap-2")}>
          {action}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                controlReset,
                focusRing,
                "h-8 cursor-pointer rounded-pui-md border border-pui-border px-3 text-xs font-medium text-pui-foreground transition-colors hover:bg-pui-muted",
              )}
            >
              Close checklist
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
