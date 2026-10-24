"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, MinusIcon, RotateCcwIcon, XIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type AgentPlanStepStatus = "queued" | "running" | "done" | "failed" | "skipped";
export interface AgentPlanSubstep {
  id: string;
  title: React.ReactNode;
  done?: boolean;
}
export interface AgentPlanStep {
  id: string;
  title: React.ReactNode;
  /** Default "queued". */
  status?: AgentPlanStepStatus;
  /** Supporting text under the title, e.g. what the agent is doing right now. */
  detail?: React.ReactNode;
  /** Shown in the step body when status is "failed". */
  error?: React.ReactNode;
  /** A checklist inside the step; the row shows "2/4" when collapsed. */
  substeps?: readonly AgentPlanSubstep[];
  /** Epoch ms when a running step started; drives its live timer. */
  startedAt?: number;
  /** How long a finished step took. */
  durationMs?: number;
}
export interface AgentPlanProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  steps: readonly AgentPlanStep[];
  /** Default "Plan". */
  title?: React.ReactNode;
  /** The agent is still working (shows "Working" even between steps). Default: any step is running. */
  streaming?: boolean;
  /** Shows Retry on failed steps. */
  onRetry?: (id: string) => void;
  /** Shows Skip on queued steps. */
  onSkip?: (id: string) => void;
  /** Fold finished steps before the first open one into a "N steps done" row. Default false. */
  collapseCompleted?: boolean;
  /** Reference time for the timers (tests and SSR). Default: the client clock, ticking every second. */
  now?: number;
  /** Labels. */
  retryLabel?: string;
  skipLabel?: string;
}
const statusLabel: Record<AgentPlanStepStatus, string> = {
  queued: "Queued",
  running: "In progress",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};
/** "0:07", "1:42", "1:02:03". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
const formatDuration = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : ms < 60_000 ? `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s` : formatElapsed(ms));
const tickEverySecond = (onChange: () => void) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};
const noTick = () => () => {};
const secondSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverSnapshot = () => null;
/** The client clock in whole seconds, ticking while `active`; null on the server and during hydration. */
function useSecondClock(active: boolean): number | null {
  return React.useSyncExternalStore(active ? tickEverySecond : noTick, secondSnapshot, serverSnapshot);
}
const ICON = "relative z-1 flex size-6 shrink-0 items-center justify-center rounded-pui-full text-[0.6875rem] font-semibold tabular-nums";
function StepIcon({ status, index, reduced }: { status: AgentPlanStepStatus; index: number; reduced: boolean }) {
  const pop = reduced ? { initial: false as const } : { initial: { scale: 0.4, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: springs.bouncy };
  if (status === "done")
    return (
      <motion.span key="done" {...pop} className={cn(blockReset, ICON, "bg-pui-success text-pui-success-foreground")}>
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </motion.span>
    );
  if (status === "failed")
    return (
      <motion.span key="failed" {...pop} className={cn(blockReset, ICON, "bg-pui-danger text-pui-danger-foreground")}>
        <XIcon className="size-3.5" strokeWidth={3} />
      </motion.span>
    );
  if (status === "skipped")
    return (
      <span className={cn(blockReset, ICON, "border border-dashed border-pui-border bg-pui-surface text-pui-muted-foreground")}>
        <MinusIcon className="size-3" />
      </span>
    );
  if (status === "running")
    return (
      <span className={cn(blockReset, ICON, "bg-pui-surface text-pui-primary-text")}>
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "absolute inset-0 rounded-pui-full border-2 border-pui-primary/20 border-t-pui-primary motion-safe:animate-spin motion-reduce:border-pui-primary",
          )}
        />
        {index + 1}
      </span>
    );
  return <span className={cn(blockReset, ICON, "border border-pui-border bg-pui-surface text-pui-muted-foreground")}>{index + 1}</span>;
}
/**
 * Live plan for an AI agent run: a progress header and an ordered list of steps that tick through
 * queued, in progress, done, failed and skipped. The active step carries a highlight that glides down
 * the list as work moves on, a live timer and its sub-task checklist; failed steps offer Retry and
 * queued steps offer Skip, so users can steer the run instead of waiting on a spinner. Status changes
 * are announced politely, and finished steps can fold into one row.
 */
