"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ArrowUpIcon, SearchIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { CopyButton } from "./copy-button";
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogLine {
  id: string | number;
  /** Shown as written when a string; numbers and Dates are formatted in `timeZone`. */
  time?: string | number | Date;
  /** Default "info". */
  level?: LogLevel;
  message: string;
  /** Short origin label, e.g. "api" or "worker-2". */
  source?: string;
}
export interface LogViewerProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  lines: LogLine[];
  /** Header label, e.g. "Build log". */
  title?: React.ReactNode;
  /** Keep the newest line in view as lines arrive. Scrolling up pauses it. Default true. */
  follow?: boolean;
  /** Levels shown at first. Default all. */
  defaultLevels?: LogLevel[];
  defaultSearch?: string;
  /** Default true. */
  showTimestamps?: boolean;
  /** Wrap long lines instead of scrolling sideways. Default false. */
  wrap?: boolean;
  /** Only the last N lines render. Default 2000. */
  maxLines?: number;
  /** Time zone for number and Date times. Default "UTC", so server and client agree. */
  timeZone?: string;
  /** Override time formatting. */
  formatTime?: (time: number | Date) => string;
  /** Height of the scrolling pane. Default 320. */
  height?: number | string;
}
const LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];
const LEVEL_STYLE: Record<LogLevel, { dot: string; text: string; row: string; label: string }> = {
  debug: { dot: "bg-pui-muted-foreground/60", text: "text-pui-muted-foreground", row: "", label: "DBG" },
  info: { dot: "bg-pui-info", text: "text-pui-info-text", row: "", label: "INF" },
  warn: { dot: "bg-pui-warning", text: "text-pui-warning-text", row: "bg-pui-warning/6", label: "WRN" },
  error: { dot: "bg-pui-danger", text: "text-pui-danger-text", row: "bg-pui-danger/7", label: "ERR" },
};
const formatters = new Map<string, Intl.DateTimeFormat>();
function defaultFormatTime(time: number | Date, timeZone: string): string {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3, hour12: false, timeZone });
    formatters.set(timeZone, format);
  }
  return format.format(time);
}
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className={cn(blockReset, "rounded-[2px] bg-pui-highlight px-px text-inherit")}>
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}
const toggleClass = cn(
  controlReset,
  focusRing,
  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground aria-pressed:bg-pui-muted aria-pressed:text-pui-foreground",
);
/**
 * Log pane for builds, deploys and services. Level chips with live counts filter the stream, search
 * highlights and filters as you type, and follow mode keeps the newest line in view until you
 * scroll up to read; then a "N new lines" pill waits at the bottom to jump back and resume.
 */
