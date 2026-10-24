"use client";
import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ChevronsUpDownIcon, FileIcon } from "../lib/icons";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

export type DiffLineType = "equal" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  /** 1-based line number in the old text (equal and remove lines). */
  oldNumber?: number;
  /** 1-based line number in the new text (equal and add lines). */
  newNumber?: number;
}

export type DiffView = "unified" | "split";

export interface DiffViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  oldValue: string;
  newValue: string;
  /** Controlled view. */
  view?: DiffView;
  /** Default "unified". */
  defaultView?: DiffView;
  onViewChange?: (view: DiffView) => void;
  /** Unchanged lines kept around each change; longer unchanged runs collapse. Default 3. */
  context?: number;
  /** Shown in the header, e.g. "config.yaml". */
  fileName?: React.ReactNode;
  /** Highlight the changed words inside paired changed lines. Default true. */
  wordDiff?: boolean;
  /** Default true. */
  lineNumbers?: boolean;
  /** Show the header (file name, stats, view toggle). Default true. */
  header?: boolean;
  /** Show the Unified / Split toggle in the header. Default true. */
  viewToggle?: boolean;
  /** Accessible name for the diff table. Default "Changes" (or "Changes to {fileName}" for string names). */
  label?: string;
}

/** Above this many cells the line LCS falls back to "all removed, then all added" for the changed middle. */
const MAX_CELLS = 4_000_000;

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // A trailing newline does not add an empty last line.
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Longest-common-subsequence edit script for two token lists (shared by lines and words). */
function lcsScript<T>(a: readonly T[], b: readonly T[]): ("equal" | "add" | "remove")[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const head: ("equal" | "add" | "remove")[] = Array.from({ length: start }, () => "equal");
  const tail: ("equal" | "add" | "remove")[] = Array.from({ length: a.length - endA }, () => "equal");
  const n = endA - start;
  const m = endB - start;
  const middle: ("equal" | "add" | "remove")[] = [];
  if (n === 0 || m === 0 || (n + 1) * (m + 1) > MAX_CELLS) {
    for (let i = 0; i < n; i++) middle.push("remove");
    for (let j = 0; j < m; j++) middle.push("add");
    return [...head, ...middle, ...tail];
  }
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[start + i] === b[start + j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) {
      middle.push("equal");
      i++;
      j++;
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
      middle.push("remove");
      i++;
    } else {
      middle.push("add");
      j++;
    }
  }
  while (i++ < n) middle.push("remove");
  while (j++ < m) middle.push("add");
  return [...head, ...middle, ...tail];
}

/** Line diff of two texts (LCS, no dependencies). Removed lines come before the lines that replace them. */
export function diffLines(oldValue: string, newValue: string): DiffLine[] {
  const a = splitLines(oldValue);
  const b = splitLines(newValue);
  const script = lcsScript(a, b);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  for (const op of script) {
    if (op === "equal") out.push({ type: "equal", text: b[j] ?? "", oldNumber: ++i, newNumber: ++j });
    else if (op === "remove") out.push({ type: "remove", text: a[i] ?? "", oldNumber: ++i });
    else out.push({ type: "add", text: b[j] ?? "", newNumber: ++j });
  }
  return out;
}

interface WordPart {
  text: string;
  changed: boolean;
}

const TOKEN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

/** Splits both lines into words and marks the ones that differ. */
function diffWords(oldLine: string, newLine: string): { old: WordPart[]; new: WordPart[] } {
  const a = oldLine.match(TOKEN) ?? [];
  const b = newLine.match(TOKEN) ?? [];
  const script = lcsScript(a, b);
  const oldParts: WordPart[] = [];
  const newParts: WordPart[] = [];
  const push = (parts: WordPart[], text: string, changed: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.changed === changed) last.text += text;
    else parts.push({ text, changed });
  };
  let i = 0;
  let j = 0;
  for (const op of script) {
    if (op === "equal") {
      push(oldParts, a[i++] ?? "", false);
      push(newParts, b[j++] ?? "", false);
    } else if (op === "remove") push(oldParts, a[i++] ?? "", true);
    else push(newParts, b[j++] ?? "", true);
  }
  return { old: oldParts, new: newParts };
}

/** Pairs each removed line with the added line at the same position in its change block. */
function pairChanges(lines: readonly DiffLine[]): Map<number, number> {
  const pairs = new Map<number, number>();
  let k = 0;
  while (k < lines.length) {
    if (lines[k]?.type !== "remove") {
      k++;
      continue;
    }
    const removeStart = k;
    while (lines[k]?.type === "remove") k++;
    const addStart = k;
    while (lines[k]?.type === "add") k++;
    const count = Math.min(addStart - removeStart, k - addStart);
    for (let p = 0; p < count; p++) {
      pairs.set(removeStart + p, addStart + p);
      pairs.set(addStart + p, removeStart + p);
    }
  }
  return pairs;
}

