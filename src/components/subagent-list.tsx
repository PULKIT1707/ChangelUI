"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, MinusIcon, RotateCcwIcon, TriangleAlertIcon, XIcon } from "../lib/icons";
import { djb2 } from "../lib/ids";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SubagentStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface SubagentLogEntry {
  id?: string;
  /** Epoch ms. */
  at?: number;
  /** Default "info". "tool" lines are monospace with a wrench-style mark. */
  kind?: "info" | "tool" | "output" | "error";
  text: React.ReactNode;
}

export interface Subagent {
  id: string;
  name: React.ReactNode;
  /** What it was asked to do. */
  task?: React.ReactNode;
  status: SubagentStatus;
  /** What it's doing right now (running) or its one-line result (done). */
  step?: React.ReactNode;
  /** Epoch ms. Drives the live timer while running. */
  startedAt?: number;
  /** Epoch ms. With startedAt, fixes the duration once it stops. */
  endedAt?: number;
  /** Epoch ms of the last sign of life; a running agent quiet for `stallAfter` is flagged. Default: startedAt. */
  lastActivityAt?: number;
  tokens?: number;
  /** 0–1, when the agent can tell. */
  progress?: number;
  /** Transcript shown when the row opens. */
  log?: readonly SubagentLogEntry[];
  /** Shown in the open row of a finished agent. */
  result?: React.ReactNode;
  error?: React.ReactNode;
}

export interface SubagentListProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  agents: readonly Subagent[];
  /** Default "Subagents". */
  title?: React.ReactNode;
  /** Shows Retry on failed and cancelled agents. */
  onRetry?: (id: string) => void;
  /** Shows Stop on running and queued agents. */
  onCancel?: (id: string) => void;
  /** Open rows (controlled). */
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** ms of silence before a running agent is flagged as possibly stuck. Default 45000; 0 turns it off. */
  stallAfter?: number;
  /** Reference time for timers (tests, SSR, replays). Default: the client clock, ticking every second. */
  now?: number;
}

const STATUS_LABEL: Record<SubagentStatus, string> = { queued: "Queued", running: "Running", done: "Done", failed: "Failed", cancelled: "Stopped" };

const tickEverySecond = (onChange: () => void) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};
const noTick = () => () => {};
const secondSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverSnapshot = () => null;
function useSecondClock(active: boolean): number | null {
  return React.useSyncExternalStore(active ? tickEverySecond : noTick, secondSnapshot, serverSnapshot);
}

/** "0:07", "1:42", "1:02:03". */
const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

/** 950 → "950", 12_400 → "12.4k", 1_250_000 → "1.25M". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
}

const HUES = ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)", "var(--pui-chart-6)", "var(--pui-chart-7)"];

const textOf = (node: React.ReactNode): string => (typeof node === "string" || typeof node === "number" ? String(node) : "");

function Mark({ agent, reduced }: { agent: Subagent; reduced: boolean }) {
  const color = HUES[djb2(agent.id) % HUES.length];
  const initial = textOf(agent.name).trim().charAt(0).toUpperCase() || "•";
  const running = agent.status === "running";
  return (
    <span aria-hidden="true" className={cn(blockReset, "relative inline-flex size-8 shrink-0 items-center justify-center")}>
      {running ? (
        <svg viewBox="0 0 32 32" className={cn(blockReset, "absolute inset-0 size-8", !reduced && "animate-spin [animation-duration:1.4s]")}>
          <circle cx="16" cy="16" r="14.5" fill="none" stroke={color} strokeOpacity="0.2" strokeWidth="2" />
          <circle cx="16" cy="16" r="14.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="22 70" />
        </svg>
      ) : null}
      <span
        style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
        className={cn(
          blockReset,
          "relative inline-flex size-6 items-center justify-center rounded-pui-full text-[0.6875rem] font-semibold",
          (agent.status === "queued" || agent.status === "cancelled") && "opacity-55 grayscale",
        )}
      >
        {initial}
      </span>
      {agent.status === "done" || agent.status === "failed" ? (
        <motion.span
          initial={reduced ? false : { scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.bouncy}
          className={cn(
            blockReset,
            "absolute -end-0.5 -bottom-0.5 inline-flex size-3.5 items-center justify-center rounded-pui-full ring-2 ring-pui-background",
            agent.status === "done" ? "bg-pui-success text-pui-success-foreground" : "bg-pui-danger text-pui-danger-foreground",
          )}
        >
          {agent.status === "done" ? <CheckIcon className="size-2.5" strokeWidth={3} /> : <XIcon className="size-2.5" strokeWidth={3} />}
        </motion.span>
      ) : null}
    </span>
  );
}

const actionClass = cn(
  controlReset,
  focusRing,
  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground [&_svg]:size-3.5",
);

/**
 * Parallel agent work at a glance: a header with "3 of 5 done", a segmented bar (one segment per
 * worker) and total tokens, then one compact row per subagent with its live step, elapsed time
 * and tokens. Running agents that go quiet for `stallAfter` are flagged as possibly stuck. A row
 * opens into its transcript and result; failed ones offer Retry, running ones Stop.
 * The ref goes to the section.
 */
