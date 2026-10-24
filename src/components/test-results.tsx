"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon, CircleCheckIcon, CircleDashedIcon, CircleXIcon, ClockIcon, FileIcon, MinusIcon, RotateCcwIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TestStatus = "passed" | "failed" | "skipped" | "running" | "queued";

export interface TestError {
  message: string;
  /** Shown as "- Expected". */
  expected?: string;
  /** Shown as "+ Received". */
  received?: string;
  stack?: string;
}

export interface TestCase {
  /** Default: the name. */
  id?: string;
  name: string;
  status: TestStatus;
  /** ms. */
  duration?: number;
  error?: TestError | string;
  /** Attempts before the final result; > 0 shows a "flaky" hint on passes. */
  retries?: number;
}

export interface TestSuite {
  /** Default: the file or name. */
  id?: string;
  name: string;
  file?: string;
  tests: TestCase[];
}

export type TestResultsFilter = "all" | "failed" | "passed" | "skipped";

export type TestRerunTarget = { type: "failed" } | { type: "suite"; suite: TestSuite } | { type: "test"; suite: TestSuite; test: TestCase };

export interface TestResultsProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  suites: TestSuite[];
  /** Heading. Default "Test results". */
  title?: React.ReactNode;
  filter?: TestResultsFilter;
  defaultFilter?: TestResultsFilter;
  onFilterChange?: (filter: TestResultsFilter) => void;
  /** "slowest" sorts tests and suites by duration. Default "default" (as given). */
  sort?: "default" | "slowest";
  /** Tests at or above this many ms get a "slow" mark. Default 500. */
  slowThreshold?: number;
  /** Which suites start open. Default "failed" (only suites with failures). */
  defaultExpanded?: "failed" | "all" | "none";
  /** Shows Rerun buttons (failed, per suite, per failed test). */
  onRerun?: (target: TestRerunTarget) => void;
  /** Makes file names buttons. */
  onOpenFile?: (file: string, test?: TestCase) => void;
  /** Wall time of the run in ms. Default: the sum of test durations. */
  duration?: number;
  /** Shown when the filter matches nothing. */
  emptyMessage?: React.ReactNode;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  running: number;
  duration: number;
}

/** Counts and total duration across suites; queued counts as running. */
export function summarizeTests(suites: TestSuite[]): TestSummary {
  const s: TestSummary = { total: 0, passed: 0, failed: 0, skipped: 0, running: 0, duration: 0 };
  for (const suite of suites)
    for (const t of suite.tests) {
      s.total++;
      s.duration += t.duration ?? 0;
      if (t.status === "passed") s.passed++;
      else if (t.status === "failed") s.failed++;
      else if (t.status === "skipped") s.skipped++;
      else s.running++;
    }
  return s;
}

/** "84 ms", "1.24 s", "2m 05s". */
export function formatTestDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const suiteStatus = (suite: TestSuite): TestStatus => {
  let all = true;
  let running = false;
  for (const t of suite.tests) {
    if (t.status === "failed") return "failed";
    if (t.status === "running" || t.status === "queued") running = true;
    if (t.status !== "skipped") all = false;
  }
  if (running) return "running";
  return all && suite.tests.length > 0 ? "skipped" : "passed";
};

const suiteKey = (s: TestSuite) => s.id ?? s.file ?? s.name;
const testKey = (t: TestCase) => t.id ?? t.name;
const matches = (t: TestCase, f: TestResultsFilter) => f === "all" || t.status === f;
const sumDuration = (s: TestSuite) => s.tests.reduce((a, t) => a + (t.duration ?? 0), 0);

const STATUS_LABEL: Record<TestStatus, string> = { passed: "Passed", failed: "Failed", skipped: "Skipped", running: "Running", queued: "Queued" };

function StatusIcon({ status, className }: { status: TestStatus; className?: string }) {
  const base = cn("size-4", className);
  if (status === "passed") return <CircleCheckIcon className={cn(base, "text-pui-success-text")} />;
  if (status === "failed") return <CircleXIcon className={cn(base, "text-pui-danger-text")} />;
  if (status === "skipped") return <MinusIcon className={cn(base, "text-pui-muted-foreground")} />;
  return <CircleDashedIcon className={cn(base, "text-pui-info-text", status === "running" && "motion-safe:animate-spin [animation-duration:1.6s]")} />;
}

