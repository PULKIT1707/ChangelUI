"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { fieldClasses } from "../lib/field-styles";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";

export interface FeedbackOption {
  value: string | number;
  /** Accessible name and hover caption, e.g. "Very helpful". */
  label: string;
  /** Custom glyph; by default a face whose smile follows the option's position on the scale. */
  icon?: React.ReactNode;
}

export interface FeedbackResult {
  option: FeedbackOption;
  value: FeedbackOption["value"];
  comment: string;
}

export interface FeedbackWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** Default "Was this page helpful?". */
  question?: React.ReactNode;
  /** The scale, worst to best. Default four faces from "Not helpful" to "Very helpful". */
  options?: readonly FeedbackOption[];
  /** "inline": one row for page footers. "card": stacked, with a multi-line comment. Default "inline". */
  layout?: "inline" | "card";
  /** Ask for an optional comment after a rating. Default true. */
  comment?: boolean;
  /** Comment prompt; a function gets the chosen option. Default asks what went wrong or what helped. */
  commentPrompt?: string | ((option: FeedbackOption, index: number) => string);
  /** Default "Thanks for the feedback". */
  thanks?: React.ReactNode;
  /** Optional second line under the thanks. */
  thanksDescription?: React.ReactNode;
  /** Fires as soon as a face is picked, so a rating is never lost when the comment is skipped. */
  onRate?: (option: FeedbackOption) => void;
  /** Fires on Send or Skip. A returned promise keeps the Send button busy until it settles. */
  onSubmit?: (result: FeedbackResult) => unknown;
}

const DEFAULT_OPTIONS: readonly FeedbackOption[] = [
  { value: 1, label: "Not helpful" },
  { value: 2, label: "A little helpful" },
  { value: 3, label: "Helpful" },
  { value: 4, label: "Very helpful" },
];

type Step = "rate" | "comment" | "done";

/** A face whose mouth curves from a frown (mood 0) to a grin (mood 1). */
function Face({ mood, className }: { mood: number; className?: string }) {
  const c = -3.6 + mood * 7.6;
  const y = 15.4 - c * 0.25;
  const open = mood > 0.85;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn(blockReset, className)}>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="8.9" cy="9.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="9.6" r="1.05" fill="currentColor" stroke="none" />
      <path d={`M8 ${y.toFixed(2)} Q12 ${(y + c).toFixed(2)} 16 ${y.toFixed(2)}${open ? " Z" : ""}`} fill={open ? "currentColor" : "none"} />
    </svg>
  );
}

function ThanksCheck({ play, reduced }: { play: boolean; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(blockReset, "inline-flex size-7 shrink-0 items-center justify-center rounded-pui-full bg-pui-success/15 text-pui-success-text")}
      initial={false}
      animate={play && !reduced ? { scale: [0.6, 1.12, 1] } : { scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.42, ease: easings.out }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={cn(blockReset, "size-4")}>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={false}
          animate={{ pathLength: play || reduced ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.34, delay: 0.12, ease: easings.out }}
        />
      </svg>
    </motion.span>
  );
}

function defaultPrompt(_option: FeedbackOption, index: number, count: number): string {
  return index < count / 2 ? "What went wrong? (optional)" : "What helped most? (optional)";
}

/**
 * One-tap feedback: a scale of faces springs open a short optional comment, then settles into a
 * thank-you. All three steps share one grid cell, so the widget keeps one footprint from start to
 * finish and the page under it never moves. The rating fires immediately through onRate.
 */
