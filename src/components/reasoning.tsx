"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, SparklesIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { TextShimmer } from "../text/text-shimmer";
export type ReasoningStepStatus = "done" | "active" | "pending";
export interface ReasoningStep {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Default "done". */
  status?: ReasoningStepStatus;
}
export interface ReasoningProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** True while the model is still thinking: shimmering label, live timer, auto-open. */
  streaming?: boolean;
  /** Thinking time in seconds. Default: measured from when `streaming` turned true until it turned false. */
  duration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Open when streaming starts. Default true. */
  autoOpen?: boolean;
  /** Collapse when streaming ends, so the answer stays in focus. Default true. */
  autoClose?: boolean;
  /** Ordered steps (plan, searches, checks) shown as a progress list above the text. */
  steps?: readonly ReasoningStep[];
  /** Label while streaming. Default "Thinking". */
  thinkingLabel?: string;
  /** Label once done. Default `Thought for ${formatted duration}`, or "Reasoning" when the duration is unknown. */
  label?: (seconds: number | undefined) => React.ReactNode;
  /** Default "md". */
  size?: "sm" | "md";
}
/** "a few seconds", "1 second", "12 seconds", "2m 5s". */
export function formatThinkingDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 1) return "a few seconds";
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m} minute${m === 1 ? "" : "s"}`;
}
const defaultLabel = (seconds: number | undefined) => (seconds === undefined ? "Reasoning" : `Thought for ${formatThinkingDuration(seconds)}`);
/**
 * AI reasoning disclosure: while the model thinks it shows a shimmering "Thinking" label with a live
 * timer and opens to stream the chain of thought; when it finishes it collapses to "Thought for 12
 * seconds" so the answer below stays in focus. Optional steps render as a compact progress list.
 */
export const Reasoning = React.forwardRef<HTMLDivElement, ReasoningProps>(function Reasoning(
  {
    streaming = false,
    duration,
    open: openProp,
    defaultOpen,
    onOpenChange,
    autoOpen = true,
    autoClose = true,
    steps,
    thinkingLabel = "Thinking",
    label = defaultLabel,
    size = "md",
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen ?? (streaming && autoOpen),
    onChange: onOpenChange,
    name: "open",
  });
  const [elapsed, setElapsed] = React.useState(0);
  const [measured, setMeasured] = React.useState<number | undefined>(undefined);
  const prevStreaming = React.useRef(streaming);
  // The timer runs in an effect so the server render and hydration match. Its cleanup (streaming
  // turned false) records the measured time and resets the counter for the next run.
  React.useEffect(() => {
    if (!streaming) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setMeasured((Date.now() - start) / 1000);
      setElapsed(0);
    };
  }, [streaming]);
  React.useEffect(() => {
    const was = prevStreaming.current;
    prevStreaming.current = streaming;
    if (was === streaming) return;
    if (streaming ? autoOpen : autoClose) setOpen(streaming);
  }, [streaming, autoOpen, autoClose, setOpen]);
  const seconds = duration ?? measured;
  // Announce only around a live run: "Thinking" while streaming, then the result once measured.
  const announcement = streaming ? thinkingLabel : measured !== undefined ? (seconds === undefined ? "Done thinking" : `Thought for ${formatThinkingDuration(seconds)}`) : "";
  const hasBody = children != null || (steps !== undefined && steps.length > 0);
  const transition = reduced ? { duration: 0 } : { duration: 0.28, ease: easings.out };
  const small = size === "sm";
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      data-streaming={streaming ? "" : undefined}
      data-size={size}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col text-pui-foreground", small ? "text-xs" : "text-sm", className)}
    >
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={hasBody ? open : undefined}
        aria-controls={hasBody ? `${id}-content` : undefined}
        disabled={!hasBody}
        onClick={() => setOpen(!open)}
        className={cn(
          controlReset,
          focusRing,
          "group/reasoning inline-flex max-w-full cursor-pointer items-center gap-1.5 self-start rounded-pui-md py-1 pe-1.5 text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:text-pui-foreground disabled:cursor-default disabled:hover:text-pui-muted-foreground",
        )}
      >
        <span aria-hidden="true" className={cn(blockReset, "relative flex shrink-0 items-center justify-center", small ? "size-3.5" : "size-4")}>
          {streaming && !reduced ? (
            <motion.span
              className={cn(blockReset, "absolute inset-0 rounded-pui-full bg-pui-primary/25")}
              animate={{ scale: [0.6, 1.5], opacity: [0.7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          ) : null}
          <SparklesIcon className={cn("relative size-full", streaming ? "text-pui-primary-text" : undefined)} />
        </span>
        <span className={cn(blockReset, "min-w-0 truncate font-medium")}>
          {streaming ? <TextShimmer duration={1.6}>{thinkingLabel}</TextShimmer> : label(seconds)}
        </span>
        {streaming ? (
          <span aria-hidden="true" className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>
            {elapsed}s
          </span>
        ) : null}
        {hasBody ? (
          <ChevronDownIcon
            className={cn(
              "transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none",
              small ? "size-3.5" : "size-4",
              open ? "rotate-180" : undefined,
            )}
          />
        ) : null}
      </button>
      <AnimatePresence initial={false}>
        {open && hasBody ? (
          <motion.div
            key="content"
            id={`${id}-content`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className={cn(blockReset, "overflow-hidden")}
          >
            <div
              className={cn(
                blockReset,
                "ms-2 mt-1 flex flex-col gap-3 border-s-2 border-pui-border ps-4 pb-1 text-pui-muted-foreground",
                small ? "ms-1.5 ps-3" : undefined,
              )}
            >
              {steps && steps.length > 0 ? <StepList steps={steps} reduced={reduced} /> : null}
              {children != null ? (
                <div className={cn(blockReset, "whitespace-pre-wrap leading-relaxed")}>
                  {children}
                  {streaming && !reduced ? (
                    <span
                      aria-hidden="true"
                      className={cn(blockReset, "ms-0.5 inline-block h-[1em] w-1.5 translate-y-[0.15em] animate-pui-blink rounded-[1px] bg-pui-muted-foreground/60")}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});
function StepList({ steps, reduced }: { steps: readonly ReasoningStep[]; reduced: boolean }) {
  return (
    <ol aria-label="Steps" className={cn(listReset, "flex flex-col gap-2")}>
      {steps.map((step, i) => {
        const status = step.status ?? "done";
        return (
          <motion.li
            key={step.id ?? i}
            data-status={status}
            initial={reduced ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springs.smooth}
            aria-current={status === "active" ? "step" : undefined}
            className={cn(blockReset, "flex gap-2.5")}
          >
            <span
              aria-hidden="true"
              className={cn(
                blockReset,
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pui-full border",
                status === "done" && "border-pui-primary bg-pui-primary text-pui-primary-foreground",
                status === "active" && "border-pui-primary text-pui-primary-text",
                status === "pending" && "border-pui-border",
              )}
            >
              {status === "done" ? <CheckIcon className="size-2.5" strokeWidth={3} /> : null}
              {status === "active" ? (
                <span className={cn(blockReset, "size-1.5 rounded-pui-full bg-current motion-safe:animate-pulse")} />
              ) : null}
            </span>
            <span className={cn(blockReset, "flex min-w-0 flex-col gap-0.5")}>
              <span className={cn(blockReset, status === "pending" ? "text-pui-muted-foreground" : "text-pui-foreground", "font-medium")}>
                {step.title}
                <span className={cn(blockReset, "sr-only")}>{status === "done" ? " (done)" : status === "active" ? " (in progress)" : " (pending)"}</span>
              </span>
              {step.description ? <span className={cn(blockReset, "text-pui-muted-foreground")}>{step.description}</span> : null}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
