"use client";
import { motion } from "motion/react";
import * as React from "react";
import { CopyButton } from "../components/copy-button";
import { IconButton } from "../components/icon-button";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, Trigger } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TerminalLineType = "command" | "output" | "progress";
export type TerminalLineTone = "default" | "muted" | "primary" | "success" | "warning" | "danger" | "info";

export interface TerminalLineProps {
  /** The command, output text or progress label. */
  children: string;
  /** command types out after a prompt, output fades in, progress fills a text bar. Default "output". */
  type?: TerminalLineType;
  /** Prompt for this command. Default: the Terminal prompt. */
  prompt?: string;
  /** Seconds to wait before this line starts. Default 0.35 for commands, 0.08 otherwise. */
  delay?: number;
  /** Text color. Default "default" (commands) or "muted" (output). */
  tone?: TerminalLineTone;
  /** Seconds a progress line takes to fill. Default 1.2. */
  duration?: number;
  /** Show a copy button on this command. Default: the Terminal copyable prop. */
  copyable?: boolean;
}

/**
 * One line of a Terminal. It renders nothing by itself: Terminal reads its props, so place it as a
 * direct child (or inside a fragment) of Terminal.
 */
export function TerminalLine(_props: TerminalLineProps): React.ReactElement | null {
  return null;
}

export interface TerminalProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "title"> {
  /** TerminalLine elements. */
  children?: React.ReactNode;
  /** Lines as data, used instead of (or after) TerminalLine children. */
  lines?: TerminalLineProps[];
  /** Window title, also the accessible name. Default "Terminal". */
  title?: string;
  /** Default prompt for commands. Default "$". */
  prompt?: string;
  /** Average ms per typed character (each key varies a little). Default 45. */
  typeSpeedMs?: number;
  /** When the session starts. Default "inView". */
  trigger?: Trigger;
  /** Start once (true) or every time it scrolls back into view. Default true. */
  once?: boolean;
  /** Seconds before the first line. Default 0. */
  delay?: number;
  /** Replay the session after it ends. Default false. */
  loop?: boolean;
  /** Pause before a loop restarts. Default 3000. */
  loopDelayMs?: number;
  /** Copy buttons on commands. Default true. */
  copyable?: boolean;
  /** Replay button in the title bar. Default true. */
  replayable?: boolean;
  /** "dark" is always a dark window; "auto" follows the page theme. Default "dark". */
  appearance?: "dark" | "auto";
  /** Accessible name of the replay button. Default "Replay". */
  replayLabel?: string;
  /** Called when the last line has played. */
  onComplete?: () => void;
}

const toneClasses: Record<TerminalLineTone, string> = {
  default: "text-pui-foreground",
  muted: "text-pui-muted-foreground",
  primary: "text-pui-primary-text",
  success: "text-pui-success-text",
  warning: "text-pui-warning-text",
  danger: "text-pui-danger-text",
  info: "text-pui-info-text",
};

const BAR_CELLS = 18;
const PROGRESS_STEPS = 24;

type Phase = "wait" | "run";
interface Session {
  key: string;
  step: number;
  phase: Phase;
  progress: number;
}

const fresh = (key: string): Session => ({ key, step: 0, phase: "wait", progress: 0 });

function collectLines(children: React.ReactNode): TerminalLineProps[] {
  const out: TerminalLineProps[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === TerminalLine) out.push(child.props as TerminalLineProps);
    else if (child.type === React.Fragment) {
      out.push(...collectLines((child.props as { children?: React.ReactNode }).children));
    }
  });
  return out;
}

function progressText(label: string, percent: number): [string, string, string] {
  const filled = Math.round((percent / 100) * BAR_CELLS);
  return [`${label} `, "█".repeat(filled), `${"░".repeat(BAR_CELLS - filled)} ${String(percent).padStart(3)}%`];
}

function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn(blockReset, "block size-3.5 shrink-0")}
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/**
 * A window-chrome terminal that types commands, streams output line by line and fills progress
 * bars (roadmap W6). Height is reserved from the first render, so nothing below it jumps.
 */