export const FeedbackWidget = React.forwardRef<HTMLDivElement, FeedbackWidgetProps>(function FeedbackWidget(
  {
    question = "Was this page helpful?",
    options = DEFAULT_OPTIONS,
    layout = "inline",
    comment = true,
    commentPrompt,
    thanks = "Thanks for the feedback",
    thanksDescription,
    onRate,
    onSubmit,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [step, setStep] = React.useState<Step>("rate");
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const fieldRef = React.useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const doneRef = React.useRef<HTMLDivElement>(null);
  const faceRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const callbacks = useLatestRef({ onRate, onSubmit });
  const card = layout === "card";
  const count = options.length;
  const option = chosen === null ? undefined : options[chosen];

  // Keep focus inside the widget as steps swap: the outgoing step becomes invisible.
  const moved = React.useRef(false);
  React.useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (step === "comment") fieldRef.current?.focus({ preventScroll: true });
    else if (step === "done") doneRef.current?.focus({ preventScroll: true });
  }, [step]);

  const finish = (index: number, message: string) => {
    const opt = options[index];
    if (!opt) return;
    const result = callbacks.current.onSubmit?.({ option: opt, value: opt.value, comment: message.trim() });
    const go = () => {
      moved.current = true;
      setStep("done");
    };
    if (result instanceof Promise) {
      setSending(true);
      result.then(
        () => {
          setSending(false);
          go();
        },
        () => setSending(false),
      );
    } else go();
  };

  const rate = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    setChosen(index);
    callbacks.current.onRate?.(opt);
    if (comment) {
      moved.current = true;
      setStep("comment");
    } else finish(index, "");
  };

  const onFaceKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const target = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : delta ? (index + delta + count) % count : -1;
    if (target < 0) return;
    event.preventDefault();
    faceRefs.current[target]?.focus();
  };

  const prompt =
    option === undefined || chosen === null
      ? ""
      : typeof commentPrompt === "function"
        ? commentPrompt(option, chosen)
        : (commentPrompt ?? defaultPrompt(option, chosen, count));
  const caption = hovered !== null ? options[hovered]?.label : option?.label;

  const pane = (name: Step) => {
    const active = step === name;
    return {
      "data-step": name,
      "aria-hidden": active ? undefined : true,
      className: cn(blockReset, "grid min-w-0 [grid-area:1/1]", !active && "invisible pointer-events-none"),
      initial: false as const,
      animate: active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98 },
      transition: reduced ? { duration: 0 } : { ...springs.smooth, opacity: { duration: 0.18 } },
    };
  };

  const glyph = (index: number, size: string) => {
    const opt = options[index];
    if (opt?.icon) return <span aria-hidden="true" className={cn(blockReset, "inline-flex", size)}>{opt.icon}</span>;
    return <Face mood={count > 1 ? index / (count - 1) : 1} className={size} />;
  };

  return (
    <div
      ref={refs}
      data-layout={layout}
      data-state={step}
      {...props}
      className={cn(
        blockReset,
        "grid text-sm text-pui-foreground",
        card ? "w-full max-w-sm rounded-pui-xl border border-pui-border bg-pui-surface p-5 shadow-pui-md" : "w-full rounded-pui-lg border border-pui-border bg-pui-surface px-4 py-2.5",
        className,
      )}
    >
      {/* Step 1: rate */}
      <motion.div {...pane("rate")}>
        <div className={cn(blockReset, "flex h-full gap-3", card ? "flex-col items-center justify-center text-center" : "flex-wrap items-center justify-between")}>
          <p id={`${id}-q`} className={cn(blockReset, "font-medium", card && "text-base")}>
            {question}
          </p>
          <div className={cn(blockReset, "flex items-center gap-3", card && "flex-col gap-1.5")}>
            <div role="group" aria-labelledby={`${id}-q`} className={cn(blockReset, "flex items-center gap-1")} onPointerLeave={() => setHovered(null)}>
              {options.map((opt, i) => (
                <motion.button
                  key={String(opt.value)}
                  ref={(el: HTMLButtonElement | null) => {
                    faceRefs.current[i] = el;
                  }}
                  type="button"
                  aria-label={opt.label}
                  aria-pressed={chosen === i}
                  tabIndex={step === "rate" ? 0 : -1}
                  onClick={() => rate(i)}
                  onKeyDown={(e) => onFaceKey(e, i)}
                  onPointerEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  whileHover={reduced ? undefined : { scale: 1.14, y: -2 }}
                  whileTap={reduced ? undefined : { scale: 0.9 }}
                  transition={springs.bouncy}
                  className={cn(
                    controlReset,
                    focusRing,
                    "inline-flex cursor-pointer items-center justify-center rounded-pui-full text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-primary/10 hover:text-pui-primary-text focus-visible:text-pui-primary-text aria-pressed:bg-pui-primary/12 aria-pressed:text-pui-primary-text",
                    card ? "size-11" : "size-9",
                  )}
                >
                  {glyph(i, card ? "size-7" : "size-6")}
                </motion.button>
              ))}
            </div>
            <span
              aria-hidden="true"
              className={cn(blockReset, "min-w-24 text-xs text-pui-muted-foreground", card ? "h-4 text-center" : "hidden text-left sm:inline")}
            >
              {caption ?? ""}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Step 2: optional comment */}
      <motion.div {...pane("comment")}>
        <form
          className={cn(blockReset, "flex h-full gap-2", card ? "flex-col" : "items-center")}
          onSubmit={(event) => {
            event.preventDefault();
            if (chosen !== null && !sending) finish(chosen, text);
          }}
        >
          <label htmlFor={`${id}-c`} className={cn(blockReset, card ? "flex items-center gap-2 font-medium" : "sr-only")}>
            {card && chosen !== null ? <span className={cn(blockReset, "inline-flex text-pui-primary-text")}>{glyph(chosen, "size-6")}</span> : null}
            {prompt}
          </label>
          {!card && chosen !== null ? (
            <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 text-pui-primary-text")}>
              {glyph(chosen, "size-6")}
            </span>
          ) : null}
          {card ? (
            <textarea
              ref={fieldRef}
              id={`${id}-c`}
              rows={3}
              value={text}
              maxLength={1000}
              tabIndex={step === "comment" ? 0 : -1}
              placeholder="Tell us a little more"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
              className={cn(controlReset, fieldClasses, "resize-none px-3 py-2 text-sm")}
            />
          ) : (
            <input
              ref={fieldRef}
              id={`${id}-c`}
              value={text}
              maxLength={500}
              tabIndex={step === "comment" ? 0 : -1}
              placeholder={prompt}
              onChange={(e) => setText(e.target.value)}
              className={cn(controlReset, fieldClasses, "h-8 flex-1 px-3 text-sm")}
            />
          )}
          <div className={cn(blockReset, "flex shrink-0 gap-2", card && "justify-end")}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              tone="neutral"
              tabIndex={step === "comment" ? 0 : -1}
              disabled={sending}
              onClick={() => chosen !== null && finish(chosen, "")}
            >
              Skip
            </Button>
            <Button type="submit" size="sm" loading={sending} tabIndex={step === "comment" ? 0 : -1}>
              Send
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Step 3: thanks */}
      <motion.div {...pane("done")}>
        <div
          ref={doneRef}
          tabIndex={-1}
          className={cn(
            blockReset,
            "flex h-full items-center gap-3 rounded-pui-md outline-hidden",
            card ? "flex-col justify-center text-center" : "justify-center sm:justify-start",
          )}
        >
          <ThanksCheck play={step === "done"} reduced={reduced} />
          <div className={cn(blockReset, "min-w-0")}>
            <p className={cn(blockReset, "font-medium")}>{thanks}</p>
            {thanksDescription ? <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{thanksDescription}</p> : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