const iconButton = cn(
  controlReset,
  focusRing,
  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground [&_svg]:size-3.5",
);

function ErrorBlock({ error }: { error: TestError | string }) {
  const [stackOpen, setStackOpen] = React.useState(false);
  const stackId = React.useId();
  const e = typeof error === "string" ? { message: error } : error;
  return (
    <div className={cn(blockReset, "mt-2 overflow-hidden rounded-pui-lg border border-pui-danger/25 bg-pui-danger/6 text-xs")}>
      <p className={cn(blockReset, "px-3 py-2 font-mono leading-relaxed whitespace-pre-wrap text-pui-danger-text [overflow-wrap:anywhere]")}>{e.message}</p>
      {e.expected !== undefined || e.received !== undefined ? (
        <dl className={cn(blockReset, "grid grid-cols-[auto_1fr] border-t border-pui-danger/20 bg-pui-background/70 font-mono leading-relaxed")}>
          {e.expected !== undefined ? (
            <>
              <dt className={cn(blockReset, "bg-pui-success/10 py-1 ps-3 pe-2 text-pui-success-text select-none")}>- Expected</dt>
              <dd className={cn(blockReset, "bg-pui-success/10 py-1 pe-3 whitespace-pre-wrap text-pui-foreground [overflow-wrap:anywhere]")}>{e.expected}</dd>
            </>
          ) : null}
          {e.received !== undefined ? (
            <>
              <dt className={cn(blockReset, "bg-pui-danger/10 py-1 ps-3 pe-2 text-pui-danger-text select-none")}>+ Received</dt>
              <dd className={cn(blockReset, "bg-pui-danger/10 py-1 pe-3 whitespace-pre-wrap text-pui-foreground [overflow-wrap:anywhere]")}>{e.received}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {e.stack ? (
        <div className={cn(blockReset, "border-t border-pui-danger/20")}>
          <button
            type="button"
            aria-expanded={stackOpen}
            aria-controls={stackId}
            onClick={() => setStackOpen((o) => !o)}
            className={cn(controlReset, focusRing, "flex w-full cursor-pointer items-center gap-1.5 px-3 py-1.5 text-start text-pui-muted-foreground hover:text-pui-foreground")}
          >
            <ChevronDownIcon className={cn("size-3.5 transition-transform", !stackOpen && "-rotate-90")} />
            Stack trace
          </button>
          {stackOpen ? (
            <pre id={stackId} className={cn(blockReset, "overflow-x-auto px-3 pb-2 font-mono text-[0.6875rem] leading-relaxed text-pui-muted-foreground")}>
              {e.stack}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Test run report that leads with what broke: a status headline and stacked pass / fail / skip
 * bar, filter pills with counts, suites that open only where something failed, per-test duration
 * bars with slow and flaky marks, and failures with their message, an Expected / Received block
 * and a folded stack. Optional Rerun actions (all failed, a suite, one test) and file links.
 * The ref goes to the section.
 */
export const TestResults = React.forwardRef<HTMLElement, TestResultsProps>(function TestResults(
  {
    suites,
    title = "Test results",
    filter: filterProp,
    defaultFilter = "all",
    onFilterChange,
    sort = "default",
    slowThreshold = 500,
    defaultExpanded = "failed",
    onRerun,
    onOpenFile,
    duration: durationProp,
    emptyMessage = "No tests match this filter.",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [filterState, setFilterState] = React.useState<TestResultsFilter>(defaultFilter);
  const filter = filterProp ?? filterState;
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});
  const summary = React.useMemo(() => summarizeTests(suites), [suites]);
  const total = durationProp ?? summary.duration;
  const maxDuration = React.useMemo(() => Math.max(1, ...suites.flatMap((s) => s.tests.map((t) => t.duration ?? 0))), [suites]);

  const setFilter = (next: TestResultsFilter) => {
    if (filterProp === undefined) setFilterState(next);
    onFilterChange?.(next);
  };

  const visible = React.useMemo(() => {
    const rows = suites
      .map((suite) => {
        let tests = suite.tests.filter((t) => matches(t, filter));
        if (sort === "slowest") tests = [...tests].sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
        return { suite, tests };
      })
      .filter((r) => r.tests.length > 0);
    return sort === "slowest" ? rows.sort((a, b) => sumDuration(b.suite) - sumDuration(a.suite)) : rows;
  }, [suites, filter, sort]);

  const overall: TestStatus = summary.failed > 0 ? "failed" : summary.running > 0 ? "running" : summary.total > 0 && summary.skipped === summary.total ? "skipped" : "passed";
  const headline =
    overall === "failed"
      ? `${summary.failed} ${summary.failed === 1 ? "test" : "tests"} failed`
      : overall === "running"
        ? `Running ${summary.running} of ${summary.total}`
        : overall === "skipped"
          ? "All tests skipped"
          : `All ${summary.total} tests passed`;
  const parts = [
    summary.failed ? `${summary.failed} failed` : null,
    summary.passed ? `${summary.passed} passed` : null,
    summary.skipped ? `${summary.skipped} skipped` : null,
    summary.running ? `${summary.running} running` : null,
  ].filter(Boolean);

  const segments: { key: string; value: number; className: string }[] = [
    { key: "failed", value: summary.failed, className: "bg-pui-danger" },
    { key: "passed", value: summary.passed, className: "bg-pui-success" },
    { key: "skipped", value: summary.skipped, className: "bg-pui-muted-foreground/35" },
    { key: "running", value: summary.running, className: "bg-pui-info/60" },
  ];

  const filters: { value: TestResultsFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: summary.total },
    { value: "failed", label: "Failed", count: summary.failed },
    { value: "passed", label: "Passed", count: summary.passed },
    { value: "skipped", label: "Skipped", count: summary.skipped },
  ];

  const isOpen = (suite: TestSuite) => {
    const key = suiteKey(suite);
    if (key in toggled) return toggled[key] === true;
    if (filter === "failed") return true;
    return defaultExpanded === "all" || (defaultExpanded === "failed" && suiteStatus(suite) === "failed");
  };

  const headingId = `${id}-title`;

  const fileLabel = (file: string, test?: TestCase) =>
    onOpenFile ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenFile(file, test);
        }}
        className={cn(controlReset, focusRing, "inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-pui-sm font-mono text-[0.6875rem] text-pui-muted-foreground underline-offset-2 hover:text-pui-foreground hover:underline")}
      >
        <FileIcon className="size-3" />
        <span className={cn(blockReset, "truncate")}>{file}</span>
      </button>
    ) : (
      <span className={cn(blockReset, "inline-flex min-w-0 items-center gap-1 font-mono text-[0.6875rem] text-pui-muted-foreground")}>
        <FileIcon className="size-3" />
        <span className={cn(blockReset, "truncate")}>{file}</span>
      </span>
    );

  return (
    <section ref={ref} aria-labelledby={headingId} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-4 text-pui-foreground", className)}>
      <div className={cn(blockReset, "flex flex-col gap-3")}>
        <div className={cn(blockReset, "flex flex-wrap items-start justify-between gap-3")}>
          <div className={cn(blockReset, "flex min-w-0 items-start gap-3")}>
            <span
              className={cn(
                blockReset,
                "flex size-9 shrink-0 items-center justify-center rounded-pui-lg",
                overall === "failed" ? "bg-pui-danger/12" : overall === "running" ? "bg-pui-info/12" : overall === "skipped" ? "bg-pui-muted" : "bg-pui-success/12",
              )}
            >
              <StatusIcon status={overall} className="size-5" />
            </span>
            <div className={cn(blockReset, "min-w-0")}>
              <h3 id={headingId} className={cn(blockReset, "text-xs font-medium tracking-wide text-pui-muted-foreground uppercase")}>
                {title}
              </h3>
              <p role="status" className={cn(blockReset, "text-base font-semibold text-pui-foreground")}>
                {headline}
              </p>
              <p className={cn(blockReset, "mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-xs text-pui-muted-foreground")}>
                <span className={cn(blockReset)}>{parts.join(" · ")}</span>
                <span aria-hidden="true" className={cn(blockReset)}>·</span>
                <span className={cn(blockReset, "inline-flex items-center gap-1 tabular-nums")}>
                  <ClockIcon className="size-3" />
                  {formatTestDuration(total)}
                </span>
              </p>
            </div>
          </div>
          {onRerun && summary.failed > 0 ? (
            <button
              type="button"
              onClick={() => onRerun({ type: "failed" })}
              className={cn(controlReset, iconButton, "border border-pui-border bg-pui-background text-pui-foreground shadow-pui-xs hover:bg-pui-muted")}
            >
              <RotateCcwIcon />
              Rerun failed
            </button>
          ) : null}
        </div>
        <div
          role="img"
          aria-label={parts.join(", ") || "No tests"}
          className={cn(blockReset, "flex h-2 w-full gap-0.5 overflow-hidden rounded-pui-full bg-pui-muted")}
        >
          {summary.total > 0
            ? segments
                .filter((s) => s.value > 0)
                .map((s, i) => (
                  <motion.span
                    key={s.key}
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${(s.value / summary.total) * 100}%` }}
                    transition={reduced ? { duration: 0 } : { duration: durations.page, ease: easings.out, delay: i * 0.05 }}
                    className={cn(blockReset, "h-full first:rounded-s-pui-full last:rounded-e-pui-full", s.className)}
                  />
                ))
            : null}
        </div>
        <div className={cn(blockReset, "flex flex-wrap items-center justify-between gap-2")}>
          <div role="group" aria-label="Filter tests" className={cn(blockReset, "inline-flex rounded-pui-md bg-pui-muted p-0.5")}>
            {filters.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    controlReset,
                    focusRing,
                    "relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-pui-sm px-2.5 text-xs font-medium transition-colors",
                    active ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId={`${id}-filter`}
                      transition={reduced ? { duration: 0 } : springs.snappy}
                      className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-background shadow-pui-xs")}
                    />
                  ) : null}
                  <span className={cn(blockReset, "relative")}>{f.label}</span>{" "}
                  <span className={cn(blockReset, "relative tabular-nums", f.value === "failed" && f.count > 0 ? "text-pui-danger-text" : "text-pui-muted-foreground")}>{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className={cn(blockReset, "rounded-pui-lg border border-dashed border-pui-border px-4 py-6 text-center text-sm text-pui-muted-foreground")}>{emptyMessage}</p>
      ) : (
        <ul className={cn(listReset, "flex flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background")}>
          {visible.map(({ suite, tests }) => {
            const key = suiteKey(suite);
            const open = isOpen(suite);
            const status = suiteStatus(suite);
            const panelId = `${id}-suite-${key}`;
            const failed = suite.tests.filter((t) => t.status === "failed").length;
            return (
              <li key={key} className={cn(blockReset, "border-b border-pui-border last:border-b-0")}>
                <div className={cn(blockReset, "flex items-center gap-2 pe-2", status === "failed" && "bg-pui-danger/4")}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setToggled((t) => ({ ...t, [key]: !open }))}
                    className={cn(controlReset, focusRing, "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2.5 ps-3 text-start")}
                  >
                    <motion.span
                      aria-hidden="true"
                      animate={{ rotate: open ? 0 : -90 }}
                      transition={reduced ? { duration: 0 } : springs.snappy}
                      className={cn(blockReset, "inline-flex text-pui-muted-foreground")}
                    >
                      <ChevronDownIcon className="size-3.5" />
                    </motion.span>
                    <StatusIcon status={status} />
                    <span className={cn(blockReset, "sr-only")}>{`${STATUS_LABEL[status]}:`}</span>{" "}
                    <span className={cn(blockReset, "truncate text-sm font-medium text-pui-foreground")}>{suite.name}</span>{" "}
                    {failed > 0 ? (
                      <span className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-danger/12 px-1.5 py-0.5 text-[0.6875rem] font-medium text-pui-danger-text tabular-nums")}>
                        {failed} failed
                      </span>
                    ) : null}{" "}
                    <span className={cn(blockReset, "ms-auto shrink-0 text-xs text-pui-muted-foreground tabular-nums")}>
                      {suite.tests.length} {suite.tests.length === 1 ? "test" : "tests"} · {formatTestDuration(sumDuration(suite))}
                    </span>
                  </button>
                  {suite.file ? <span className={cn(blockReset, "hidden max-w-48 min-w-0 sm:inline-flex")}>{fileLabel(suite.file)}</span> : null}
                  {onRerun ? (
                    <button type="button" aria-label={`Rerun ${suite.name}`} title="Rerun suite" onClick={() => onRerun({ type: "suite", suite })} className={cn(controlReset, iconButton, "w-7 justify-center px-0")}>
                      <RotateCcwIcon />
                    </button>
                  ) : null}
                </div>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      key="tests"
                      id={panelId}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={reduced ? { duration: durations.fast } : { duration: durations.slow, ease: easings.out }}
                      className={cn(blockReset, "overflow-hidden")}
                    >
                      <ul aria-label={`${suite.name} tests`} className={cn(listReset, "flex flex-col border-t border-pui-border/70 bg-pui-muted/20 py-1")}>
                        {tests.map((test) => {
                          const ms = test.duration ?? 0;
                          const slow = test.duration !== undefined && ms >= slowThreshold;
                          const flaky = test.status === "passed" && (test.retries ?? 0) > 0;
                          return (
                            <li key={testKey(test)} className={cn(blockReset, "px-3 py-1.5 ps-9")}>
                              <div className={cn(blockReset, "flex min-w-0 items-center gap-2.5")}>
                                <StatusIcon status={test.status} className="size-3.5" />
                                <span className={cn(blockReset, "sr-only")}>{`${STATUS_LABEL[test.status]}:`}</span>{" "}
                                <span
                                  className={cn(
                                    blockReset,
                                    "min-w-0 flex-1 truncate text-[0.8125rem]",
                                    test.status === "skipped" ? "text-pui-muted-foreground" : "text-pui-foreground",
                                    test.status === "failed" && "font-medium",
                                  )}
                                >
                                  {test.name}
                                </span>
                                {flaky ? (
                                  <span title={`Passed after ${test.retries} ${test.retries === 1 ? "retry" : "retries"}`} className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-warning/14 px-1.5 py-0.5 text-[0.6875rem] font-medium text-pui-warning-text")}>
                                    flaky ×{test.retries}
                                  </span>
                                ) : null}
                                {test.duration !== undefined ? (
                                  <span className={cn(blockReset, "flex shrink-0 items-center gap-2")}>
                                    <span aria-hidden="true" className={cn(blockReset, "hidden h-1 w-16 overflow-hidden rounded-pui-full bg-pui-muted sm:block")}>
                                      <motion.span
                                        initial={reduced ? false : { scaleX: 0 }}
                                        animate={{ scaleX: Math.max(0.04, ms / maxDuration) }}
                                        transition={reduced ? { duration: 0 } : { duration: durations.page, ease: easings.out }}
                                        className={cn(blockReset, "block h-full w-full origin-left rounded-pui-full", slow ? "bg-pui-warning" : "bg-pui-muted-foreground/45")}
                                      />
                                    </span>
                                    <span className={cn(blockReset, "w-14 text-end text-xs tabular-nums", slow ? "font-medium text-pui-warning-text" : "text-pui-muted-foreground")}>
                                      {formatTestDuration(ms)}
                                      {slow ? <span className={cn(blockReset, "sr-only")}> (slow)</span> : null}
                                    </span>
                                  </span>
                                ) : (
                                  <span className={cn(blockReset, "w-14 text-end text-xs text-pui-muted-foreground")}>{test.status === "queued" ? "queued" : test.status === "running" ? "…" : ""}</span>
                                )}
                                {onRerun && test.status === "failed" ? (
                                  <button type="button" aria-label={`Rerun ${test.name}`} title="Rerun test" onClick={() => onRerun({ type: "test", suite, test })} className={cn(controlReset, iconButton, "-me-1 w-7 justify-center px-0")}>
                                    <RotateCcwIcon />
                                  </button>
                                ) : null}
                              </div>
                              {test.status === "failed" && test.error ? <ErrorBlock error={test.error} /> : null}
                            </li>
                          );
                        })}
                      </ul>
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