export const AgentPlan = React.forwardRef<HTMLElement, AgentPlanProps>(function AgentPlan(
  {
    steps,
    title = "Plan",
    streaming: streamingProp,
    onRetry,
    onSkip,
    collapseCompleted = false,
    now: nowProp,
    retryLabel = "Retry",
    skipLabel = "Skip",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const statusOf = (s: AgentPlanStep): AgentPlanStepStatus => s.status ?? "queued";
  const running = steps.some((s) => statusOf(s) === "running");
  const streaming = streamingProp ?? running;
  const clock = useSecondClock(nowProp === undefined && running);
  const now = nowProp ?? clock;
  const finished = steps.filter((s) => statusOf(s) === "done" || statusOf(s) === "skipped").length;
  const failed = steps.filter((s) => statusOf(s) === "failed").length;
  const total = steps.length;
  const overall: "working" | "failed" | "complete" | "idle" =
    streaming ? "working" : failed > 0 ? "failed" : total > 0 && finished === total ? "complete" : "idle";
  // Steps the user opened or closed by hand; the rest follow their status (open while running or failed).
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});
  const [showFolded, setShowFolded] = React.useState(false);
  // Announce transitions, not the initial render.
  const [announcement, setAnnouncement] = React.useState("");
  const prev = React.useRef<Map<string, AgentPlanStepStatus> | null>(null);
  // steps may be a fresh array every render, so the effect keys on the joined statuses instead.
  const statusKey = steps.map((s) => `${s.id}:${statusOf(s)}`).join("|");
  const stepsRef = useLatestRef(steps);
  React.useEffect(() => {
    const current = stepsRef.current;
    const next = new Map(current.map((s) => [s.id, s.status ?? "queued"] as const));
    const before = prev.current;
    prev.current = next;
    if (!before) return;
    const changed = current.find((s) => before.has(s.id) && before.get(s.id) !== (s.status ?? "queued"));
    if (changed) setAnnouncement(`${textOf(changed.title) || "Step"}: ${statusLabel[changed.status ?? "queued"]}`);
  }, [statusKey, stepsRef]);
  const firstOpen = steps.findIndex((s) => statusOf(s) !== "done" && statusOf(s) !== "skipped");
  const foldCount = collapseCompleted && !showFolded ? (firstOpen === -1 ? 0 : firstOpen) : 0;
  const folded = foldCount > 1 ? foldCount : 0;
  const pillClass = {
    working: "bg-pui-primary/12 text-pui-primary-text",
    failed: "bg-pui-danger/12 text-pui-danger-text",
    complete: "bg-pui-success/12 text-pui-success-text",
    idle: "bg-pui-muted text-pui-muted-foreground",
  }[overall];
  const pillText = { working: "Working", failed: "Needs attention", complete: "Complete", idle: "Not started" }[overall];
  const ratio = total > 0 ? finished / total : 0;
  const expandTransition = reduced ? { duration: 0 } : { duration: 0.24, ease: easings.out };
  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-busy={streaming || undefined}
      data-status={overall}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs",
        className,
      )}
    >
      <header className={cn(blockReset, "flex flex-col gap-2.5 border-b border-pui-border px-4 pt-3.5 pb-3")}>
        <div className={cn(blockReset, "flex items-center justify-between gap-3")}>
          <h3 id={`${id}-title`} className={cn(blockReset, "min-w-0 truncate text-sm font-semibold text-pui-foreground")}>
            {title}
          </h3>
          <span className={cn(blockReset, "inline-flex shrink-0 items-center gap-1.5 rounded-pui-full px-2 py-0.5 text-xs font-medium", pillClass)}>
            {overall === "working" ? (
              <span aria-hidden="true" className={cn(blockReset, "size-1.5 rounded-pui-full bg-current motion-safe:animate-pulse")} />
            ) : null}
            {pillText}
          </span>
        </div>
        <div className={cn(blockReset, "flex items-center gap-3")}>
          <div
            role="progressbar"
            aria-labelledby={`${id}-title`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={finished}
            aria-valuetext={`${finished} of ${total} steps finished`}
            className={cn(blockReset, "relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-pui-full bg-pui-muted")}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scaleX: ratio }}
              transition={reduced ? { duration: 0 } : springs.smooth}
              className={cn(blockReset, "absolute inset-0 origin-left rounded-pui-full rtl:origin-right", failed > 0 ? "bg-pui-danger" : "bg-pui-success")}
            />
          </div>
          <span className={cn(blockReset, "shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>
            {finished} of {total}
          </span>
        </div>
      </header>
      <ol className={cn(listReset, "relative flex flex-col p-2")}>
        {folded > 0 ? (
          <li className={cn(blockReset, "flex")}>
            <button
              type="button"
              onClick={() => setShowFolded(true)}
              className={cn(
                controlReset,
                focusRing,
                "flex w-full cursor-pointer items-center gap-3 rounded-pui-md px-2 py-1.5 text-start text-xs text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
              )}
            >
              <span className={cn(blockReset, "flex size-6 shrink-0 items-center justify-center rounded-pui-full bg-pui-success/15 text-pui-success-text")}>
                <CheckIcon className="size-3.5" strokeWidth={3} />
              </span>
              <span className={cn(blockReset, "flex-1")}>{folded} steps done</span>
              <span className={cn(blockReset, "font-medium text-pui-foreground")}>Show</span>
            </button>
          </li>
        ) : null}
        {steps.map((step, index) => {
          if (index < folded) return null;
          const status = statusOf(step);
          const last = index === steps.length - 1;
          const subDone = step.substeps?.filter((s) => s.done).length ?? 0;
          const subTotal = step.substeps?.length ?? 0;
          const hasBody = Boolean(step.detail || step.substeps?.length || (status === "failed" && step.error));
          const autoOpen = status === "running" || status === "failed";
          const open = hasBody && (toggled[step.id] ?? autoOpen);
          const elapsed = status === "running" && step.startedAt !== undefined && now !== null ? formatElapsed(now - step.startedAt) : null;
          const took = (status === "done" || status === "failed") && step.durationMs !== undefined ? formatDuration(step.durationMs) : null;
          const bodyId = `${id}-body-${index}`;
          const titleNode = (
            <span
              className={cn(
                blockReset,
                "min-w-0 flex-1 truncate",
                status === "queued" && "text-pui-muted-foreground",
                status === "skipped" && "text-pui-muted-foreground line-through decoration-pui-muted-foreground/60",
                status === "running" && "font-medium text-pui-foreground",
                status === "failed" && "font-medium text-pui-danger-text",
              )}
            >
              {step.title}
            </span>
          );
          const meta = (
            <span className={cn(blockReset, "flex shrink-0 items-center gap-2 text-xs tabular-nums text-pui-muted-foreground")}>
              {subTotal > 0 && !open ? (
                <span className={blockReset}>
                  {subDone}/{subTotal}
                </span>
              ) : null}
              {elapsed ? <span className={cn(blockReset, "text-pui-primary-text")}>{elapsed}</span> : null}
              {took ? <span className={blockReset}>{took}</span> : null}
            </span>
          );
          return (
            <li
              key={step.id}
              data-status={status}
              aria-current={status === "running" ? "step" : undefined}
              className={cn(blockReset, "group/step relative flex flex-col")}
            >
              {status === "running" ? (
                <motion.span
                  aria-hidden="true"
                  layoutId={reduced ? undefined : `${id}-active`}
                  transition={springs.smooth}
                  className={cn(blockReset, "absolute inset-0 rounded-pui-md bg-pui-primary/6 ring-1 ring-pui-primary/15 ring-inset")}
                />
              ) : null}
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    blockReset,
                    "absolute start-[1.25rem] top-8 bottom-[-0.375rem] w-px -translate-x-1/2 rtl:translate-x-1/2",
                    status === "done" ? "bg-pui-success/50" : "bg-pui-border",
                  )}
                />
              ) : null}
              <div className={cn(blockReset, "relative flex items-center gap-3 px-2 py-1.5")}>
                <StepIcon status={status} index={index} reduced={reduced} />
                {hasBody ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => setToggled((t) => ({ ...t, [step.id]: !open }))}
                    className={cn(
                      controlReset,
                      focusRing,
                      "-my-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-pui-sm py-1 text-start",
                    )}
                  >
                    {titleNode}
                    <span className={cn(blockReset, "sr-only")}>, {statusLabel[status]}</span>
                    {meta}
                    <ChevronDownIcon
                      className={cn("size-3.5 shrink-0 text-pui-muted-foreground transition-transform duration-(--pui-duration-base) motion-reduce:transition-none", open && "rotate-180")}
                    />
                  </button>
                ) : (
                  <span className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-2")}>
                    {titleNode}
                    <span className={cn(blockReset, "sr-only")}>, {statusLabel[status]}</span>
                    {meta}
                  </span>
                )}
                {status === "failed" && onRetry ? (
                  <button
                    type="button"
                    onClick={() => onRetry(step.id)}
                    aria-label={`${retryLabel} ${textOf(step.title)}`.trim()}
                    className={cn(
                      controlReset,
                      focusRing,
                      "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-pui-md border border-pui-border bg-pui-surface px-2 text-xs font-medium text-pui-foreground transition-colors hover:bg-pui-muted",
                    )}
                  >
                    <RotateCcwIcon className="size-3" />
                    {retryLabel}
                  </button>
                ) : null}
                {status === "queued" && onSkip ? (
                  <button
                    type="button"
                    onClick={() => onSkip(step.id)}
                    aria-label={`${skipLabel} ${textOf(step.title)}`.trim()}
                    className={cn(
                      controlReset,
                      focusRing,
                      "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground opacity-0 transition-[opacity,color,background-color] group-hover/step:opacity-100 hover:bg-pui-muted hover:text-pui-foreground focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
                    )}
                  >
                    {skipLabel}
                  </button>
                ) : null}
              </div>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="body"
                    id={bodyId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={expandTransition}
                    className={cn(blockReset, "relative overflow-hidden")}
                  >
                    <div className={cn(blockReset, "flex flex-col gap-2 ps-11 pe-2 pb-2.5")}>
                      {step.detail ? <p className={cn(blockReset, "text-xs leading-relaxed text-pui-muted-foreground")}>{step.detail}</p> : null}
                      {status === "failed" && step.error ? (
                        <p className={cn(blockReset, "rounded-pui-md bg-pui-danger/8 px-2.5 py-1.5 text-xs leading-relaxed text-pui-danger-text")}>{step.error}</p>
                      ) : null}
                      {step.substeps?.length ? (
                        <ul className={cn(listReset, "flex flex-col gap-1")}>
                          {step.substeps.map((sub) => (
                            <li key={sub.id} className={cn(blockReset, "flex items-center gap-2 text-xs")}>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  blockReset,
                                  "flex size-3.5 shrink-0 items-center justify-center rounded-pui-sm border transition-colors duration-(--pui-duration-base)",
                                  sub.done ? "border-pui-success bg-pui-success text-pui-success-foreground" : "border-pui-border",
                                )}
                              >
                                {sub.done ? <CheckIcon className="size-2.5" strokeWidth={3.5} /> : null}
                              </span>
                              <span className={cn(blockReset, sub.done ? "text-pui-muted-foreground" : "text-pui-foreground")}>{sub.title}</span>
                              <span className={cn(blockReset, "sr-only")}>{sub.done ? "(done)" : "(to do)"}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
      <span role="status" aria-live="polite" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </section>
  );
});
/** Plain text of a node, for announcements and accessible names. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}
