"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { CheckIcon, PencilIcon, SparklesIcon } from "../lib/icons";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
export interface ClarifyingOption {
  value: string;
  label: React.ReactNode;
  /** One line under the label, e.g. what picking it means for the result. */
  description?: React.ReactNode;
}
export interface ClarifyingQuestion {
  id: string;
  prompt: React.ReactNode;
  /** Plain-text version of the prompt for the summary and labels. Default: prompt when it is a string. */
  promptText?: string;
  options: ClarifyingOption[];
  /** Checkboxes instead of a single choice. Default false. */
  multiple?: boolean;
  /** Adds an "Other" option with a text field. Default false. */
  allowOther?: boolean;
  /** Default "Type your answer". */
  otherPlaceholder?: string;
  /** Shows Skip. Default true. */
  optional?: boolean;
}
export interface ClarifyingAnswer {
  /** Chosen option values. */
  values: string[];
  /** Text typed into "Other", when picked. */
  other?: string;
  skipped?: boolean;
}
export type ClarifyingAnswers = Record<string, ClarifyingAnswer>;
export interface ClarifyingQuestionsProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onSubmit" | "defaultValue"> {
  questions: ClarifyingQuestion[];
  onSubmit?: (answers: ClarifyingAnswers) => void;
  /** Answers to start from, e.g. a previous run. */
  defaultAnswers?: ClarifyingAnswers;
  /** Default "A few quick questions". */
  title?: React.ReactNode;
  /** Small line under the title, e.g. why the assistant is asking. */
  description?: React.ReactNode;
  /** Single-choice questions move on after a pick. Default true. */
  autoAdvance?: boolean;
  /** Default "Send answers". */
  submitLabel?: string;
  /** Read-only summary, e.g. once the answers are sent. Default false. */
  submitted?: boolean;
}
const OTHER = "__other__";
const isAnswered = (answer: ClarifyingAnswer | undefined) =>
  !!answer && !answer.skipped && (answer.values.some((v) => v !== OTHER) || (answer.values.includes(OTHER) && !!answer.other?.trim()));
const textOf = (node: React.ReactNode, fallback: string) => (typeof node === "string" || typeof node === "number" ? String(node) : fallback);
/** Plain text for an answer: "Weekly, Monthly" or "Other: by quarter". */
export function describeClarifyingAnswer(question: ClarifyingQuestion, answer: ClarifyingAnswer | undefined): string | null {
  if (!answer || answer.skipped || !isAnswered(answer)) return null;
  return answer.values
    .map((v) => (v === OTHER ? (answer.other?.trim() ?? "") : textOf(question.options.find((o) => o.value === v)?.label, v)))
    .filter(Boolean)
    .join(", ");
}
/**
 * Inline questionnaire for an AI assistant that needs details before it acts: one question at a
 * time with option chips, number-key shortcuts, an "Other" free-text answer and Skip, step dots
 * that jump back, and an editable summary before the answers are sent.
 */