export const LogViewer = React.forwardRef<HTMLElement, LogViewerProps>(function LogViewer(
  {
    lines,
    title,
    follow = true,
    defaultLevels,
    defaultSearch = "",
    showTimestamps: showTimestampsProp = true,
    wrap: wrapProp = false,
    maxLines = 2000,
    timeZone = "UTC",
    formatTime,
    height = 320,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [levels, setLevels] = React.useState<ReadonlySet<LogLevel>>(() => new Set(defaultLevels ?? LEVELS));
  const [search, setSearch] = React.useState(defaultSearch);
  const [showTimestamps, setShowTimestamps] = React.useState(showTimestampsProp);
  const [wrap, setWrap] = React.useState(wrapProp);
  const [following, setFollowing] = React.useState(follow);
  const [pausedAt, setPausedAt] = React.useState<number | null>(null);
  const paneRef = React.useRef<HTMLDivElement>(null);
  const programmatic = React.useRef(false);
  const recent = React.useMemo(() => (lines.length > maxLines ? lines.slice(-maxLines) : lines), [lines, maxLines]);
  const counts = React.useMemo(() => {
    const c: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const line of recent) c[line.level ?? "info"] += 1;
    return c;
  }, [recent]);
  const query = search.trim();
  const visible = React.useMemo(
    () => recent.filter((line) => levels.has(line.level ?? "info") && (!query || line.message.toLowerCase().includes(query.toLowerCase()) || !!line.source?.toLowerCase().includes(query.toLowerCase()))),
    [recent, levels, query],
  );
  const scrollToEnd = React.useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return;
    programmatic.current = true;
    pane.scrollTop = pane.scrollHeight;
    requestAnimationFrame(() => {
      programmatic.current = false;
    });
  }, []);
  useIsomorphicLayoutEffect(() => {
    if (following) scrollToEnd();
  }, [visible.length, following, wrap, showTimestamps, scrollToEnd]);
  const onScroll = () => {
    const pane = paneRef.current;
    if (!pane || programmatic.current || !follow) return;
    const atEnd = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 24;
    if (atEnd && !following) {
      setFollowing(true);
      setPausedAt(null);
    } else if (!atEnd && following) {
      setFollowing(false);
      setPausedAt(lines.length);
    }
  };
  const resume = () => {
    setFollowing(true);
    setPausedAt(null);
    scrollToEnd();
  };
  // End jumps back to the newest line and resumes following.
  const resumeRef = useLatestRef(resume);
  React.useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !follow) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "End") resumeRef.current();
    };
    pane.addEventListener("keydown", onKey);
    return () => pane.removeEventListener("keydown", onKey);
  }, [follow, resumeRef]);
  const fresh = pausedAt === null ? 0 : Math.max(0, lines.length - pausedAt);
  const toggleLevel = (level: LogLevel) =>
    setLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  const timeText = (time: LogLine["time"]) => {
    if (time === undefined) return "";
    if (typeof time === "string") return time;
    return formatTime ? formatTime(time) : defaultFormatTime(time, timeZone);
  };
  const copyText = () => visible.map((l) => [showTimestamps ? timeText(l.time) : "", (l.level ?? "info").toUpperCase(), l.source ? `[${l.source}]` : "", l.message].filter(Boolean).join(" ")).join("\n");
  return (
    <section
      ref={ref}
      aria-labelledby={title ? `${id}-title` : undefined}
      aria-label={title ? undefined : "Log"}
      {...props}
      className={cn(
        blockReset,
        "relative flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs",
        className,
      )}
    >
      <header className={cn(blockReset, "flex flex-col gap-2 border-b border-pui-border px-3 py-2")}>
        <div className={cn(blockReset, "flex min-w-0 items-center gap-3")}>
          {title ? (
            <h3 id={`${id}-title`} className={cn(blockReset, "flex shrink-0 items-center gap-2 text-sm font-semibold text-pui-foreground")}>
              <span aria-hidden="true" className={cn(blockReset, "relative flex size-2")}>
                {following && follow && !reduced ? <span className={cn(blockReset, "absolute inset-0 animate-ping rounded-pui-full bg-pui-success/60")} /> : null}
                <span className={cn(blockReset, "relative size-2 rounded-pui-full", following && follow ? "bg-pui-success" : "bg-pui-muted-foreground/50")} />
              </span>
              {title}
            </h3>
          ) : null}
          <label className={cn(blockReset, "relative ms-auto flex h-7 min-w-0 max-w-56 flex-1 items-center")}>
            <span className={cn(blockReset, "sr-only")}>Search logs</span>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-2 size-3.5 text-pui-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className={cn(
                controlReset,
                "h-7 w-full rounded-pui-md border border-pui-input bg-transparent ps-7 pe-7 text-xs text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground focus-visible:border-pui-ring [&::-webkit-search-cancel-button]:hidden",
              )}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className={cn(controlReset, focusRing, "absolute end-1 flex size-5 cursor-pointer items-center justify-center rounded-pui-sm text-pui-muted-foreground hover:text-pui-foreground")}
              >
                <XIcon className="size-3" />
              </button>
            ) : null}
          </label>
          <div className={cn(blockReset, "flex items-center gap-0.5")}>
            <button type="button" aria-pressed={showTimestamps} onClick={() => setShowTimestamps((v) => !v)} className={toggleClass}>
              Time
            </button>
            <button type="button" aria-pressed={wrap} onClick={() => setWrap((v) => !v)} className={toggleClass}>
              Wrap
            </button>
            <CopyButton size="sm" variant="ghost" value={copyText} label="Copy visible lines" />
          </div>
        </div>
        <div role="group" aria-label="Levels" className={cn(blockReset, "flex flex-wrap items-center gap-0.5")}>
          {LEVELS.map((level) => (
            <button key={level} type="button" aria-pressed={levels.has(level)} onClick={() => toggleLevel(level)} className={cn(toggleClass, "opacity-60 aria-pressed:opacity-100")}>
              <span aria-hidden="true" className={cn(blockReset, "size-1.5 rounded-pui-full", LEVEL_STYLE[level].dot)} />
              <span className={cn(blockReset, "capitalize")}>{level}</span>{" "}
              <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>{counts[level]}</span>
            </button>
          ))}
        </div>
      </header>
      <div
        ref={paneRef}
        role="log"
        aria-live="off"
        aria-label={typeof title === "string" ? `${title} lines` : "Log lines"}
        // Focusable only when there is something to scroll through.
        tabIndex={visible.length > 0 ? 0 : undefined}
        onScroll={onScroll}
        style={{ height }}
        className={cn(blockReset, "overflow-auto bg-pui-muted/30 font-mono text-xs leading-5 outline-hidden focus-visible:shadow-[inset_0_0_0_2px_var(--pui-ring)]")}
      >
        {visible.length === 0 ? (
          <p className={cn(blockReset, "px-3 py-6 text-center font-sans text-xs text-pui-muted-foreground")}>
            {recent.length === 0 ? "Waiting for output…" : "No lines match these filters."}
          </p>
        ) : (
          <ol className={cn(listReset, "py-1.5", wrap ? "w-full" : "w-max min-w-full")}>
            {visible.map((line, i) => {
              const level = line.level ?? "info";
              const style = LEVEL_STYLE[level];
              return (
                <li key={line.id} data-level={level} className={cn(blockReset, "flex gap-3 px-3 hover:bg-pui-muted/70", style.row)}>
                  <span aria-hidden="true" className={cn(blockReset, "w-8 shrink-0 select-none text-end tabular-nums text-pui-muted-foreground/60")}>
                    {i + 1}
                  </span>
                  {showTimestamps && line.time !== undefined ? <span className={cn(blockReset, "shrink-0 tabular-nums text-pui-muted-foreground")}>{timeText(line.time)}</span> : null}
                  <span className={cn(blockReset, "w-7 shrink-0 font-semibold", style.text)}>
                    <span aria-hidden="true">{style.label}</span>
                    <span className={cn(blockReset, "sr-only")}>{level}</span>
                  </span>
                  {line.source ? <span className={cn(blockReset, "shrink-0 text-pui-primary-text")}><Highlight text={line.source} query={query} /></span> : null}
                  <span className={cn(blockReset, "min-w-0 text-pui-foreground", wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre")}>
                    <Highlight text={line.message} query={query} />
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <AnimatePresence>
        {!following && follow ? (
          <motion.button
            key="jump"
            type="button"
            onClick={resume}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
            className={cn(
              controlReset,
              focusRing,
              "absolute bottom-3 left-1/2 z-10 inline-flex h-7 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-pui-full bg-pui-foreground px-3 text-xs font-medium text-pui-background shadow-pui-md",
            )}
          >
            <ArrowUpIcon aria-hidden="true" className="size-3.5 rotate-180" />
            {fresh > 0 ? `${fresh} new ${fresh === 1 ? "line" : "lines"}` : "Jump to latest"}
          </motion.button>
        ) : null}
      </AnimatePresence>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {fresh > 0 ? `${fresh} new log ${fresh === 1 ? "line" : "lines"} below` : ""}
      </span>
      <footer className={cn(blockReset, "flex items-center gap-2 border-t border-pui-border px-3 py-1.5 text-[0.6875rem] text-pui-muted-foreground")}>
        <span className={cn(blockReset, "tabular-nums")}>
          {visible.length === recent.length ? `${recent.length} lines` : `${visible.length} of ${recent.length} lines`}
        </span>
        {follow ? <span>· {following ? "Following" : "Paused, press End to follow"}</span> : null}
        {timeZone !== "UTC" || formatTime ? null : <span className={cn(blockReset, "ms-auto")}>UTC</span>}
      </footer>
    </section>
  );
});
