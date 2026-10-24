"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, focusRing, listReset } from "../lib/styles";
import type { Align, Side, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export interface ContextMeterSegment {
  /** What uses the window, e.g. "System prompt", "Messages", "Files". */
  label: string;
  tokens: number;
  /** CSS color. Default: the chart palette (--pui-chart-1..8) in order. */
  color?: string;
}
export type ContextMeterStatus = "ok" | "warning" | "critical" | "full";
export interface ContextMeterPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Tokens in the context window. Default: the sum of `breakdown`. */
  used?: number;
  /** Size of the model's context window in tokens (must be > 0). */
  max: number;
  /** What the used tokens are made of; drawn as stacked segments with a legend. */
  breakdown?: readonly ContextMeterSegment[];
  /** Fractions of max where the tone changes. Default { warning: 0.75, critical: 0.9 }. */
  thresholds?: { warning?: number; critical?: number };
  /** Input price per 1M tokens; shows the estimated cost of the next request. */
  pricePerMillion?: number;
  /** ISO currency for the cost. Default "USD". */
  currency?: string;
  /** Shows a "Compact" action; a returned promise shows a pending state until it settles. */
  onCompact?: () => void | Promise<void>;
  /** Default "Compact conversation". */
  compactLabel?: React.ReactNode;
  /** Formats token counts. Default: compact notation ("76.2K"). */
  formatTokens?: (tokens: number) => string;
  /** Default "Context window". */
  title?: React.ReactNode;
  /** Model name shown under the title. */
  model?: React.ReactNode;
  /** Number formatting locale. Default: the user's locale. */
  locale?: string;
}
export interface ContextMeterProps extends ContextMeterPanelProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel side. Default "top" (meters usually sit in a composer footer). */
  side?: Side;
  /** Default "end". */
  align?: Align;
  /** Show the percentage next to the ring. Default true. */
  showPercent?: boolean;
  /** Classes for the trigger button. */
  triggerClassName?: string;
}
const statusTone: Record<ContextMeterStatus, Tone> = { ok: "primary", warning: "warning", critical: "danger", full: "danger" };
const toneVar: Record<Tone, string> = {
  neutral: "var(--pui-foreground)",
  primary: "var(--pui-primary)",
  success: "var(--pui-success)",
  warning: "var(--pui-warning)",
  danger: "var(--pui-danger)",
  info: "var(--pui-info)",
};
const toneText: Record<Tone, string> = {
  neutral: "text-pui-foreground",
  primary: "text-pui-muted-foreground",
  success: "text-pui-success-text",
  warning: "text-pui-warning-text",
  danger: "text-pui-danger-text",
  info: "text-pui-info-text",
};
const finite = (n: number | undefined, fallback = 0) => (n !== undefined && Number.isFinite(n) ? n : fallback);
/** Status of a context window fill against its thresholds. */
export function contextStatus(used: number, max: number, thresholds: { warning?: number; critical?: number } = {}): ContextMeterStatus {
  const ratio = max > 0 ? used / max : 0;
  if (ratio >= 1) return "full";
  if (ratio >= (thresholds.critical ?? 0.9)) return "critical";
  if (ratio >= (thresholds.warning ?? 0.75)) return "warning";
  return "ok";
}
interface Model {
  used: number;
  max: number;
  ratio: number;
  percent: number;
  status: ContextMeterStatus;
  tone: Tone;
  format: (n: number) => string;
  segments: { label: string; tokens: number; color: string }[];
}
function useContextModel({
  used: usedProp,
  max: maxProp,
  breakdown,
  thresholds,
  formatTokens,
  locale,
}: Pick<ContextMeterPanelProps, "used" | "max" | "breakdown" | "thresholds" | "formatTokens" | "locale">): Model {
  const max = finite(maxProp) > 0 ? maxProp : 1;
  const segments = (breakdown ?? []).map((s, i) => ({
    label: s.label,
    tokens: Math.max(0, finite(s.tokens)),
    color: s.color ?? `var(--pui-chart-${(i % 8) + 1})`,
  }));
  const used = Math.max(0, finite(usedProp, segments.reduce((sum, s) => sum + s.tokens, 0)));
  const ratio = Math.min(1, used / max);
  const status = contextStatus(used, max, thresholds);
  const format = React.useMemo(() => {
    if (formatTokens) return formatTokens;
    const nf = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    return (n: number) => nf.format(n);
  }, [formatTokens, locale]);
  return { used, max, ratio, percent: Math.round((used / max) * 100), status, tone: statusTone[status], format, segments };
}
function statusMessage(model: Model): string | null {
  const left = model.format(Math.max(0, model.max - model.used));
  if (model.status === "full") return "The window is full. Older messages are being dropped.";
  if (model.status === "critical") return `Only ${left} tokens left. Compact soon to keep earlier context.`;
  if (model.status === "warning") return `${left} tokens left before older messages are dropped.`;
  return null;
}
/** The small progress ring used by the trigger. */
function Ring({ ratio, tone, reduced }: { ratio: number; tone: Tone; reduced: boolean }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" className={cn(blockReset, "block size-[1.125rem] shrink-0 -rotate-90")}>
      <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" className="stroke-pui-muted" />
      <motion.circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={reduced ? false : { strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - ratio) }}
        transition={reduced ? { duration: 0 } : springs.smooth}
        style={{ stroke: toneVar[tone] }}
      />
    </svg>
  );
}
/**
 * Breakdown of an AI context window: tokens used of the limit as a stacked bar (system prompt,
 * messages, files...), what is left, the estimated cost of the next request and a compact action.
 * Use inline in a sidebar, or through ContextMeter as a popover from a composer footer.
 */