export const ClarifyingQuestions = React.forwardRef<HTMLElement, ClarifyingQuestionsProps>(function ClarifyingQuestions(
  {
    questions,
    onSubmit,
    defaultAnswers,
    title = "A few quick questions",
    description,
    autoAdvance = true,
    submitLabel = "Send answers",
    submitted = false,
    className,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLElement>(null);
  const setRootRef = React.useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [answers, setAnswers] = React.useState<ClarifyingAnswers>(() => defaultAnswers ?? {});
  const [step, setStep] = React.useState(submitted ? questions.length : 0);
  const [direction, setDirection] = React.useState(1);
  const [returnToSummary, setReturnToSummary] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const otherRef = React.useRef<HTMLInputElement>(null);
  const navigated = React.useRef(false);
  const advanceTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(advanceTimer.current), []);
  const total = questions.length;
  const onSummary = submitted || step >= total;
  const question = onSummary ? undefined : questions[step];
  const answer = question ? answers[question.id] : undefined;
  React.useEffect(() => {
    if (!navigated.current) return;
    navigated.current = false;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);
  const go = (next: number) => {
    clearTimeout(advanceTimer.current);
    navigated.current = true;
    setDirection(next >= step ? 1 : -1);
    setStep(Math.max(0, Math.min(total, next)));
  };
  const goNext = () => {
    if (returnToSummary) {
      setReturnToSummary(false);
      go(total);
    } else go(step + 1);
  };
  const update = (q: ClarifyingQuestion, next: ClarifyingAnswer) => setAnswers((a) => ({ ...a, [q.id]: next }));
  const choose = (q: ClarifyingQuestion, value: string) => {
    const current = answers[q.id]?.values ?? [];
    if (q.multiple) {
      const values = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      update(q, { values, other: answers[q.id]?.other });
      if (value === OTHER && !current.includes(OTHER)) requestAnimationFrame(() => otherRef.current?.focus());
      return;
    }
    update(q, { values: [value], other: answers[q.id]?.other });
    if (value === OTHER) {
      requestAnimationFrame(() => otherRef.current?.focus());
      return;
    }
    if (autoAdvance) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(goNext, reduced ? 0 : 280);
    }
  };
  const skip = () => {
    if (!question) return;
    update(question, { values: [], skipped: true });
    goNext();
  };
  const options: ClarifyingOption[] = question
    ? [...question.options, ...(question.allowOther ? [{ value: OTHER, label: "Other" }] : [])]
    : [];
  // Number keys pick options wherever focus is inside the card (except text fields).
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || !question || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, options.length)) {
      event.preventDefault();
      const option = options[n - 1];
      if (option) choose(question, option.value);
    }
  };
  const keyRef = useLatestRef(handleKeyDown);
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent) => keyRef.current(event);
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [keyRef]);
  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (index + (keys[event.key] ?? 0) + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next === null) return;
    event.preventDefault();
    const group = event.currentTarget.closest("[data-options]");
    group?.querySelectorAll<HTMLButtonElement>("[data-option]")[next]?.focus();
  };
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 18 * direction, filter: "blur(2px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)" },
        exit: { opacity: 0, x: -18 * direction, filter: "blur(2px)" },
      };
  const transition = reduced ? { duration: 0.12 } : { duration: 0.24, ease: easings.out };
  const selectedIndex = answer ? options.findIndex((o) => answer.values.includes(o.value)) : -1;
  const otherPicked = !!answer?.values.includes(OTHER);
  const canContinue = isAnswered(answer);
  return (
    <section
      ref={setRootRef}
      aria-labelledby={`${id}-title`}
      data-state={submitted ? "submitted" : onSummary ? "review" : "asking"}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-sm",
        className,
      )}
    >
      <header className={cn(blockReset, "flex items-start gap-3 px-4 pt-4 pb-3")}>
        <span aria-hidden="true" className={cn(blockReset, "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-pui-md bg-pui-primary/10 text-pui-primary-text")}>
          {submitted ? <CheckIcon className="size-4" /> : <SparklesIcon className="size-4" />}
        </span>
        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
          <h3 id={`${id}-title`} className={cn(blockReset, "text-sm font-semibold leading-snug text-pui-foreground")}>
            {submitted ? "Answers sent" : title}
          </h3>
          {description && !submitted ? <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</p> : null}
        </div>
        {total > 1 ? (
          <nav aria-label="Questions" className={cn(blockReset, "flex shrink-0 items-center gap-1 pt-1.5")}>
            {questions.map((q, i) => {
              const done = isAnswered(answers[q.id]) || answers[q.id]?.skipped;
              const current = !onSummary && i === step;
              const label = `Question ${i + 1}${done ? (answers[q.id]?.skipped ? ", skipped" : ", answered") : ""}`;
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-label={label}
                  aria-current={current ? "step" : undefined}
                  disabled={submitted || (!done && !current && i > step)}
                  onClick={() => go(i)}
                  className={cn(
                    controlReset,
                    focusRing,
                    "relative h-1.5 cursor-pointer rounded-pui-full transition-[width,background-color] duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none disabled:cursor-default",
                    current ? "w-5 bg-pui-primary" : done ? "w-1.5 bg-pui-primary/45 hover:bg-pui-primary/70" : "w-1.5 bg-pui-border",
                  )}
                />
              );
            })}
          </nav>
        ) : null}
      </header>
      <div className={cn(blockReset, "relative grid px-4 pb-4")}>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div key={onSummary ? "summary" : question?.id} {...slide} transition={transition} className={cn(blockReset, "flex min-w-0 flex-col gap-3 [grid-area:1/1]")}>
            {question ? (
              <>
                <div className={cn(blockReset, "flex flex-col gap-1")}>
                  <span className={cn(blockReset, "text-[0.6875rem] font-medium tracking-wide text-pui-muted-foreground uppercase tabular-nums")}>
                    {step + 1} of {total}
                    {question.multiple ? " · pick any" : ""}
                  </span>
                  <h4
                    ref={headingRef}
                    id={`${id}-q`}
                    tabIndex={-1}
                    className={cn(blockReset, "rounded-pui-sm text-base font-medium leading-snug text-pui-foreground outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring")}
                  >
                    {question.prompt}
                  </h4>
                </div>
                <ul
                  role={question.multiple ? "group" : "radiogroup"}
                  aria-labelledby={`${id}-q`}
                  data-options=""
                  className={cn(listReset, "flex flex-col gap-1.5")}
                >
                  {options.map((option, i) => {
                    const checked = !!answer?.values.includes(option.value);
                    const tabbable = question.multiple ? true : selectedIndex === -1 ? i === 0 : i === selectedIndex;
                    return (
                      <li key={option.value} className={cn(blockReset, "flex")}>
                        <button
                          type="button"
                          role={question.multiple ? "checkbox" : "radio"}
                          aria-checked={checked}
                          tabIndex={tabbable ? 0 : -1}
                          data-option=""
                          onClick={() => choose(question, option.value)}
                          onKeyDown={(e) => moveFocus(e, i)}
                          className={cn(
                            controlReset,
                            focusRing,
                            "group flex w-full cursor-pointer items-center gap-3 rounded-pui-md border px-3 py-2.5 text-start transition-[border-color,background-color,box-shadow] duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none",
                            checked
                              ? "border-pui-primary bg-pui-primary/8 shadow-[0_0_0_1px_var(--pui-primary)]"
                              : "border-pui-border hover:border-pui-muted-foreground/40 hover:bg-pui-muted/60",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              blockReset,
                              "flex size-5 shrink-0 items-center justify-center rounded-pui-sm border font-mono text-[0.6875rem] font-medium tabular-nums transition-colors duration-(--pui-duration-base) motion-reduce:transition-none",
                              checked ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : "border-pui-border bg-pui-muted text-pui-muted-foreground",
                            )}
                          >
                            {checked ? <CheckIcon className="size-3" /> : i < 9 ? i + 1 : ""}
                          </span>
                          <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
                            <span className={cn(blockReset, "font-medium text-pui-foreground")}>{option.label}</span>
                            {option.description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{option.description}</span> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {otherPicked ? (
                  <input
                    ref={otherRef}
                    type="text"
                    aria-label="Other answer"
                    value={answer?.other ?? ""}
                    placeholder={question.otherPlaceholder ?? "Type your answer"}
                    onChange={(e) => update(question, { values: answer?.values ?? [OTHER], other: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && isAnswered({ values: answer?.values ?? [], other: e.currentTarget.value })) {
                        e.preventDefault();
                        goNext();
                      }
                    }}
                    className={cn(
                      controlReset,
                      "h-9 w-full rounded-pui-md border border-pui-input bg-transparent px-3 text-sm text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground focus-visible:border-pui-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
                    )}
                  />
                ) : null}
                <div className={cn(blockReset, "flex items-center gap-2 pt-1")}>
                  <span className={cn(blockReset, "hidden text-xs text-pui-muted-foreground sm:inline")}>
                    Press {options.length > 1 ? `1–${Math.min(9, options.length)}` : "1"} to pick
                  </span>
                  <span className={cn(blockReset, "flex-1")} />
                  {step > 0 ? (
                    <Button size="sm" variant="ghost" tone="neutral" onClick={() => go(step - 1)}>
                      Back
                    </Button>
                  ) : null}
                  {question.optional !== false ? (
                    <Button size="sm" variant="ghost" tone="neutral" onClick={skip}>
                      Skip
                    </Button>
                  ) : null}
                  <Button size="sm" disabled={!canContinue} onClick={goNext}>
                    {returnToSummary || step === total - 1 ? "Review" : "Next"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h4 ref={headingRef} tabIndex={-1} className={cn(blockReset, "rounded-pui-sm text-xs font-medium text-pui-muted-foreground outline-hidden focus-visible:outline-2 focus-visible:outline-pui-ring")}>
                  {submitted ? `${answeredCount} of ${total} answered` : `Review · ${answeredCount} of ${total} answered`}
                </h4>
                <dl className={cn(blockReset, "flex flex-col divide-y divide-pui-border rounded-pui-md border border-pui-border")}>
                  {questions.map((q, i) => {
                    const text = describeClarifyingAnswer(q, answers[q.id]);
                    return (
                      <div key={q.id} className={cn(blockReset, "flex items-start gap-3 px-3 py-2.5")}>
                        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
                          <dt className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{q.promptText ?? textOf(q.prompt, `Question ${i + 1}`)}</dt>
                          <dd className={cn(blockReset, "text-sm font-medium", text ? "text-pui-foreground" : "text-pui-muted-foreground italic")}>{text ?? "Skipped"}</dd>
                        </div>
                        {!submitted ? (
                          <button
                            type="button"
                            aria-label={`Edit answer ${i + 1}`}
                            onClick={() => {
                              setReturnToSummary(true);
                              go(i);
                            }}
                            className={cn(
                              controlReset,
                              focusRing,
                              "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
                            )}
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </dl>
                {!submitted ? (
                  <div className={cn(blockReset, "flex items-center justify-end gap-2")}>
                    <Button size="sm" variant="ghost" tone="neutral" onClick={() => go(total - 1)}>
                      Back
                    </Button>
                    <Button size="sm" onClick={() => onSubmit?.(answers)}>
                      {submitLabel}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
});
