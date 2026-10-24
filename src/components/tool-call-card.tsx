"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, CircleXIcon, ClockIcon, ShieldIcon, WrenchIcon, XIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { CopyButton } from "./copy-button";
export type ToolCallStatus = "pending" | "awaiting-approval" | "running" | "success" | "error" | "denied";
export interface ToolCallCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Tool identifier, shown in monospace, e.g. "search_flights". */
  name: string;
  /** Friendly title shown before the name, e.g. "Search flights". */
  title?: React.ReactNode;
  /** Default "pending". */
  status?: ToolCallStatus;
  /** Arguments the model passed. Objects are pretty-printed as JSON. */
  input?: unknown;
  /** Result of the call. Objects are pretty-printed as JSON; elements render as-is. */
  output?: unknown;
  /** Shown in the error pane when status is "error". */
  error?: React.ReactNode;
  /** Run time in milliseconds, shown in the header. */
  durationMs?: number;
  /** Shown above the approval buttons, e.g. why the tool needs consent. */
  approvalMessage?: React.ReactNode;
  /** Approve button while status is "awaiting-approval". May return a promise (buttons show loading). */
  onApprove?: () => void | Promise<void>;
  /** Deny button while status is "awaiting-approval". */
  onDeny?: () => void | Promise<void>;
  /** Default "Run". */
  approveLabel?: string;
  /** Default "Deny". */
  denyLabel?: string;
  /** Details (input/output) open state. Default: open for "awaiting-approval" and "error". */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Replaces the wrench icon. */
  icon?: React.ReactNode;
}
const statusMeta: Record<ToolCallStatus, { label: string; tone: Tone }> = {
  pending: { label: "Queued", tone: "neutral" },
  "awaiting-approval": { label: "Needs approval", tone: "warning" },
  running: { label: "Running", tone: "info" },
  success: { label: "Done", tone: "success" },
  error: { label: "Failed", tone: "danger" },
  denied: { label: "Denied", tone: "neutral" },
};
const autoOpen = (status: ToolCallStatus) => status === "awaiting-approval" || status === "error";
/** JSON for objects, the string itself for strings. */
function toText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
function formatMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}
/**
 * Agent tool-call card: what ran, with which arguments, and how it went. A status pill (queued,
 * needs approval, running, done, failed, denied), collapsible input and output panes with copy, a
 * running progress sweep and a built-in human-in-the-loop step with Run and Deny buttons.
 */