export const ContextMeterPanel = React.forwardRef<HTMLDivElement, ContextMeterPanelProps>(function ContextMeterPanel(
  {
    used: usedProp,
    max: maxProp,
    breakdown,
    thresholds,
    pricePerMillion,
    currency = "USD",
    onCompact,
    compactLabel = "Compact conversation",
    formatTokens,
    title = "Context window",
    model: modelName,
    locale,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const titleId = React.useId();
  const m = useContextModel({ used: usedProp, max: maxProp, breakdown, thresholds, formatTokens, locale });
  const [pending, setPending] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const segments = m.segments.length > 0 ? m.segments : [{ label: "Used", tokens: m.used, color: toneVar[m.tone] }];
  const message = statusMessage(m);
  const cost =
    pricePerMillion !== undefined && Number.isFinite(pricePerMillion)
      ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 3 }).format((m.used / 1_000_000) * pricePerMillion)
      : null;
  const compact = () => {
    if (!onCompact || pending) return;
    const result = onCompact();
    if (result && typeof result.then === "function") {
      setPending(true);
      result.then(
        () => mounted.current && setPending(false),
        () => mounted.current && setPending(false),
      );
    }
  };
  const valueText = `${m.format(m.used)} of ${m.format(m.max)} tokens (${m.percent}%)`;
  return (
    <div
      ref={ref}
      data-status={m.status}
      aria-labelledby={titleId}
      role="group"
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      <div className={cn(blockReset, "flex items-start justify-between gap-3")}>
        <div className={cn(blockReset, "flex min-w-0 flex-col")}>
          <span id={titleId} className={cn(blockReset, "text-sm font-semibold")}>
            {title}
          </span>
          {modelName ? <span className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>{modelName}</span> : null}
        </div>
        <span
          className={cn(
            blockReset,
            "shrink-0 rounded-pui-full px-2 py-0.5 text-xs font-medium tabular-nums",
            m.status === "ok" ? "bg-pui-muted text-pui-muted-foreground" : m.status === "warning" ? "bg-pui-warning/15 text-pui-warning-text" : "bg-pui-danger/15 text-pui-danger-text",
          )}
        >
          {m.percent}% used
        </span>
      </div>
      <div className={cn(blockReset, "flex items-baseline gap-1.5 tabular-nums")}>
        <span className={cn(blockReset, "text-2xl font-semibold tracking-tight")}>{m.format(m.used)}</span>
        <span className={cn(blockReset, "text-sm text-pui-muted-foreground")}>/ {m.format(m.max)} tokens</span>
      </div>
      <div
        role="meter"
        aria-labelledby={titleId}
        aria-valuemin={0}
        aria-valuemax={m.max}
        aria-valuenow={Math.min(m.used, m.max)}
        aria-valuetext={valueText}
        className={cn(blockReset, "relative h-2.5 w-full overflow-hidden rounded-pui-full bg-pui-muted")}
      >
        <motion.span
          aria-hidden="true"
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduced ? { duration: 0 } : springs.smooth}
          className={cn(
            blockReset,
            "absolute inset-y-0 start-0 flex origin-left gap-px overflow-hidden rounded-pui-full transition-[width] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none rtl:origin-right",
          )}
          style={{ width: `${m.ratio * 100}%` }}
        >
          {segments.map((s, i) => (
            <span
              key={`${s.label}-${i}`}
              data-part="segment"
              className={cn(blockReset, "h-full min-w-0.5 transition-[flex-grow] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none")}
              style={{ flexGrow: s.tokens, flexBasis: 0, backgroundColor: s.color }}
            />
          ))}
        </motion.span>
      </div>
      {m.segments.length > 0 ? (
        <ul className={cn(listReset, "flex flex-col gap-1.5 text-xs")}>
          {m.segments.map((s, i) => (
            <li key={`${s.label}-${i}`} className={cn(blockReset, "flex items-center gap-2")}>
              <span aria-hidden="true" className={cn(blockReset, "size-2 shrink-0 rounded-pui-full")} style={{ backgroundColor: s.color }} />
              <span className={cn(blockReset, "min-w-0 flex-1 truncate")}>{s.label}</span>
              <span className={cn(blockReset, "tabular-nums text-pui-foreground")}>{m.format(s.tokens)}</span>
              <span className={cn(blockReset, "w-9 text-end tabular-nums text-pui-muted-foreground")}>{Math.round((s.tokens / m.max) * 100)}%</span>
            </li>
          ))}
          <li className={cn(blockReset, "flex items-center gap-2 border-t border-pui-border pt-1.5")}>
            <span aria-hidden="true" className={cn(blockReset, "size-2 shrink-0 rounded-pui-full border border-pui-border bg-pui-muted")} />
            <span className={cn(blockReset, "min-w-0 flex-1 truncate text-pui-muted-foreground")}>Free</span>
            <span className={cn(blockReset, "tabular-nums text-pui-foreground")}>{m.format(Math.max(0, m.max - m.used))}</span>
            <span className={cn(blockReset, "w-9 text-end tabular-nums text-pui-muted-foreground")}>{Math.max(0, 100 - m.percent)}%</span>
          </li>
        </ul>
      ) : null}
      {message ? (
        <p role={m.status === "ok" ? undefined : "status"} className={cn(blockReset, "text-xs", toneText[m.tone])}>
          {message}
        </p>
      ) : null}
      {cost || onCompact ? (
        <div className={cn(blockReset, "flex items-center justify-between gap-3 border-t border-pui-border pt-3")}>
          {cost ? (
            <span className={cn(blockReset, "flex flex-col text-xs text-pui-muted-foreground")}>
              <span>Next request</span>
              <span className={cn(blockReset, "whitespace-nowrap font-medium tabular-nums text-pui-foreground")}>≈ {cost} input</span>
            </span>
          ) : (
            <span />
          )}
          {onCompact ? (
            <Button size="sm" variant={m.status === "ok" ? "outline" : "solid"} loading={pending} onClick={compact}>
              {compactLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
/**
 * Compact context-window ring for an AI composer footer. Shows the fill and percentage at a glance;
 * the tone moves to warning and danger near the limit, and clicking opens ContextMeterPanel with the
 * breakdown, remaining budget, cost estimate and compact action. The ref goes to the panel.
 */
export const ContextMeter = React.forwardRef<HTMLDivElement, ContextMeterProps>(function ContextMeter(
  { open, defaultOpen, onOpenChange, side = "top", align = "end", showPercent = true, triggerClassName, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const m = useContextModel(props);
  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={`Context window: ${m.format(m.used)} of ${m.format(m.max)} tokens used (${m.percent}%)`}
        data-status={m.status}
        className={cn(
          focusRing,
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 text-xs font-medium tabular-nums text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground data-[state=open]:bg-pui-muted",
          m.status !== "ok" && toneText[m.tone],
          triggerClassName,
        )}
      >
        <Ring ratio={m.ratio} tone={m.tone} reduced={reduced} />
        {showPercent ? <span aria-hidden="true">{m.percent}%</span> : null}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} aria-label="Context window" className="w-[min(20rem,calc(100vw-1rem))] p-4">
        <ContextMeterPanel ref={ref} {...props} />
      </PopoverContent>
    </Popover>
  );
});
