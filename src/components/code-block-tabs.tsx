"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { FileIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { CopyButton } from "./copy-button";
export interface CodeTab {
  /** Tab label, e.g. "pnpm" or "TypeScript". */
  label: string;
  /** Key used for the selection and the shared group. Default: label. */
  value?: string;
  code: string;
  /** "bash" / "sh" / "shell" / "zsh" / "console" get prompt and flag styling. */
  language?: string;
  /** Header file name for this tab; falls back to the block's fileName. */
  fileName?: string;
  /** 1-based lines to highlight in this tab. */
  highlight?: number[];
}
export interface CodeBlockTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  tabs: CodeTab[];
  /**
   * Blocks with the same group share their selection, on this page and across visits (localStorage),
   * so picking pnpm once switches every install snippet.
   */
  group?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Header file name. */
  fileName?: string;
  /** 1-based lines to highlight in every tab. */
  highlight?: number[];
  /** Default false. */
  lineNumbers?: boolean;
  /** Copy shell code without the leading "$ " prompts. Default true. */
  stripPrompts?: boolean;
  /** Accessible name for the tab list. Default "Code variants". */
  label?: string;
}
const SHELL = new Set(["bash", "sh", "shell", "zsh", "console", "terminal", "powershell"]);
const PROMPT = /^(\s*)([$>%]) /;
const STORAGE_PREFIX = "pui-code-tabs:";
// Group selections live in memory first, so blocks on one page stay in sync even when storage is blocked.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
function readGroup(group: string): string | null {
  const known = memory.get(group);
  if (known !== undefined) return known;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + group);
  } catch {
    return null;
  }
}
function writeGroup(group: string, value: string) {
  memory.set(group, value);
  try {
    window.localStorage.setItem(STORAGE_PREFIX + group, value);
  } catch {
    // Private mode or blocked storage: the in-memory value still syncs this page.
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      if (event.newValue !== null) memory.set(event.key.slice(STORAGE_PREFIX.length), event.newValue);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
/** Removes "$ " style prompts from shell code, keeping output lines. */
export function stripShellPrompts(code: string): string {
  const lines = code.split("\n");
  const hasPrompts = lines.some((l) => PROMPT.test(l));
  if (!hasPrompts) return code;
  // With prompts present, lines without one are command output and are not copied.
  return lines
    .filter((l) => PROMPT.test(l))
    .map((l) => l.replace(PROMPT, "$1"))
    .join("\n");
}
function ShellLine({ line, prompted }: { line: string; prompted: boolean }) {
  const prompt = PROMPT.exec(line);
  if (!prompt && /^\s*#/.test(line)) return <span className={cn(blockReset, "text-pui-muted-foreground italic")}>{line}</span>;
  // Lines without a prompt next to prompted lines are command output.
  if (!prompt && prompted) return <span className={cn(blockReset, "text-pui-muted-foreground")}>{line || " "}</span>;
  if (!line.trim()) return <>{line || " "}</>;
  const tokens = line.slice(prompt ? prompt[0].length : 0).split(/(\s+)/);
  const out: React.ReactNode[] = [];
  let commandSeen = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    if (!token.trim()) {
      out.push(token);
      continue;
    }
    if (token.startsWith("#")) {
      out.push(
        <span key={i} className={cn(blockReset, "text-pui-muted-foreground italic")}>
          {tokens.slice(i).join("")}
        </span>,
      );
      break;
    }
    let tone = "";
    if (!commandSeen) {
      commandSeen = true;
      tone = "font-semibold text-pui-primary-text";
    } else if (/^-{1,2}[\w-]/.test(token)) tone = "text-pui-info-text";
    else if (/^["'].*["']$/.test(token)) tone = "text-pui-success-text";
    out.push(
      <span key={i} className={tone ? cn(blockReset, tone) : undefined}>
        {token}
      </span>,
    );
  }
  return (
    <>
      {prompt ? (
        <span aria-hidden="true" className={cn(blockReset, "select-none text-pui-muted-foreground")}>
          {prompt[1]}
          {prompt[2]}{" "}
        </span>
      ) : null}
      {out}
    </>
  );
}
/**
 * Code block with tabs for package managers, languages or frameworks. Blocks that share a `group`
 * remember the reader's pick across the page and across visits, shell snippets dim their prompts
 * and copy without them, and lines can be highlighted per tab.
 */
export const CodeBlockTabs = React.forwardRef<HTMLDivElement, CodeBlockTabsProps>(function CodeBlockTabs(
  {
    tabs,
    group,
    value,
    defaultValue,
    onValueChange,
    fileName,
    highlight,
    lineNumbers = false,
    stripPrompts = true,
    label = "Code variants",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const keyOf = (tab: CodeTab) => tab.value ?? tab.label;
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue);
  const groupValue = React.useSyncExternalStore(
    subscribe,
    () => (group ? readGroup(group) : null),
    () => null,
  );
  const has = (key: string | null | undefined): key is string => !!key && tabs.some((t) => keyOf(t) === key);
  const selected = has(value) ? value : has(groupValue) ? groupValue : has(internal) ? internal : tabs[0] ? keyOf(tabs[0]) : "";
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const select = (key: string) => {
    if (key === selected) return;
    if (value === undefined) {
      if (group) writeGroup(group, key);
      setInternal(key);
    }
    onValueChange?.(key);
  };
  const index = Math.max(0, tabs.findIndex((t) => keyOf(t) === selected));
  const active = tabs[index];
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    let next: number | null = null;
    const rtl = (event.currentTarget as HTMLElement).closest("[dir=rtl]") !== null;
    if (event.key in step) next = (index + (step[event.key] ?? 0) * (rtl ? -1 : 1) + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const tab = tabs[next];
    if (tab) select(keyOf(tab));
    tabRefs.current[next]?.focus();
  };
  if (!active) return null;
  const shell = SHELL.has((active.language ?? "").toLowerCase());
  const lines = active.code.replace(/\n$/, "").split("\n");
  const prompted = shell && lines.some((l) => PROMPT.test(l));
  const marked = new Set([...(highlight ?? []), ...(active.highlight ?? [])]);
  const shownFile = active.fileName ?? fileName;
  const panelId = `${id}-panel`;
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs",
        className,
      )}
    >
      <div className={cn(blockReset, "flex min-w-0 items-center gap-2 border-b border-pui-border bg-pui-muted/40 ps-1.5 pe-1.5")}>
        {shownFile ? (
          <span className={cn(blockReset, "flex min-w-0 shrink items-center gap-1.5 border-e border-pui-border py-2 ps-1.5 pe-3 font-mono text-xs text-pui-muted-foreground")}>
            <FileIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className={cn(blockReset, "truncate")}>{shownFile}</span>
          </span>
        ) : null}
        <div role="tablist" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown} className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1 [scrollbar-width:none]")}>
          {tabs.map((tab, i) => {
            const key = keyOf(tab);
            const isActive = i === index;
            return (
              <button
                key={key}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${i}`}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(key)}
                className={cn(
                  controlReset,
                  focusRing,
                  "relative inline-flex h-7 shrink-0 cursor-pointer items-center rounded-pui-md px-2.5 text-xs font-medium transition-colors -outline-offset-2",
                  isActive ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId={`${id}-pill`}
                    aria-hidden="true"
                    transition={reduced ? { duration: 0 } : springs.snappy}
                    className={cn(blockReset, "absolute inset-0 rounded-pui-md border border-pui-border bg-pui-surface shadow-pui-xs")}
                  />
                ) : null}
                <span className={cn(blockReset, "relative")}>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <CopyButton
          size="sm"
          variant="ghost"
          label={`Copy ${active.label} code`}
          value={() => (shell && stripPrompts ? stripShellPrompts(active.code) : active.code).replace(/\n$/, "")}
          className="shrink-0"
        />
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${index}`}
        tabIndex={0}
        className={cn(blockReset, "overflow-x-auto outline-hidden focus-visible:shadow-[inset_0_0_0_2px_var(--pui-ring)]")}
      >
        <pre className={cn(blockReset, "w-max min-w-full py-3 font-mono text-[0.8125rem] leading-6 text-pui-foreground")}>
          <code className={cn(blockReset, "flex flex-col")}>
            {lines.map((line, i) => {
              const hl = marked.has(i + 1);
              return (
                <span
                  key={`${index}-${i}`}
                  data-highlighted={hl ? "" : undefined}
                  className={cn(blockReset, "flex border-s-2 pe-4", hl ? "border-pui-primary bg-pui-primary/8" : "border-transparent", lineNumbers ? "ps-2" : "ps-4")}
                >
                  {lineNumbers ? (
                    <span aria-hidden="true" className={cn(blockReset, "me-4 w-6 shrink-0 select-none text-end tabular-nums text-pui-muted-foreground/60")}>
                      {i + 1}
                    </span>
                  ) : null}
                  <span className={cn(blockReset, "whitespace-pre")}>{shell ? <ShellLine line={line} prompted={prompted} /> : line || " "}</span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
});