export const ToolCallCard = React.forwardRef<HTMLElement, ToolCallCardProps>(function ToolCallCard(
  {
    name,
    title,
    status = "pending",
    input,
    output,
    error,
    durationMs,
    approvalMessage,
    onApprove,
    onDeny,
    approveLabel = "Run",
    denyLabel = "Deny",
    open: openProp,
    defaultOpen,
    onOpenChange,
    icon,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen ?? autoOpen(status),
    onChange: onOpenChange,
    name: "open",
  });
  const [busy, setBusy] = React.useState<"approve" | "deny" | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const prevStatus = React.useRef(status);
  // Approval requests and failures need eyes on the details, so they open the card.
  React.useEffect(() => {
    if (prevStatus.current === status) return;
    prevStatus.current = status;
    setBusy(null);
    setAnnouncement(`${name}: ${statusMeta[status].label}`);
    if (autoOpen(status)) setOpen(true);
  }, [status, name, setOpen]);
  const meta = statusMeta[status];
  const hasInput = input !== undefined;
  const hasOutput = output !== undefined && status === "success";
  const hasError = status === "error" && error != null;
  const hasDetails = hasInput || hasOutput || hasError;
  const awaiting = status === "awaiting-approval";
  const act = async (which: "approve" | "deny") => {
    const handler = which === "approve" ? onApprove : onDeny;
    if (!handler || busy) return;
    setBusy(which);
    try {
      await handler();
    } catch {
      setBusy(null);
    }
  };
  const transition = reduced ? { duration: 0 } : { duration: 0.26, ease: easings.out };
  return (
    <article
      ref={ref}
      aria-labelledby={`${id}-name`}
      data-status={status}
      {...props}
      className={cn(
        blockReset,
        "relative w-full min-w-0 overflow-hidden rounded-pui-lg border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        awaiting ? "border-pui-warning/50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-warning)_14%,transparent)]" : "border-pui-border",
        status === "error" && "border-pui-danger/40",
        className,
      )}
    >
      {status === "running" ? (
        <span aria-hidden="true" className={cn(blockReset, "absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-pui-info/15")}>
          <span className={cn(blockReset, "block h-full w-1/4 bg-pui-info motion-safe:animate-pui-indeterminate motion-reduce:w-full motion-reduce:opacity-50")} />
        </span>
      ) : null}
      <div className={cn(blockReset, "flex items-center gap-3 px-3 py-2.5")}>
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "flex size-8 shrink-0 items-center justify-center rounded-pui-md border border-pui-border bg-pui-muted text-pui-muted-foreground",
          )}
        >
          {icon ?? <WrenchIcon className="size-4" />}
        </span>
        <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
          <span id={`${id}-name`} className={cn(blockReset, "flex min-w-0 items-baseline gap-2")}>
            {title ? <span className={cn(blockReset, "truncate font-medium text-pui-foreground")}>{title}</span> : null}
            <code
              className={cn(
                blockReset,
                "truncate font-pui-mono text-xs",
                title ? "text-pui-muted-foreground" : "text-sm font-medium text-pui-foreground",
              )}
            >
              {name}
            </code>
          </span>
        </span>
        {durationMs !== undefined && (status === "success" || status === "error") ? (
          <span className={cn(blockReset, "hidden shrink-0 text-xs tabular-nums text-pui-muted-foreground sm:inline")}>{formatMs(durationMs)}</span>
        ) : null}
        <StatusPill status={status} label={meta.label} tone={meta.tone} reduced={reduced} />
        {hasDetails ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-details`}
            aria-label={open ? `Hide details for ${name}` : `Show details for ${name}`}
            onClick={() => setOpen(!open)}
            className={cn(
              controlReset,
              focusRing,
              "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
            )}
          >
            <ChevronDownIcon
              className={cn("size-4 transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none", open && "rotate-180")}
            />
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {open && hasDetails ? (
          <motion.div
            key="details"
            id={`${id}-details`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className={cn(blockReset, "overflow-hidden")}
          >
            <div className={cn(blockReset, "flex flex-col gap-2.5 border-t border-pui-border px-3 py-3")}>
              {hasInput ? <Pane label="Input" text={toText(input)} /> : null}
              {hasOutput ? (
                React.isValidElement(output) ? (
                  <section aria-label="Output" className={cn(blockReset, "flex flex-col gap-1.5")}>
                    <PaneLabel>Output</PaneLabel>
                    {output}
                  </section>
                ) : (
                  <Pane label="Output" text={toText(output)} />
                )
              ) : null}
              {hasError ? (
                <div
                  className={cn(
                    blockReset,
                    "flex items-start gap-2 rounded-pui-md border border-pui-danger/30 bg-pui-danger/8 px-3 py-2 text-xs text-pui-danger-text",
                  )}
                >
                  <CircleXIcon className="mt-px size-3.5" />
                  <span className={cn(blockReset, "min-w-0 break-words")}>{error}</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {awaiting && (onApprove || onDeny) ? (
        <div
          className={cn(
            blockReset,
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-pui-warning/30 bg-pui-warning/8 px-3 py-2.5",
          )}
        >
          <span className={cn(blockReset, "flex min-w-0 items-center gap-2 text-xs text-pui-warning-text")}>
            <ShieldIcon className="size-3.5" />
            <span className={cn(blockReset, "min-w-0")}>{approvalMessage ?? "This tool needs your OK before it runs."}</span>
          </span>
          <span className={cn(blockReset, "flex shrink-0 gap-2")}>
            {onDeny ? (
              <Button
                size="sm"
                variant="outline"
                tone="neutral"
                loading={busy === "deny"}
                disabled={busy === "approve"}
                aria-label={`${denyLabel} ${name}`}
                onClick={() => void act("deny")}
              >
                {denyLabel}
              </Button>
            ) : null}
            {onApprove ? (
              <Button
                size="sm"
                loading={busy === "approve"}
                disabled={busy === "deny"}
                aria-label={`${approveLabel} ${name}`}
                onClick={() => void act("approve")}
              >
                {approveLabel}
              </Button>
            ) : null}
          </span>
        </div>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </article>
  );
});
function PaneLabel({ children }: { children: React.ReactNode }) {
  return <span className={cn(blockReset, "text-[0.7rem] font-medium tracking-wide text-pui-muted-foreground uppercase")}>{children}</span>;
}
/** Panes longer than this many lines are clamped behind a "Show all" toggle (no keyboard-trapping scroll box). */
const CLAMP_LINES = 12;
function Pane({ label, text }: { label: string; text: string }) {
  const [full, setFull] = React.useState(false);
  const lines = text.split("\n").length;
  const clamped = lines > CLAMP_LINES && !full;
  return (
    <section aria-label={label} className={cn(blockReset, "flex flex-col gap-1.5")}>
      <span className={cn(blockReset, "flex items-center justify-between")}>
        <PaneLabel>{label}</PaneLabel>
        <CopyButton value={text} label={`Copy ${label.toLowerCase()}`} size="sm" variant="ghost" className="-my-1" />
      </span>
      <span className={cn(blockReset, "relative block")}>
        <pre
          className={cn(
            blockReset,
            "overflow-hidden rounded-pui-md border border-pui-border bg-pui-muted/50 px-3 py-2 font-pui-mono text-xs leading-5 break-words whitespace-pre-wrap text-pui-foreground",
            clamped && "max-h-64",
          )}
        >
          {text}
        </pre>
        {clamped ? (
          <span
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-pui-md bg-linear-to-t from-pui-surface to-transparent")}
          />
        ) : null}
      </span>
      {lines > CLAMP_LINES ? (
        <button
          type="button"
          aria-expanded={full}
          onClick={() => setFull(!full)}
          className={cn(controlReset, focusRing, "cursor-pointer self-start rounded-pui-sm text-xs font-medium text-pui-primary-text hover:underline")}
        >
          {full ? "Show less" : `Show all ${lines} lines`}
        </button>
      ) : null}
    </section>
  );
}
const pillIcon: Record<ToolCallStatus, React.ReactNode> = {
  pending: <ClockIcon className="size-3" />,
  "awaiting-approval": <ShieldIcon className="size-3" />,
  running: null,
  success: <CheckIcon className="size-3" strokeWidth={3} />,
  error: <XIcon className="size-3" strokeWidth={3} />,
  denied: <XIcon className="size-3" />,
};
function StatusPill({ status, label, tone, reduced }: { status: ToolCallStatus; label: string; tone: Tone; reduced: boolean }) {
  return (
    <span
      className={cn(
        blockReset,
        toneClasses[tone],
        "relative inline-flex h-6 shrink-0 items-center overflow-hidden rounded-pui-full bg-(--pui-tone)/12 px-2 text-xs font-medium text-(--pui-tone-text)",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 }}
          transition={springs.snappy}
          className={cn(blockReset, "inline-flex items-center gap-1")}
        >
          {status === "running" ? (
            <span aria-hidden="true" className={cn(blockReset, "size-3 animate-spin rounded-pui-full border-[1.5px] border-current border-t-transparent motion-reduce:[animation-duration:1.5s]")} />
          ) : (
            pillIcon[status]
          )}
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
