"use client";

// Status tracker: one block per day (or per run) for status pages, CI history and SLAs. Blocks
// fade in left to right, the hovered block lifts while its neighbors stay readable, a glass
// tooltip shows the date, status, downtime and an optional note, and the header carries the
// aggregate uptime. The list is real list semantics with a text status per block; one tab stop
// walks the blocks with the arrow keys and announces each in a polite live region.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing, listReset } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { formatDate, formatDuration, getNumberFormat, type DateFormat } from "./core/format";
import { ChartTip, TipRow, useChartUid } from "./core/frame";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusTrackerItem {
  /** ISO date, epoch ms or Date. */
  date: string | number | Date;
  /** A key of `statusTones` ("up", "degraded", "down", "maintenance", "none" by default). */
  status: string;
  /** Overrides the status label in the tooltip and announcements. */
  label?: string;
  /** Extra line in the tooltip (incident title, build number). */
  detail?: string;
  /** Minutes of downtime that day; when present on any item, uptime is time-weighted. */
  downtimeMinutes?: number;
}

export interface StatusTrackerProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  items: readonly StatusTrackerItem[];
  /** Status key to tone. Default up/success, degraded/warning, down/danger, maintenance/info, none/neutral. */
  statusTones?: Readonly<Record<string, StatusTone>>;
  /** Status key to label. */
  statusLabels?: Readonly<Record<string, string>>;
  /** Statuses that count as available for the uptime figure. Default ["up", "maintenance"]. */
  upStatuses?: readonly string[];
  /** Header with the label and uptime. Default true. */
  header?: boolean;
  /** Overrides the computed uptime (0..1). */
  uptime?: number;
  /** Service name shown in the header. */
  label?: string;
  /** Block height in px. Default 34. */
  height?: number;
  /** Gap between blocks in px. Default 2. */
  gap?: number;
  /** Block corner radius. Default 3. */
  radius?: number;
  /** Footer captions under the first and last block. Default from the dates ("90 days ago" / "Today"). */
  startLabel?: React.ReactNode;
  endLabel?: React.ReactNode;
  /** Footer row. Default true. */
  footer?: boolean;
  /** Legend of the statuses that occur. Default false. */
  legend?: boolean;
  dateFormat?: DateFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  onItemClick?: (item: StatusTrackerItem, index: number, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveItemChange?: (item: StatusTrackerItem | null, index: number | null) => void;
  chartLabel?: string;
}

const DEFAULT_TONES: Readonly<Record<string, StatusTone>> = { up: "success", degraded: "warning", down: "danger", maintenance: "info", none: "neutral" };
const DEFAULT_LABELS: Readonly<Record<string, string>> = { up: "Operational", degraded: "Degraded", down: "Outage", maintenance: "Maintenance", none: "No data" };
const TONE_FILL: Record<StatusTone, string> = {
  success: "var(--pui-success)",
  warning: "var(--pui-warning)",
  danger: "var(--pui-danger)",
  info: "var(--pui-info)",
  neutral: "var(--pui-muted)",
};
const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-pui-success-text",
  warning: "text-pui-warning-text",
  danger: "text-pui-danger-text",
  info: "text-pui-info-text",
  neutral: "text-pui-muted-foreground",
};
const DAY = 864e5;
const toTime = (d: string | number | Date) => (typeof d === "string" ? Date.parse(d.length === 10 ? `${d}T00:00:00Z` : d) : +d);

/** Uptime share (0..1) of items: time-weighted when any item has downtimeMinutes, else by day. */
export function statusUptime(items: readonly StatusTrackerItem[], upStatuses: readonly string[] = ["up", "maintenance"]): number | null {
  const counted = items.filter((i) => i.status !== "none");
  if (!counted.length) return null;
  if (items.some((i) => typeof i.downtimeMinutes === "number")) {
    const down = counted.reduce((s, i) => s + Math.max(0, Math.min(1440, i.downtimeMinutes ?? (upStatuses.includes(i.status) ? 0 : 1440))), 0);
    return 1 - down / (counted.length * 1440);
  }
  return counted.filter((i) => upStatuses.includes(i.status)).length / counted.length;
}

