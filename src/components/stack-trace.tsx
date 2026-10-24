"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronRightIcon, ExternalLinkIcon } from "../lib/icons";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { CopyButton } from "./copy-button";
import { ScrollArea } from "./scroll-area";
export interface StackFrame {
  /** The original line. */
  raw: string;
  /** Function name, or null for anonymous and top-level frames. */
  fn: string | null;
  /** File path or URL as written, or null when the frame has no location (native code). */
  file: string | null;
  line: number | null;
  column: number | null;
  /** Your code (true) or a library, runtime or framework frame (false). */
  isApp: boolean;
}
export interface ParsedStack {
  /** "TypeError", "Error", ... ("Error" when the trace has no headline). */
  name: string;
  message: string;
  frames: StackFrame[];
}
export interface StackTraceProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** An Error, or stack text from V8 (Chrome, Node, Edge), Firefox or Safari. */
  trace: string | Error;
  /** Which frames are yours. Default: anything outside node_modules, node: and runtime internals. */
  isAppFrame?: (frame: Omit<StackFrame, "isApp">) => boolean;
  /** Makes app frames clickable, e.g. to open the file in an editor. */
  onOpenFrame?: (frame: StackFrame) => void;
  /** Start with library frames expanded. Default false. */
  defaultExpanded?: boolean;
  /** Start on the raw text instead of the parsed view. Default false. */
  defaultRaw?: boolean;
  /** Shown above the error, e.g. "Unhandled runtime error". */
  title?: React.ReactNode;
}
const V8 = /^\s*at\s+(?:(.*?)\s+\((.*)\)|(.*))\s*$/;
const GECKO = /^\s*(.*?)@(.*)\s*$/;
const LOCATION = /^(.*?):(\d+)(?::(\d+))?$/;
const LIBRARY = /node_modules|^node:|^internal\/|^\[native code\]$|^native$|<anonymous>|^index \d+$|webpack\/runtime|\/\.vite\/deps\//;
export const defaultIsAppFrame = (frame: Omit<StackFrame, "isApp">) => frame.file !== null && !LIBRARY.test(frame.file);
function splitLocation(location: string): { file: string | null; line: number | null; column: number | null } {
  const loc = location.trim();
  if (!loc || loc === "native" || loc === "[native code]" || loc === "<anonymous>") return { file: loc || null, line: null, column: null };
  const match = LOCATION.exec(loc);
  if (!match) return { file: loc, line: null, column: null };
  return { file: match[1] ?? loc, line: Number(match[2]), column: match[3] ? Number(match[3]) : null };
}
/** Parses stack text into a headline and frames. Lines that are not frames join the message. */
export function parseStackTrace(trace: string | Error, isAppFrame: StackTraceProps["isAppFrame"] = defaultIsAppFrame): ParsedStack {
  const text = typeof trace === "string" ? trace : (trace.stack ?? `${trace.name}: ${trace.message}`);
  const frames: StackFrame[] = [];
  const head: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let fn: string | null = null;
    let location: string | null = null;
    const v8 = V8.exec(raw);
    if (v8) {
      fn = v8[1] ?? null;
      location = v8[2] ?? v8[3] ?? "";
      // "at async fetchUser (…)" and "at new Store (…)" keep the keyword in front of the name.
    } else if (frames.length > 0 || /@.*:\d+/.test(raw)) {
      const gecko = GECKO.exec(raw);
      if (gecko) {
        fn = gecko[1] || null;
        location = gecko[2] ?? "";
      }
    }
    if (location === null) {
      if (frames.length === 0) head.push(raw.trim());
      continue;
    }
    // V8 eval frames: "eval at x (file:1:2), <anonymous>:3:4" – keep the outer file.
    const evalMatch = /^eval at .*?\((.*?)\)/.exec(location);
    const { file, line, column } = splitLocation(evalMatch?.[1] ?? location);
    const base = { raw: raw.trim(), fn: fn && fn !== "<anonymous>" ? fn : null, file, line, column };
    frames.push({ ...base, isApp: isAppFrame(base) });
  }
  const headline = head.join("\n");
  const match = /^([A-Za-z_$][\w$.]*(?:Error|Exception)|Error|Uncaught [A-Za-z]+):\s?([\s\S]*)$/.exec(headline);
  if (match) return { name: (match[1] ?? "Error").replace(/^Uncaught /, ""), message: match[2] ?? "", frames };
  if (typeof trace !== "string") return { name: trace.name || "Error", message: trace.message || headline, frames };
  return { name: "Error", message: headline, frames };
}
/** Drops the origin, bundler prefixes and cache-busting queries: "src/cart/total.ts". */
export function shortenPath(file: string): string {
  return file
    .replace(/^webpack-internal:\/\/\/(?:\(\w+\)\/)?/, "")
    .replace(/^file:\/\//, "")
    .replace(/^[a-z][\w+.-]*:\/\/[^/]+\//i, "")
    .replace(/\?[^:]*$/, "")
    .replace(/^\.\//, "");
}
type Group = { kind: "app"; frame: StackFrame; index: number } | { kind: "library"; frames: StackFrame[]; key: string };
function groupFrames(frames: StackFrame[]): Group[] {
  const groups: Group[] = [];
  frames.forEach((frame, index) => {
    if (frame.isApp) {
      groups.push({ kind: "app", frame, index });
      return;
    }
    const last = groups[groups.length - 1];
    if (last && last.kind === "library") last.frames.push(frame);
    else groups.push({ kind: "library", frames: [frame], key: `lib-${index}` });
  });
  return groups;
}
function FrameBody({ frame }: { frame: StackFrame }) {
  const path = frame.file ? shortenPath(frame.file) : null;
  const slash = path ? path.lastIndexOf("/") : -1;
  const dir = path && slash >= 0 ? path.slice(0, slash + 1) : "";
  const baseName = path ? path.slice(slash + 1) : null;
  return (
    <>
      <span className={cn(blockReset, "min-w-0 truncate font-mono text-[0.8125rem] font-medium")}>{frame.fn ?? <span className={cn(blockReset, "text-pui-muted-foreground italic")}>anonymous</span>}</span>
      {path ? (
        <span title={frame.file ?? undefined} className={cn(blockReset, "flex min-w-0 items-baseline font-mono text-xs")}>
          <span className={cn(blockReset, "min-w-0 truncate text-pui-muted-foreground")}>{dir}</span>
          <span className={cn(blockReset, "shrink-0 text-pui-foreground")}>{baseName}</span>
          {frame.line !== null ? (
            <span className={cn(blockReset, "ms-1 shrink-0 rounded-pui-sm bg-pui-muted px-1 tabular-nums text-pui-muted-foreground")}>
              {frame.line}
              {frame.column !== null ? `:${frame.column}` : ""}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}
/**
 * Readable stack trace for error pages, dev overlays and support tools. Parses V8, Firefox and Safari
 * stacks with no dependencies, puts the error headline first, marks the first frame in your code as
 * the likely cause, folds runs of library and runtime frames into "N library frames" rows and keeps
 * the raw text one toggle away with a copy button. App frames can open in your editor via onOpenFrame.
 */
export const StackTrace = React.forwardRef<HTMLElement, StackTraceProps>(function StackTrace(
  { trace, isAppFrame, onOpenFrame, defaultExpanded = false, defaultRaw = false, title, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const rawText = typeof trace === "string" ? trace : (trace.stack ?? `${trace.name}: ${trace.message}`);
  const parsed = React.useMemo(() => parseStackTrace(rawText, isAppFrame), [rawText, isAppFrame]);
  const groups = React.useMemo(() => groupFrames(parsed.frames), [parsed.frames]);
  const causeIndex = parsed.frames.findIndex((f) => f.isApp);
  const [raw, setRaw] = React.useState(defaultRaw);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const libraryCount = parsed.frames.length - parsed.frames.filter((f) => f.isApp).length;
  const transition = reduced ? { duration: 0 } : { duration: 0.22, ease: easings.out };
  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-name`}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs",
        className,
      )}
    >
      <header className={cn(blockReset, "flex items-start gap-3 border-b border-pui-border bg-pui-danger/5 px-4 py-3")}>
        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1")}>
          {title ? <span className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>{title}</span> : null}
          <h3 id={`${id}-name`} className={cn(blockReset, "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm leading-snug")}>
            <span className={cn(blockReset, "font-mono font-semibold text-pui-danger-text")}>{parsed.name}</span>
            {parsed.message ? <span className={cn(blockReset, "min-w-0 font-medium break-words whitespace-pre-wrap text-pui-foreground")}>{parsed.message}</span> : null}
          </h3>
          <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
            {parsed.frames.length} frames{libraryCount > 0 ? ` · ${libraryCount} from libraries` : ""}
          </span>
        </div>
        <div className={cn(blockReset, "flex shrink-0 items-center gap-1")}>
          <button
            type="button"
            aria-pressed={raw}
            onClick={() => setRaw((r) => !r)}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex h-7 cursor-pointer items-center rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground aria-pressed:bg-pui-muted aria-pressed:text-pui-foreground",
            )}
          >
            Raw
          </button>
          <CopyButton size="sm" variant="ghost" value={rawText} label="Copy stack trace" />
        </div>
      </header>
      {raw ? (
        <ScrollArea orientation="both" label="Raw stack trace" fade={false} viewportClassName="max-h-80">
          <pre className={cn(blockReset, "w-max min-w-full px-4 py-3 font-mono text-xs leading-relaxed text-pui-foreground")}>{rawText}</pre>
        </ScrollArea>
      ) : parsed.frames.length === 0 ? (
        <p className={cn(blockReset, "px-4 py-3 text-xs text-pui-muted-foreground")}>No stack frames in this trace.</p>
      ) : (
        <ol aria-label="Stack frames" className={cn(listReset, "flex flex-col py-1")}>
          {groups.map((group) => {
            if (group.kind === "app") {
              const { frame, index } = group;
              const cause = index === causeIndex;
              const content = (
                <>
                  <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
                    <FrameBody frame={frame} />
                  </span>
                  {cause ? (
                    <span className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-danger/12 px-1.5 py-0.5 text-[0.6875rem] font-medium text-pui-danger-text")}>
                      Likely cause
                    </span>
                  ) : null}
                  {onOpenFrame && frame.file ? <ExternalLinkIcon className="size-3.5 shrink-0 text-pui-muted-foreground" /> : null}
                </>
              );
              const rowClass = cn(
                "relative flex w-full min-w-0 items-center gap-3 border-s-2 px-4 py-2 text-start",
                cause ? "border-pui-danger bg-pui-danger/5" : "border-transparent",
              );
              return (
                <li key={`app-${index}`} data-app="" className={cn(blockReset, "flex")}>
                  {onOpenFrame && frame.file ? (
                    <button
                      type="button"
                      onClick={() => onOpenFrame(frame)}
                      aria-label={`Open ${frame.fn ?? "anonymous"} at ${shortenPath(frame.file)}${frame.line !== null ? ` line ${frame.line}` : ""}`}
                      className={cn(controlReset, focusRing, rowClass, "cursor-pointer transition-colors hover:bg-pui-muted -outline-offset-2")}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={cn(blockReset, rowClass)}>{content}</div>
                  )}
                </li>
              );
            }
            const expanded = open[group.key] ?? defaultExpanded;
            const panelId = `${id}-${group.key}`;
            return (
              <li key={group.key} className={cn(blockReset, "flex flex-col")}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen((o) => ({ ...o, [group.key]: !expanded }))}
                  className={cn(
                    controlReset,
                    focusRing,
                    "flex w-full cursor-pointer items-center gap-2 px-4 py-1.5 text-start text-xs text-pui-muted-foreground transition-colors -outline-offset-2 hover:bg-pui-muted hover:text-pui-foreground",
                  )}
                >
                  <ChevronRightIcon className={cn("size-3.5 shrink-0 transition-transform duration-(--pui-duration-base) motion-reduce:transition-none rtl:-scale-x-100", expanded && "rotate-90")} />
                  <span className={cn(blockReset, "flex-1")}>
                    {group.frames.length} library {group.frames.length === 1 ? "frame" : "frames"}
                  </span>
                  <span aria-hidden="true" className={cn(blockReset, "flex gap-0.5")}>
                    {group.frames.slice(0, 12).map((_, i) => (
                      <span key={i} className={cn(blockReset, "h-2.5 w-1 rounded-pui-full bg-pui-border")} />
                    ))}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.ol
                      key="frames"
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={transition}
                      className={cn(listReset, "overflow-hidden opacity-75")}
                    >
                      {group.frames.map((frame, i) => (
                        <li key={i} className={cn(blockReset, "flex min-w-0 flex-col gap-0.5 py-1.5 ps-10 pe-4")}>
                          <FrameBody frame={frame} />
                        </li>
                      ))}
                    </motion.ol>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
});