type Segment = { kind: "lines"; from: number; to: number } | { kind: "gap"; from: number; to: number };

/** Splits the diff into visible line ranges and collapsible unchanged gaps. */
function segment(lines: readonly DiffLine[], context: number, expanded: ReadonlySet<number>): Segment[] {
  const out: Segment[] = [];
  let k = 0;
  let visibleFrom = 0;
  while (k < lines.length) {
    if (lines[k]?.type !== "equal") {
      k++;
      continue;
    }
    const runStart = k;
    while (lines[k]?.type === "equal") k++;
    const runEnd = k;
    const hideFrom = runStart === 0 ? 0 : runStart + context;
    const hideTo = runEnd === lines.length ? runEnd : runEnd - context;
    // Collapse only when it hides at least 2 lines; a one-line gap button would be bigger than the line.
    if (hideTo - hideFrom >= 2 && !expanded.has(hideFrom)) {
      if (hideFrom > visibleFrom) out.push({ kind: "lines", from: visibleFrom, to: hideFrom });
      out.push({ kind: "gap", from: hideFrom, to: hideTo });
      visibleFrom = hideTo;
    }
  }
  if (visibleFrom < lines.length) out.push({ kind: "lines", from: visibleFrom, to: lines.length });
  return out;
}

const rowTone: Record<DiffLineType, string> = {
  equal: "",
  add: "bg-pui-success/10",
  remove: "bg-pui-danger/10",
};
const gutterTone: Record<DiffLineType, string> = {
  equal: "text-pui-muted-foreground",
  add: "bg-pui-success/15 text-pui-success-text",
  remove: "bg-pui-danger/15 text-pui-danger-text",
};
const wordTone: Record<"add" | "remove", string> = {
  add: "rounded-[3px] bg-pui-success/30 text-pui-foreground",
  remove: "rounded-[3px] bg-pui-danger/30 text-pui-foreground line-through decoration-pui-danger/50",
};
const signOf: Record<DiffLineType, string> = { equal: " ", add: "+", remove: "−" };
const srOf: Record<DiffLineType, string> = { equal: "", add: "Added: ", remove: "Removed: " };

/**
 * Text diff for reviews and audit logs: unified or split view, word-level highlights inside
 * changed lines, collapsed unchanged runs you can expand, line numbers and a +/− stat bar. The
 * line diff is a built-in LCS (exported as `diffLines`), so there is nothing to install.
 */