export const StatusTracker = React.forwardRef<HTMLElement, StatusTrackerProps>(function StatusTracker(
  {
    items,
    statusTones,
    statusLabels,
    upStatuses = ["up", "maintenance"],
    header = true,
    uptime: uptimeProp,
    label,
    height = 34,
    gap = 2,
    radius = 3,
    startLabel,
    endLabel,
    footer = true,
    legend = false,
    dateFormat = { dateStyle: "medium" },
    locale = "en-US",
    initialWidth = 560,
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    onItemClick,
    onActiveItemChange,
    chartLabel,
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const tones = React.useMemo(() => ({ ...DEFAULT_TONES, ...statusTones }), [statusTones]);
  const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...statusLabels }), [statusLabels]);
  const toneOf = (s: string): StatusTone => tones[s] ?? "neutral";
  const labelOf = (item: StatusTrackerItem) => item.label ?? labels[item.status] ?? item.status;

  const n = items.length;
  const W = Math.max(60, width);
  const bw = n ? Math.max(1, (W - gap * (n - 1)) / n) : W;
  const xOf = (i: number) => i * (bw + gap);
  const upStatusesKey = upStatuses.join("|");
  const uptime = React.useMemo(
    () => uptimeProp ?? statusUptime(items, upStatusesKey.split("|")),
    [uptimeProp, items, upStatusesKey],
  );
  const pct = getNumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: StatusTrackerItem["date"]) => formatDate(toTime(d), dateFormat, locale);
  const nameText = chartLabel ?? (typeof title === "string" ? title : label ?? "Status");
  const counts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.status, (m.get(i.status) ?? 0) + 1);
    return m;
  }, [items]);
  const incidents = items.filter((i) => toneOf(i.status) === "danger" || toneOf(i.status) === "warning").length;
  const worstTone: StatusTone = items.length
    ? (["danger", "warning", "info", "success", "neutral"] as const).find((t) => items.slice(-1).some((i) => toneOf(i.status) === t)) ?? "neutral"
    : "neutral";
  const lastItem = items[n - 1];

  const active = focus ?? hover;
  const activeItem = active !== null ? items[active] : undefined;
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveItemChange?.(active !== null ? (items[active] ?? null) : null, active);
  }, [active, items, onActiveItemChange]);

  const describe = (i: number) => {
    const item = items[i] as StatusTrackerItem;
    const down = typeof item.downtimeMinutes === "number" && item.downtimeMinutes > 0 ? `, ${formatDuration(item.downtimeMinutes * 6e4, locale)} down` : "";
    return `${fmtDate(item.date)}: ${labelOf(item)}${down}${item.detail ? `. ${item.detail}` : ""}. ${i + 1} of ${n}.`;
  };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !n) return null;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor(px / (bw + gap))));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    const cur = focus ?? -1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = Math.min(n - 1, cur + 1);
    else if (event.key === "ArrowLeft") next = cur < 0 ? n - 1 : Math.max(0, cur - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "PageUp") next = Math.max(0, cur - 7);
    else if (event.key === "PageDown") next = Math.min(n - 1, Math.max(0, cur) + 7);
    else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      onItemClick?.(items[focus] as StatusTrackerItem, focus, event);
      return;
    } else if (event.key === "Escape" && focus !== null) {
      event.preventDefault();
      setFocus(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next));
  };

  const first = items[0];
  const autoStart = first && lastItem ? Math.round((toTime(lastItem.date) - toTime(first.date)) / DAY) : 0;
  const startText = startLabel ?? (autoStart > 0 ? `${autoStart + 1} days ago` : first ? fmtDate(first.date) : "");
  // No Date.now() here: the server and the client must print the same caption.
  const endText = endLabel ?? (lastItem ? fmtDate(lastItem.date) : "");
  const summaryText =
    n === 0
      ? "No status data."
      : `${label ? `${label}: ` : ""}${uptime !== null ? `${pct.format(uptime)} uptime over ${n} days. ` : ""}${incidents ? `${incidents} day${incidents === 1 ? "" : "s"} with incidents.` : "No incidents."} Latest: ${lastItem ? labelOf(lastItem) : ""}.`;
  const tip = activeItem && active !== null ? { left: (xOf(active) + bw / 2) / W, flipX: (xOf(active) + bw / 2) / W > 0.6 } : null;
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  const statusesPresent = [...counts.keys()];

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="status tracker"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={descId}
      data-items={n}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-2 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={titleId} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      {header && (label || uptime !== null) ? (
        <div className={cn(blockReset, "flex items-center justify-between gap-3 text-sm")}>
          <span className={cn(blockReset, "flex min-w-0 items-center gap-2 font-medium")}>
            <span aria-hidden="true" className={cn(blockReset, "relative flex size-2.5 shrink-0")}>
              {!anim.reducedMotion && worstTone !== "neutral" ? (
                <motion.span
                  className={cn(blockReset, "absolute inset-0 rounded-pui-full")}
                  style={{ background: TONE_FILL[worstTone] }}
                  animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              ) : null}
              <span className={cn(blockReset, "relative size-2.5 rounded-pui-full")} style={{ background: TONE_FILL[worstTone] }} />
            </span>
            <span className={cn(blockReset, "truncate")}>{label}</span>
          </span>
          {uptime !== null ? (
            <span className={cn(blockReset, "shrink-0 tabular-nums text-pui-muted-foreground")}>
              <strong className={cn(blockReset, "font-semibold", uptime >= 0.999 ? "text-pui-success-text" : uptime >= 0.99 ? "text-pui-foreground" : "text-pui-danger-text")}>{pct.format(uptime)}</strong> uptime
            </span>
          ) : null}
        </div>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height }}>
        <ol className={cn(listReset, "absolute inset-0")} aria-label={`${nameText}, ${n} days`}>
          {items.map((item, i) => {
            const tone = toneOf(item.status);
            const isActive = active === i;
            const delay = anim.entrance ? Math.min(0.6, i * 0.004 * (90 / Math.max(30, n)) * 1.5) : 0;
            return (
              <motion.li
                key={i}
                className={cn(blockReset, "absolute top-0 bottom-0")}
                style={{
                  left: `${(xOf(i) / W) * 100}%`,
                  width: `${(bw / W) * 100}%`,
                  borderRadius: Math.min(radius, bw / 2),
                  background: TONE_FILL[tone],
                  transformOrigin: "50% 100%",
                  boxShadow: isActive ? "0 0 0 1.5px var(--pui-foreground)" : undefined,
                }}
                initial={anim.entrance ? { opacity: 0, scaleY: 0.3 } : false}
                animate={{ opacity: active === null || isActive ? 1 : 0.55, scaleY: isActive ? 1.14 : 1 }}
                transition={
                  anim.reducedMotion
                    ? instant
                    : { opacity: { duration: anim.entrance && active === null ? 0.3 : 0.12, delay: active === null ? delay : 0 }, scaleY: { type: "spring", stiffness: 500, damping: 30, delay: active === null ? delay : 0 } }
                }
              >
                <span className={srOnly}>
                  {fmtDate(item.date)}: {labelOf(item)}
                  {item.detail ? `. ${item.detail}` : ""}
                </span>
              </motion.li>
            );
          })}
        </ol>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="status timeline"
          aria-label={`${nameText}. Use the arrow keys to move between days.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const i = pick(event);
            if (i !== null) onItemClick?.(items[i] as StatusTrackerItem, i, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute -inset-1 rounded-pui-md", onItemClick && hover !== null ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={0} flipX={tip?.flipX} reducedMotion={anim.reducedMotion}>
          {activeItem ? (
            <>
              <div className={cn(blockReset, "text-[11px] font-semibold text-pui-muted-foreground")}>{fmtDate(activeItem.date)}</div>
              <div className={cn(blockReset, "mt-0.5 flex items-center gap-1.5 text-sm font-semibold", TONE_TEXT[toneOf(activeItem.status)])}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-pui-full")} style={{ background: TONE_FILL[toneOf(activeItem.status)] }} />
                {labelOf(activeItem)}
              </div>
              {typeof activeItem.downtimeMinutes === "number" ? (
                <TipRow label="Downtime" value={activeItem.downtimeMinutes > 0 ? formatDuration(activeItem.downtimeMinutes * 6e4, locale) : "None"} tone={activeItem.downtimeMinutes > 0 ? "down" : "muted"} />
              ) : null}
              {typeof activeItem.downtimeMinutes === "number" ? <TipRow label="Day uptime" value={pct.format(1 - Math.min(1440, activeItem.downtimeMinutes) / 1440)} tone="muted" /> : null}
              {activeItem.detail ? <div className={cn(blockReset, "mt-1 max-w-56 text-[11px] leading-snug text-pui-muted-foreground")}>{activeItem.detail}</div> : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {footer ? (
        <div aria-hidden="true" className={cn(blockReset, "flex items-center gap-3 text-[11px] text-pui-muted-foreground")}>
          <span className={cn(blockReset, "shrink-0")}>{startText}</span>
          <span className={cn(blockReset, "h-px flex-1 bg-pui-border")} />
          {uptime !== null && !header ? <span className={cn(blockReset, "shrink-0 tabular-nums")}>{pct.format(uptime)} uptime</span> : null}
          {uptime !== null && !header ? <span className={cn(blockReset, "h-px flex-1 bg-pui-border")} /> : null}
          <span className={cn(blockReset, "shrink-0")}>{endText}</span>
        </div>
      ) : null}
      {legend ? (
        <div aria-hidden="true" className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pui-muted-foreground")}>
          {statusesPresent.map((s) => (
            <span key={s} className={cn(blockReset, "inline-flex items-center gap-1.5")}>
              <span className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: TONE_FILL[toneOf(s)] }} />
              {labels[s] ?? s}
              <span className={cn(blockReset, "tabular-nums")}>{counts.get(s)}</span>
            </span>
          ))}
        </div>
      ) : null}
      <span id={`${uid}-help`} className={srOnly}>
        Left and right arrows move between days, Page Up and Page Down jump a week, Home and End go to the ends, Escape clears.
      </span>
      <p id={descId} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
    </figure>
  );
});