export const SubagentList = React.forwardRef<HTMLElement, SubagentListProps>(function SubagentList(
  {
    agents,
    title = "Subagents",
    onRetry,
    onCancel,
    expanded: expandedProp,
    defaultExpanded = [],
    onExpandedChange,
    stallAfter = 45_000,
    now: nowProp,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const anyRunning = agents.some((a) => a.status === "running");
  const ticking = useSecondClock(nowProp === undefined && anyRunning);
  const now = nowProp ?? ticking;
  const [expandedState, setExpandedState] = React.useState<readonly string[]>(defaultExpanded);
  const expanded = expandedProp ?? expandedState;
  const toggle = (agentId: string) => {
    const next = expanded.includes(agentId) ? expanded.filter((x) => x !== agentId) : [...expanded, agentId];
    if (expandedProp === undefined) setExpandedState(next);
    onExpandedChange?.(next);
  };

  const counts = { queued: 0, running: 0, done: 0, failed: 0, cancelled: 0 } satisfies Record<SubagentStatus, number>;
  let tokens = 0;
  let firstStart = Infinity;
  let lastEnd = 0;
  for (const a of agents) {
    counts[a.status]++;
    tokens += a.tokens ?? 0;
    if (a.startedAt !== undefined) firstStart = Math.min(firstStart, a.startedAt);
    if (a.endedAt !== undefined) lastEnd = Math.max(lastEnd, a.endedAt);
  }
  const finished = counts.done + counts.failed + counts.cancelled;
  const total = agents.length;
  const wall = firstStart === Infinity ? null : anyRunning || counts.queued > 0 ? (now === null ? null : now - firstStart) : lastEnd > 0 ? lastEnd - firstStart : null;
  const stalled = (a: Subagent) =>
    stallAfter > 0 && a.status === "running" && now !== null && (a.lastActivityAt ?? a.startedAt) !== undefined && now - (a.lastActivityAt ?? a.startedAt ?? now) >= stallAfter;
  const stalledCount = agents.filter(stalled).length;

  const headline =
    total === 0
      ? "No subagents yet"
      : finished === total
        ? counts.failed > 0
          ? `${counts.done} of ${total} done · ${counts.failed} failed`
          : `All ${total} done`
        : `${counts.done} of ${total} done`;
  const parts = [
    counts.running ? `${counts.running} running` : null,
    counts.queued ? `${counts.queued} queued` : null,
    finished !== total && counts.failed ? `${counts.failed} failed` : null,
    counts.cancelled ? `${counts.cancelled} stopped` : null,
  ].filter(Boolean);

  const headingId = `${id}-title`;

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xs", className)}
    >
      <header className={cn(blockReset, "flex flex-col gap-2.5 border-b border-pui-border px-4 pt-3.5 pb-3")}>
        <div className={cn(blockReset, "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1")}>
          <div className={cn(blockReset, "min-w-0")}>
            <h3 id={headingId} className={cn(blockReset, "text-xs font-medium tracking-wide text-pui-muted-foreground uppercase")}>
              {title}
            </h3>
            <p role="status" className={cn(blockReset, "text-sm font-semibold text-pui-foreground")}>
              {headline}
              {parts.length ? <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}> · {parts.join(" · ")}</span> : null}
            </p>
          </div>
          <p className={cn(blockReset, "flex shrink-0 items-center gap-3 text-xs text-pui-muted-foreground tabular-nums")}>
            {stalledCount > 0 ? (
              <span className={cn(blockReset, "inline-flex items-center gap-1 font-medium text-pui-warning-text")}>
                <TriangleAlertIcon className="size-3.5" />
                {stalledCount} quiet
              </span>
            ) : null}
            {tokens > 0 ? <span className={cn(blockReset)}>{formatTokens(tokens)} tokens</span> : null}
            {wall !== null ? <span className={cn(blockReset)}>{clock(wall)}</span> : null}
          </p>
        </div>
        <div role="img" aria-label={[headline, ...parts].join(", ")} className={cn(blockReset, "flex h-1.5 w-full gap-1")}>
          {agents.map((a) => (
            <span key={a.id} className={cn(blockReset, "relative h-full min-w-1 flex-1 overflow-hidden rounded-pui-full bg-pui-muted")}>
              <motion.span
                initial={false}
                animate={{
                  scaleX: a.status === "queued" ? 0 : a.status === "running" ? Math.max(0.12, Math.min(1, a.progress ?? 0.5)) : 1,
                }}
                transition={reduced ? { duration: 0 } : { duration: durations.page, ease: easings.out }}
                className={cn(
                  blockReset,
                  "absolute inset-0 origin-left rounded-pui-full",
                  a.status === "done" ? "bg-pui-success" : a.status === "failed" ? "bg-pui-danger" : a.status === "cancelled" ? "bg-pui-muted-foreground/40" : stalled(a) ? "bg-pui-warning" : "bg-pui-info",
                )}
              />
              {a.status === "running" && !reduced ? (
                <span className={cn(blockReset, "absolute inset-y-0 start-0 w-1/4 bg-linear-to-r from-transparent via-pui-background/70 to-transparent motion-safe:animate-pui-indeterminate")} />
              ) : null}
            </span>
          ))}
        </div>
      </header>
      {total === 0 ? (
        <p className={cn(blockReset, "px-4 py-6 text-center text-sm text-pui-muted-foreground")}>Work fans out here when the agent splits a task.</p>
      ) : (
        <ul className={cn(listReset, "flex flex-col")}>
          {agents.map((a) => {
            const open = expanded.includes(a.id);
            const panelId = `${id}-panel-${a.id}`;
            const quiet = stalled(a);
            const elapsed =
              a.startedAt === undefined ? null : a.endedAt !== undefined ? a.endedAt - a.startedAt : a.status === "running" && now !== null ? now - a.startedAt : null;
            const silentFor = quiet && now !== null ? now - (a.lastActivityAt ?? a.startedAt ?? now) : 0;
            const canRetry = onRetry && (a.status === "failed" || a.status === "cancelled");
            const canCancel = onCancel && (a.status === "running" || a.status === "queued");
            const hasBody = (a.log && a.log.length > 0) || a.result !== undefined || a.error !== undefined || a.task !== undefined;
            return (
              <li key={a.id} className={cn(blockReset, "border-b border-pui-border/70 last:border-b-0", a.status === "failed" && "bg-pui-danger/4", quiet && "bg-pui-warning/5")}>
                <div className={cn(blockReset, "flex items-center gap-1 pe-2")}>
                  <button
                    type="button"
                    aria-expanded={hasBody ? open : undefined}
                    aria-controls={hasBody && open ? panelId : undefined}
                    disabled={!hasBody}
                    onClick={() => toggle(a.id)}
                    className={cn(controlReset, focusRing, "flex min-w-0 flex-1 items-center gap-3 py-2.5 ps-3 text-start focus-visible:outline-offset-[-2px]", hasBody ? "cursor-pointer" : "cursor-default")}
                  >
                    <Mark agent={a} reduced={reduced} />
                    <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
                      <span className={cn(blockReset, "flex min-w-0 items-center gap-2")}>
                        <span className={cn(blockReset, "truncate text-sm font-medium text-pui-foreground", a.status === "cancelled" && "text-pui-muted-foreground line-through decoration-pui-muted-foreground/50")}>{a.name}</span>
                        <span className={cn(blockReset, "sr-only")}>{`, ${STATUS_LABEL[a.status]}${quiet ? ", no activity" : ""}`}</span>
                      </span>
                      <span className={cn(blockReset, "relative block h-4 min-w-0 overflow-hidden text-xs leading-4")}>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={`${a.status}:${textOf(a.step) || "step"}`}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                            transition={{ duration: durations.base, ease: easings.out }}
                            className={cn(
                              blockReset,
                              "block truncate",
                              a.status === "failed" ? "text-pui-danger-text" : quiet ? "text-pui-warning-text" : "text-pui-muted-foreground",
                            )}
                          >
                            {quiet ? `No activity for ${clock(silentFor)}${a.step ? " · " : ""}` : null}
                            {a.step ?? (a.status === "queued" ? "Waiting to start" : a.status === "cancelled" ? "Stopped" : a.status === "failed" ? "Failed" : a.status === "done" ? "Finished" : "Starting…")}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </span>
                    <span className={cn(blockReset, "flex shrink-0 flex-col items-end text-xs leading-4 tabular-nums")}>
                      <span className={cn(blockReset, a.status === "running" ? "text-pui-foreground" : "text-pui-muted-foreground")}>{elapsed !== null ? clock(elapsed) : a.status === "queued" ? "—" : ""}</span>
                      <span className={cn(blockReset, "text-pui-muted-foreground")}>{a.tokens !== undefined ? `${formatTokens(a.tokens)} tok` : ""}</span>
                    </span>
                    {hasBody ? (
                      <motion.span aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={reduced ? { duration: 0 } : springs.snappy} className={cn(blockReset, "inline-flex text-pui-muted-foreground")}>
                        <ChevronDownIcon className="size-4" />
                      </motion.span>
                    ) : (
                      <span aria-hidden="true" className={cn(blockReset, "inline-block size-4")} />
                    )}
                  </button>
                  {canRetry ? (
                    <button type="button" onClick={() => onRetry(a.id)} aria-label={`Retry ${textOf(a.name) || "agent"}`} className={actionClass}>
                      <RotateCcwIcon />
                      <span className={cn(blockReset, "hidden sm:inline")}>Retry</span>
                    </button>
                  ) : null}
                  {canCancel ? (
                    <button type="button" onClick={() => onCancel(a.id)} aria-label={`Stop ${textOf(a.name) || "agent"}`} className={actionClass}>
                      <MinusIcon />
                      <span className={cn(blockReset, "hidden sm:inline")}>Stop</span>
                    </button>
                  ) : null}
                </div>
                <AnimatePresence initial={false}>
                  {hasBody && open ? (
                    <motion.div
                      key="panel"
                      id={panelId}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={reduced ? { duration: durations.fast } : { duration: durations.slow, ease: easings.out }}
                      className={cn(blockReset, "overflow-hidden")}
                    >
                      <div className={cn(blockReset, "flex flex-col gap-2 ps-14 pe-4 pb-3")}>
                        {a.task ? (
                          <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                            <span className={cn(blockReset, "font-medium text-pui-foreground")}>Task: </span>
                            {a.task}
                          </p>
                        ) : null}
                        {a.log && a.log.length > 0 ? (
                          <ol aria-label="Transcript" className={cn(listReset, "flex max-h-48 flex-col gap-1 overflow-y-auto rounded-pui-lg border border-pui-border bg-pui-muted/40 p-2.5 text-xs leading-relaxed")}>
                            {a.log.map((entry, i) => (
                              <li
                                key={entry.id ?? i}
                                className={cn(
                                  blockReset,
                                  "flex min-w-0 gap-2",
                                  entry.kind === "tool" && "font-mono text-[0.6875rem] text-pui-info-text",
                                  entry.kind === "error" && "text-pui-danger-text",
                                  entry.kind === "output" && "text-pui-foreground",
                                  (entry.kind === undefined || entry.kind === "info") && "text-pui-muted-foreground",
                                )}
                              >
                                {entry.at !== undefined && a.startedAt !== undefined ? (
                                  <span className={cn(blockReset, "w-9 shrink-0 font-mono text-[0.6875rem] text-pui-muted-foreground/80 tabular-nums")}>+{clock(entry.at - a.startedAt)}</span>
                                ) : null}
                                <span className={cn(blockReset, "min-w-0 [overflow-wrap:anywhere]")}>
                                  {entry.kind === "tool" ? "› " : null}
                                  {entry.text}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                        {a.error ? (
                          <p className={cn(blockReset, "rounded-pui-lg border border-pui-danger/25 bg-pui-danger/6 px-2.5 py-2 text-xs text-pui-danger-text")}>{a.error}</p>
                        ) : null}
                        {a.result ? <div className={cn(blockReset, "rounded-pui-lg border border-pui-success/25 bg-pui-success/6 px-2.5 py-2 text-xs text-pui-foreground")}>{a.result}</div> : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});