export const DiffViewer = React.forwardRef<HTMLDivElement, DiffViewerProps>(function DiffViewer(
  {
    oldValue,
    newValue,
    view: viewProp,
    defaultView = "unified",
    onViewChange,
    context = 3,
    fileName,
    wordDiff = true,
    lineNumbers = true,
    header = true,
    viewToggle = true,
    label,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [view, setView] = useControllableState<DiffView>({
    value: viewProp,
    defaultValue: defaultView,
    onChange: onViewChange,
    name: "view",
  });
  const lines = React.useMemo(() => diffLines(oldValue, newValue), [oldValue, newValue]);
  const pairs = React.useMemo(() => pairChanges(lines), [lines]);
  const [expanded, setExpanded] = React.useState<ReadonlySet<number>>(() => new Set());
  // Rows revealed by an expand fade in; the first render does not animate.
  const [revealed, setRevealed] = React.useState<{ from: number; to: number } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  // New texts reset expanded gaps (indices refer to the old diff).
  const [prevLines, setPrevLines] = React.useState(lines);
  if (prevLines !== lines) {
    setPrevLines(lines);
    setExpanded(new Set());
    setRevealed(null);
  }
  const safeContext = Math.max(0, Math.floor(context));
  const segments = React.useMemo(() => segment(lines, safeContext, expanded), [lines, safeContext, expanded]);
  const added = lines.filter((line) => line.type === "add").length;
  const removed = lines.filter((line) => line.type === "remove").length;
  const words = React.useMemo(() => {
    const cache = new Map<number, WordPart[]>();
    if (!wordDiff) return cache;
    for (const [k, other] of pairs) {
      const line = lines[k];
      if (line?.type !== "remove") continue;
      const replacement = lines[other];
      if (!replacement) continue;
      const parts = diffWords(line.text, replacement.text);
      // Mostly-rewritten lines read better without confetti highlights.
      const changedRatio = parts.new.reduce((sum, part) => sum + (part.changed ? part.text.length : 0), 0) / Math.max(1, replacement.text.length);
      if (changedRatio > 0.6) continue;
      cache.set(k, parts.old);
      cache.set(other, parts.new);
    }
    return cache;
  }, [lines, pairs, wordDiff]);

  const expand = (gap: { from: number; to: number }) => {
    setExpanded((prev) => new Set(prev).add(gap.from));
    setRevealed(gap);
    setAnnouncement(`Showing ${gap.to - gap.from} unchanged lines`);
    // The expand button unmounts; keep focus inside the diff.
    tableRef.current?.focus({ preventScroll: true });
  };

  const name = label ?? (typeof fileName === "string" ? `Changes to ${fileName}` : "Changes");
  const isRevealed = (k: number) => !reduced && revealed !== null && k >= revealed.from && k < revealed.to;
  const fade = { duration: 0.24, ease: easings.out };

  const renderText = (k: number, line: DiffLine) => {
    const parts = words.get(k);
    if (!parts || line.type === "equal") return line.text === "" ? "\u200b" : line.text;
    const tone = wordTone[line.type];
    return parts.map((part, p) =>
      part.changed ? (
        <span key={p} className={cn(blockReset, tone)}>
          {part.text}
        </span>
      ) : (
        <React.Fragment key={p}>{part.text}</React.Fragment>
      ),
    );
  };

  const numberCell = (n: number | undefined, type: DiffLineType, side?: "old" | "new") =>
    lineNumbers ? (
      <td
        aria-hidden="true"
        data-side={side}
        className={cn(blockReset, "w-10 select-none px-2 text-right align-top tabular-nums", gutterTone[type])}
      >
        {n ?? ""}
      </td>
    ) : null;

  const codeCell = (k: number | undefined, line: DiffLine | undefined, extra?: string) => (
    <td className={cn(blockReset, "px-0 align-top", line ? rowTone[line.type] : "bg-pui-muted/40", extra)}>
      {line && k !== undefined ? (
        <span className={cn(blockReset, "flex")}>
          <span aria-hidden="true" className={cn(blockReset, "w-5 shrink-0 select-none text-center", gutterTone[line.type], line.type === "equal" && "bg-transparent")}>
            {signOf[line.type]}
          </span>
          <span className={cn(blockReset, "min-w-0 flex-1 pe-3 break-all whitespace-pre-wrap")}>
            {srOf[line.type] ? <span className={cn(blockReset, "sr-only")}>{srOf[line.type]}</span> : null}
            {renderText(k, line)}
          </span>
        </span>
      ) : null}
    </td>
  );

  const columns = view === "split" ? (lineNumbers ? 4 : 2) : lineNumbers ? 3 : 1;

  const rows: React.ReactNode[] = [];
  for (const seg of segments) {
    if (seg.kind === "gap") {
      const count = seg.to - seg.from;
      rows.push(
        <tr key={`gap-${seg.from}`}>
          <td colSpan={columns} className={cn(blockReset, "border-y border-pui-border bg-pui-muted/60 p-0")}>
            <button
              type="button"
              onClick={() => expand(seg)}
              className={cn(
                controlReset,
                focusRing,
                "flex w-full cursor-pointer items-center gap-2 px-3 py-1 text-left font-pui-sans text-xs text-pui-muted-foreground transition-colors hover:bg-pui-primary/8 hover:text-pui-primary-text focus-visible:-outline-offset-2",
              )}
            >
              <ChevronsUpDownIcon className="size-3.5" />
              {`Show ${count} unchanged ${count === 1 ? "line" : "lines"}`}
              <span className={cn(blockReset, "ms-auto tabular-nums opacity-70")}>
                {lines[seg.from]?.newNumber}–{lines[seg.to - 1]?.newNumber}
              </span>
            </button>
          </td>
        </tr>,
      );
      continue;
    }
    if (view === "unified") {
      for (let k = seg.from; k < seg.to; k++) {
        const line = lines[k];
        if (!line) continue;
        rows.push(
          <motion.tr
            key={k}
            data-type={line.type}
            initial={isRevealed(k) ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={fade}
          >
            {numberCell(line.oldNumber, line.type, "old")}
            {numberCell(line.newNumber, line.type, "new")}
            {codeCell(k, line)}
          </motion.tr>,
        );
      }
      continue;
    }
    // Split: equal lines sit on both sides; a change block puts removals left and additions right.
    let k = seg.from;
    while (k < seg.to) {
      const line = lines[k];
      if (!line) break;
      if (line.type === "equal") {
        rows.push(
          <motion.tr key={k} data-type="equal" initial={isRevealed(k) ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={fade}>
            {numberCell(line.oldNumber, "equal", "old")}
            {codeCell(k, line, "border-e border-pui-border")}
            {numberCell(line.newNumber, "equal", "new")}
            {codeCell(k, line)}
          </motion.tr>,
        );
        k++;
        continue;
      }
      const removes: number[] = [];
      const adds: number[] = [];
      while (k < seg.to && lines[k]?.type === "remove") removes.push(k++);
      while (k < seg.to && lines[k]?.type === "add") adds.push(k++);
      const height = Math.max(removes.length, adds.length);
      for (let r = 0; r < height; r++) {
        const left = removes[r];
        const right = adds[r];
        const leftLine = left === undefined ? undefined : lines[left];
        const rightLine = right === undefined ? undefined : lines[right];
        rows.push(
          <tr key={`s-${left ?? "x"}-${right ?? "x"}`} data-type="change">
            {lineNumbers ? (
              <td aria-hidden="true" className={cn(blockReset, "w-10 select-none px-2 text-right align-top tabular-nums", leftLine ? gutterTone.remove : "bg-pui-muted/40")}>
                {leftLine?.oldNumber ?? ""}
              </td>
            ) : null}
            {codeCell(left, leftLine, "border-e border-pui-border")}
            {lineNumbers ? (
              <td aria-hidden="true" className={cn(blockReset, "w-10 select-none px-2 text-right align-top tabular-nums", rightLine ? gutterTone.add : "bg-pui-muted/40")}>
                {rightLine?.newNumber ?? ""}
              </td>
            ) : null}
            {codeCell(right, rightLine)}
          </tr>,
        );
      }
    }
  }

  const total = added + removed;
  const blocks = 5;
  const addBlocks = total === 0 ? 0 : Math.round((added / total) * blocks);

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        blockReset,
        "w-full min-w-0 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xs",
        className,
      )}
    >
      {header ? (
        <div className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-pui-border bg-pui-muted/40 px-3 py-2")}>
          <span className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-2 text-sm")}>
            <FileIcon className="size-4 text-pui-muted-foreground" />
            {fileName ? <span className={cn(blockReset, "truncate font-pui-mono text-[0.8rem] font-medium text-pui-foreground")}>{fileName}</span> : null}
            <span className={cn(blockReset, "flex shrink-0 items-center gap-2 text-xs tabular-nums")}>
              <span className={cn(blockReset, "font-medium text-pui-success-text")}>+{added}</span>
              <span className={cn(blockReset, "font-medium text-pui-danger-text")}>−{removed}</span>
              <span className={cn(blockReset, "sr-only")}>{`${added} added, ${removed} removed`}</span>
              <span aria-hidden="true" className={cn(blockReset, "flex gap-0.5")}>
                {Array.from({ length: blocks }, (_, b) => (
                  <motion.span
                    key={b}
                    initial={reduced ? false : { scaleY: 0.2, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: easings.out, delay: reduced ? 0 : b * 0.04 }}
                    className={cn(
                      blockReset,
                      "block size-2 rounded-[2px]",
                      total === 0 ? "bg-pui-muted-foreground/25" : b < addBlocks ? "bg-pui-success" : "bg-pui-danger",
                    )}
                  />
                ))}
              </span>
            </span>
          </span>
          {viewToggle ? (
            <SegmentedControl size="sm" aria-label="Diff layout" value={view} onValueChange={(next) => setView(next as DiffView)}>
              <SegmentedControlItem value="unified">Unified</SegmentedControlItem>
              <SegmentedControlItem value="split">Split</SegmentedControlItem>
            </SegmentedControl>
          ) : null}
        </div>
      ) : null}
      {lines.length === 0 || total === 0 ? (
        <p className={cn(blockReset, "px-4 py-6 text-center text-sm text-pui-muted-foreground")}>
          {lines.length === 0 ? "Both versions are empty." : "No changes."}
        </p>
      ) : null}
      {total > 0 ? (
        <table
          ref={tableRef}
          tabIndex={-1}
          aria-labelledby={`${id}-caption`}
          data-view={view}
          className={cn(blockReset, "w-full table-fixed border-collapse font-pui-mono text-xs leading-5 outline-hidden")}
        >
          <caption id={`${id}-caption`} className={cn(blockReset, "sr-only")}>
            {name}
          </caption>
          <colgroup>
            {view === "split" ? (
              <>
                {lineNumbers ? <col className="w-10" /> : null}
                <col />
                {lineNumbers ? <col className="w-10" /> : null}
                <col />
              </>
            ) : (
              <>
                {lineNumbers ? <col className="w-10" /> : null}
                {lineNumbers ? <col className="w-10" /> : null}
                <col />
              </>
            )}
          </colgroup>
          <tbody>{rows}</tbody>
        </table>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});
