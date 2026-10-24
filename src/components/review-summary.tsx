"use client";
import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { StarIcon, XIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
/** A recurring theme pulled from the reviews ("Battery life", "Runs small"). */
export interface ReviewTopic {
  id: string;
  label: string;
  /** Number of reviews that mention it. */
  count?: number;
  /** Default "neutral". */
  sentiment?: "positive" | "negative" | "neutral";
}
export interface ReviewSummaryProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange" | "title"> {
  /** Reviews per star, e.g. { 5: 812, 4: 203, 3: 61, 2: 18, 1: 40 }. */
  counts: Readonly<Partial<Record<number, number>>>;
  /** Highest star. Default 5. */
  max?: number;
  /** Star filter (null shows all). */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (stars: number | null) => void;
  topics?: readonly ReviewTopic[];
  /** Topic filter (null shows all). */
  topic?: string | null;
  defaultTopic?: string | null;
  onTopicChange?: (topic: string | null) => void;
  /** Heading. Default "Customer reviews". */
  title?: React.ReactNode;
  /** Default "en-US". */
  locale?: string;
  /** Bars grow in when scrolled into view. Default true. */
  animate?: boolean;
  /** Default "warning" (amber stars). */
  starTone?: Tone;
  /** Bar and selection color. Default "primary". */
  tone?: Tone;
}
const sentimentDot = { positive: "bg-pui-success", negative: "bg-pui-danger", neutral: "bg-pui-muted-foreground/60" } as const;
/** Five stars with the average filled to the exact fraction. */
function Stars({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn(blockReset, "inline-flex gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <span key={i} className={cn(blockReset, "relative block size-[1em]")}>
            <StarIcon className={cn(blockReset, "absolute inset-0 block size-full text-pui-muted-foreground/25")} />
            <span className={cn(blockReset, "absolute inset-0 block overflow-hidden")} style={{ width: `${fill * 100}%` }}>
              <StarIcon className={cn(blockReset, "block size-[1em] max-w-none text-(--pui-star)")} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
/**
 * Review summary that doubles as the filter. The average shows with fractional stars, each star
 * row is a button whose bar grows in on view and narrows the list on click, topic chips carry a
 * sentiment dot and mention count, and the active filter shows as a clearable chip.
 */
export const ReviewSummary = React.forwardRef<HTMLDivElement, ReviewSummaryProps>(function ReviewSummary(
  {
    counts,
    max = 5,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    topics,
    topic: topicProp,
    defaultTopic = null,
    onTopicChange,
    title = "Customer reviews",
    locale = "en-US",
    animate = true,
    starTone = "warning",
    tone = "primary",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [stars, setStars] = useControllableState<number | null>({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const [topic, setTopic] = useControllableState<string | null>({ value: topicProp, defaultValue: defaultTopic, onChange: onTopicChange, name: "topic" });
  const [message, setMessage] = React.useState("");
  const rowsRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const num = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const avgFmt = React.useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), [locale]);
  const rows = Array.from({ length: max }, (_, i) => max - i);
  const total = rows.reduce((s, r) => s + Math.max(0, counts[r] ?? 0), 0);
  const average = total === 0 ? 0 : rows.reduce((s, r) => s + r * Math.max(0, counts[r] ?? 0), 0) / total;
  const peak = Math.max(1, ...rows.map((r) => counts[r] ?? 0));
  const grow = animate && !reduced;
  const toggle = (r: number) => {
    const next = stars === r ? null : r;
    setStars(next);
    setMessage(next === null ? `Showing all ${num.format(total)} reviews` : `Showing ${num.format(counts[next] ?? 0)} ${next}-star reviews`);
  };
  const toggleTopic = (t: ReviewTopic) => {
    const next = topic === t.id ? null : t.id;
    setTopic(next);
    setMessage(next === null ? "Topic filter cleared" : `Showing reviews that mention ${t.label}`);
  };
  const onRowKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const list = Array.from(rowsRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const at = list.indexOf(event.currentTarget);
    const target = event.key === "ArrowDown" ? at + 1 : event.key === "ArrowUp" ? at - 1 : event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : null;
    if (target === null || at === -1) return;
    event.preventDefault();
    list[Math.min(list.length - 1, Math.max(0, target))]?.focus();
  };
  const activeTopic = topics?.find((t) => t.id === topic);
  return (
    <div
      ref={ref}
      data-tone={tone}
      {...props}
      className={cn(blockReset, "flex w-full flex-col gap-5 text-pui-foreground", toneClasses[tone], className)}
      style={{ ["--pui-star" as string]: `var(--pui-${starTone === "neutral" ? "foreground" : starTone})`, ...props.style }}
    >
      <div className={cn(blockReset, "flex flex-wrap items-end gap-x-4 gap-y-1")}>
        <div className={cn(blockReset, "flex flex-col gap-1")}>
          <h3 id={titleId} className={cn(blockReset, "text-sm font-medium text-pui-muted-foreground")}>
            {title}
          </h3>
          <div className={cn(blockReset, "flex items-center gap-3")}>
            <span className={cn(blockReset, "text-4xl leading-none font-semibold tracking-tight tabular-nums")} data-pui-review-average="">
              {avgFmt.format(average)}
            </span>
            <span className={cn(blockReset, "flex flex-col gap-1")}>
              <Stars value={average} max={max} className="text-lg" />
              <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                {num.format(total)} {total === 1 ? "review" : "reviews"}
              </span>
            </span>
          </div>
          <span className={cn(blockReset, "sr-only")}>{`Average ${avgFmt.format(average)} out of ${max} stars from ${num.format(total)} reviews`}</span>
        </div>
      </div>
      <div ref={rowsRef} role="group" aria-label="Filter by rating" className={cn(blockReset, "flex flex-col gap-1")}>
        {rows.map((r, i) => {
          const c = Math.max(0, counts[r] ?? 0);
          const share = total === 0 ? 0 : c / total;
          const on = stars === r;
          const dim = stars !== null && !on;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              disabled={c === 0}
              data-stars={r}
              aria-label={`${r} ${r === 1 ? "star" : "stars"}: ${num.format(c)} reviews, ${Math.round(share * 100)}%`}
              onClick={() => toggle(r)}
              onKeyDown={onRowKey}
              className={cn(
                controlReset,
                focusRing,
                "group/row grid h-8 w-full cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)_3.25rem] items-center gap-3 rounded-pui-md px-2 text-left text-sm transition-[background-color,opacity] duration-(--pui-duration-fast) hover:bg-pui-muted/70",
                on && "bg-(--pui-tone)/10 hover:bg-(--pui-tone)/14",
                dim && "opacity-55",
                "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
              )}
            >
              <span className={cn(blockReset, "inline-flex items-center gap-1 font-medium tabular-nums")}>
                {r}
                <StarIcon aria-hidden="true" className={cn(blockReset, "size-3.5 text-(--pui-star)")} />
              </span>
              <span aria-hidden="true" className={cn(blockReset, "relative block h-2 overflow-hidden rounded-full bg-pui-muted")}>
                {grow ? (
                  <motion.span
                    className={cn(blockReset, "absolute inset-y-0 left-0 block rounded-full", on ? "bg-(--pui-tone)" : "bg-(--pui-star)")}
                    initial={{ width: "0%" }}
                    whileInView={{ width: `${(c / peak) * 100}%` }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: durations.page * 1.6, ease: easings.outExpo, delay: i * 0.06 }}
                  />
                ) : (
                  <span
                    className={cn(blockReset, "absolute inset-y-0 left-0 block rounded-full", on ? "bg-(--pui-tone)" : "bg-(--pui-star)")}
                    style={{ width: `${(c / peak) * 100}%` }}
                  />
                )}
              </span>
              <span className={cn(blockReset, "text-right text-xs text-pui-muted-foreground tabular-nums group-hover/row:text-pui-foreground")}>
                {Math.round(share * 100)}%
              </span>
            </button>
          );
        })}
      </div>
      {topics && topics.length > 0 ? (
        <div className={cn(blockReset, "flex flex-col gap-2")}>
          <p className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>Mentioned often</p>
          <div role="group" aria-label="Filter by topic" className={cn(blockReset, "flex flex-wrap gap-1.5")}>
            {topics.map((t) => {
              const on = topic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTopic(t)}
                  data-sentiment={t.sentiment ?? "neutral"}
                  className={cn(
                    controlReset,
                    focusRing,
                    "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-pui-full border px-2.5 text-xs font-medium transition-colors duration-(--pui-duration-fast)",
                    on ? "border-(--pui-tone) bg-(--pui-tone)/10 text-(--pui-tone-text)" : "border-pui-border hover:bg-pui-muted/70",
                  )}
                >
                  <span aria-hidden="true" className={cn(blockReset, "block size-1.5 shrink-0 rounded-full", sentimentDot[t.sentiment ?? "neutral"])} />
                  {t.label}
                  {t.count !== undefined ? <span className={cn(blockReset, "text-pui-muted-foreground tabular-nums")}>{num.format(t.count)}</span> : null}
                  {t.sentiment && t.sentiment !== "neutral" ? <span className={cn(blockReset, "sr-only")}>{`, mostly ${t.sentiment}`}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className={cn(blockReset, "flex min-h-7 flex-wrap items-center gap-1.5")} aria-label="Active filters" role="group">
        {stars === null && !activeTopic ? (
          <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>Showing all reviews</span>
        ) : null}
        {stars !== null ? (
          <motion.button
            key={`s${stars}`}
            type="button"
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
            onClick={() => toggle(stars)}
            aria-label={`Remove filter: ${stars} stars`}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex h-7 cursor-pointer items-center gap-1 rounded-pui-full bg-pui-foreground px-2.5 text-xs font-medium text-pui-background",
            )}
          >
            {stars} <StarIcon aria-hidden="true" className={cn(blockReset, "size-3")} />
            <XIcon aria-hidden="true" className={cn(blockReset, "ml-0.5 size-3 opacity-70")} />
          </motion.button>
        ) : null}
        {activeTopic ? (
          <motion.button
            key={`t${activeTopic.id}`}
            type="button"
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
            onClick={() => toggleTopic(activeTopic)}
            aria-label={`Remove filter: ${activeTopic.label}`}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex h-7 cursor-pointer items-center gap-1 rounded-pui-full bg-pui-foreground px-2.5 text-xs font-medium text-pui-background",
            )}
          >
            {activeTopic.label}
            <XIcon aria-hidden="true" className={cn(blockReset, "ml-0.5 size-3 opacity-70")} />
          </motion.button>
        ) : null}
      </div>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
    </div>
  );
});