export const Terminal = React.forwardRef<HTMLDivElement, TerminalProps>(function Terminal(
  {
    children,
    lines: lineData,
    title = "Terminal",
    prompt = "$",
    typeSpeedMs = 45,
    trigger = "inView",
    once = true,
    delay = 0,
    loop = false,
    loopDelayMs = 3000,
    copyable = true,
    replayable = true,
    appearance = "dark",
    replayLabel = "Replay",
    onComplete,
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const onCompleteRef = useLatestRef(onComplete);

  const lines = [...collectLines(children), ...(lineData ?? [])];
  const key = lines.map((l) => `${l.type ?? "output"}:${l.children}`).join("\u0000");
  const [session, setSession] = React.useState(() => fresh(key));
  let current = session;
  if (session.key !== key) {
    current = fresh(key);
    setSession(current);
  }
  const done = reduced || current.step >= lines.length;
  const line = lines[current.step];

  React.useEffect(() => {
    if (!active || reduced) return;
    if (!line) {
      onCompleteRef.current?.();
      if (!loop) return;
      const id = window.setTimeout(() => setSession(fresh(current.key)), loopDelayMs);
      return () => window.clearTimeout(id);
    }
    const type = line.type ?? "output";
    const advance = (): Session => ({ ...current, step: current.step + 1, phase: "wait", progress: 0 });
    let ms: number;
    let next: Session;
    if (current.phase === "wait") {
      const lineDelay = line.delay ?? (type === "command" ? 0.35 : 0.08);
      ms = (lineDelay + (current.step === 0 ? delay : 0)) * 1000;
      next = type === "output" ? advance() : { ...current, phase: "run", progress: 0 };
    } else if (type === "command") {
      if (current.progress < line.children.length) {
        // Human-ish rhythm: each key lands between 0.4x and 1.6x the average speed.
        ms = typeSpeedMs * (0.4 + Math.random() * 1.2);
        next = { ...current, progress: current.progress + 1 };
      } else {
        ms = 260;
        next = advance();
      }
    } else if (current.progress < 100) {
      ms = ((line.duration ?? 1.2) * 1000) / PROGRESS_STEPS;
      next = { ...current, progress: Math.min(100, current.progress + 100 / PROGRESS_STEPS) };
    } else {
      ms = 180;
      next = advance();
    }
    const id = window.setTimeout(() => setSession(next), ms);
    return () => window.clearTimeout(id);
  }, [active, reduced, current, line, loop, loopDelayMs, delay, typeSpeedMs, onCompleteRef]);

  const transcript = lines
    .map((l) => ((l.type ?? "output") === "command" ? `${l.prompt ?? prompt} ${l.children}` : l.children))
    .join("\n");

  return (
    <div
      ref={mergedRef}
      role="group"
      aria-label={title}
      data-state={done ? "complete" : active ? "running" : "idle"}
      {...props}
      className={cn(
        blockReset,
        appearance === "dark" && "dark",
        "flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xl",
        className,
      )}
    >
      <div className={cn(blockReset, "relative flex h-10 items-center gap-2 border-b border-pui-border bg-pui-muted/50 px-3")}>
        <span aria-hidden="true" className={cn(blockReset, "flex gap-1.5")}>
          <span className={cn(blockReset, "size-3 rounded-full bg-pui-danger")} />
          <span className={cn(blockReset, "size-3 rounded-full bg-pui-warning")} />
          <span className={cn(blockReset, "size-3 rounded-full bg-pui-success")} />
        </span>
        <span
          className={cn(
            blockReset,
            "pointer-events-none absolute inset-x-16 truncate text-center font-pui-mono text-xs text-pui-muted-foreground",
          )}
        >
          {title}
        </span>
        {replayable ? (
          <IconButton
            aria-label={replayLabel}
            size="sm"
            variant="ghost"
            tone="neutral"
            onClick={() => setSession(fresh(key))}
            className="ml-auto size-7"
          >
            <ReplayIcon />
          </IconButton>
        ) : null}
      </div>
      <div className={cn(blockReset, "relative p-4 font-pui-mono text-[13px] leading-6")}>
        <pre className={cn(blockReset, "sr-only")}>{transcript}</pre>
        {lines.map((l, i) => {
          const type = l.type ?? "output";
          const isCurrent = !done && i === current.step;
          const started = done || i < current.step || (isCurrent && current.phase === "run");
          const tone = toneClasses[l.tone ?? (type === "output" ? "muted" : "default")];

          if (type === "command") {
            const typed = done || i < current.step ? l.children.length : isCurrent ? current.progress : 0;
            const showCopy = (l.copyable ?? copyable) && typed >= l.children.length;
            return (
              <div key={i} className={cn(blockReset, "group/line flex min-h-6 items-start gap-2")}>
                <span aria-hidden="true" className={cn(blockReset, "min-w-0 flex-1 break-all whitespace-pre-wrap", !started && "invisible")}>
                  <span className={cn(blockReset, "text-pui-success-text select-none")}>{l.prompt ?? prompt} </span>
                  <span className={tone}>{l.children.slice(0, typed)}</span>
                  {isCurrent && current.phase === "run" ? (
                    <span
                      className={cn(
                        blockReset,
                        "inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-pui-foreground/80",
                        !reduced && current.progress >= l.children.length && "animate-pui-blink",
                      )}
                    />
                  ) : null}
                  <span className={cn(blockReset, "invisible")}>{l.children.slice(typed)}</span>
                </span>
                {l.copyable ?? copyable ? (
                  <CopyButton
                    value={l.children}
                    label={`Copy command: ${l.children}`}
                    copiedLabel="Copied command"
                    size="sm"
                    variant="ghost"
                    tone="neutral"
                    className={cn(
                      "-my-1 size-7 shrink-0 opacity-0 transition-opacity group-hover/line:opacity-100 focus-visible:opacity-100",
                      !showCopy && "invisible",
                    )}
                  />
                ) : null}
              </div>
            );
          }

          const percent = done ? 100 : i < current.step ? 100 : isCurrent ? Math.round(current.progress) : 0;
          return (
            <motion.div
              key={i}
              aria-hidden="true"
              initial={false}
              animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
              transition={reduced ? { duration: 0 } : { duration: 0.2, ease: easings.out }}
              className={cn(blockReset, "min-h-6 break-words whitespace-pre-wrap", tone, !started && "invisible")}
            >
              {type === "progress" ? (
                (() => {
                  const [label, bar, rest] = progressText(l.children, percent);
                  return (
                    <>
                      {label}
                      <span className={cn(blockReset, "text-pui-primary-text")}>{bar}</span>
                      <span className={cn(blockReset, "opacity-50")}>{rest}</span>
                    </>
                  );
                })()
              ) : (
                l.children
              )}
            </motion.div>
          );
        })}
        <div aria-hidden="true" className={cn(blockReset, "flex min-h-6 items-center gap-2", !done && "invisible")}>
          <span className={cn(blockReset, "text-pui-success-text")}>{prompt}</span>
          <span
            className={cn(
              blockReset,
              "inline-block h-[1.1em] w-[0.55em] bg-pui-foreground/80",
              !reduced && "animate-pui-blink",
            )}
          />
        </div>
      </div>
    </div>
  );
});
