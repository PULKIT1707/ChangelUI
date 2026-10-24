"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronRightIcon, CopyIcon } from "../lib/icons";
import { durations, easings } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface JsonViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  /** Any JSON-like value: objects, arrays, strings, numbers, booleans and null. */
  data: unknown;
  /** Containers shallower than this start expanded (0 = only the root row). Default 1. */
  defaultExpandDepth?: number;
  /** Case-insensitive filter text: matching keys and values are highlighted and their parents open. */
  search?: string;
  /** Label of the root row. Default "root". */
  rootLabel?: string;
  /** Called after a value or path is copied. */
  onCopy?: (text: string, kind: "value" | "path", path: string) => void;
  /** Accessible name of the tree. Default "JSON". */
  label?: string;
  /** Default "md". */
  size?: "sm" | "md";
}
type Kind = "object" | "array" | "string" | "number" | "boolean" | "null" | "other";
interface Row {
  path: string;
  key: string | number | null;
  value: unknown;
  kind: Kind;
  depth: number;
  childCount: number;
  posinset: number;
  setsize: number;
  parent: string | null;
}
const IDENT = /^[A-Za-z_$][\w$]*$/;
const kindOf = (value: unknown): Kind => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "object":
      return "object";
    case "string":
      return "string";
    case "number":
    case "bigint":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "other";
  }
};
const entriesOf = (value: unknown): [string | number, unknown][] =>
  Array.isArray(value)
    ? value.map((v, i) => [i, v] as [number, unknown])
    : value !== null && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
      : [];
const childPath = (parent: string, key: string | number) =>
  typeof key === "number" ? `${parent}[${key}]` : IDENT.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
const primitiveText = (value: unknown, kind: Kind): string =>
  kind === "string" ? JSON.stringify(value) : kind === "null" ? "null" : String(value);
const lower = (s: string) => s.toLocaleLowerCase();
/** Paths of every key or primitive value that contains `query` (case-insensitive). "$" is the root. */
export function jsonMatches(data: unknown, query: string): string[] {
  const q = lower(query.trim());
  if (!q) return [];
  const out: string[] = [];
  const visit = (value: unknown, path: string, key: string | number | null) => {
    const kind = kindOf(value);
    const keyHit = key !== null && typeof key === "string" && lower(key).includes(q);
    const valueHit = kind !== "object" && kind !== "array" && lower(kind === "string" ? String(value) : primitiveText(value, kind)).includes(q);
    if (keyHit || valueHit) out.push(path);
    for (const [k, v] of entriesOf(value)) visit(v, childPath(path, k), k);
  };
  visit(data, "$", null);
  return out;
}
function Highlight({ text, query }: { text: string; query: string }) {
  const q = lower(query.trim());
  if (!q) return <>{text}</>;
  const at = lower(text).indexOf(q);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className={cn(blockReset, "rounded-pui-sm bg-pui-highlight px-px text-inherit")}>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}
const valueClass: Record<Kind, string> = {
  string: "text-pui-success-text",
  number: "text-pui-info-text",
  boolean: "text-pui-warning-text",
  null: "italic text-pui-muted-foreground",
  other: "text-pui-muted-foreground",
  object: "text-pui-muted-foreground",
  array: "text-pui-muted-foreground",
};
/**
 * Collapsible, syntax-colored JSON tree (role="tree") with roving keyboard focus, item counts on
 * collapsed nodes, search that highlights matches and opens their parents, and copy value / copy
 * path per row (buttons on hover, C and P on the keyboard). Paths are JSONPath-style ($.a[0].b).
 */
export const JsonViewer = React.forwardRef<HTMLDivElement, JsonViewerProps>(function JsonViewer(
  { data, defaultExpandDepth = 1, search = "", rootLabel = "root", onCopy, label = "JSON", size = "md", className, onKeyDown, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const treeRef = React.useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] = React.useState<Map<string, boolean>>(() => new Map());
  const [focused, setFocused] = React.useState("$");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const { copy } = useCopyToClipboard({ timeoutMs: 1500 });
  const query = search.trim();
  // Every ancestor of a match is forced open while searching.
  const { matchSet, openSet } = React.useMemo(() => {
    const matches = jsonMatches(data, query);
    const open = new Set<string>();
    for (const path of matches) {
      let p = path;
      while (p !== "$") {
        const cut = Math.max(p.lastIndexOf("."), p.lastIndexOf("["));
        p = p.slice(0, cut);
        open.add(p);
      }
    }
    return { matchSet: new Set(matches), openSet: open };
  }, [data, query]);
  const isOpen = React.useCallback(
    (path: string, depth: number) => (query && openSet.has(path)) || (overrides.get(path) ?? depth < defaultExpandDepth),
    [query, openSet, overrides, defaultExpandDepth],
  );
  const rows = React.useMemo(() => {
    const out: Row[] = [];
    const visit = (value: unknown, path: string, key: string | number | null, depth: number, pos: number, size: number, parent: string | null) => {
      const kind = kindOf(value);
      const entries = entriesOf(value);
      out.push({ path, key, value, kind, depth, childCount: entries.length, posinset: pos, setsize: size, parent });
      if ((kind === "object" || kind === "array") && entries.length > 0 && isOpen(path, depth)) {
        entries.forEach(([k, v], i) => visit(v, childPath(path, k), k, depth + 1, i + 1, entries.length, path));
      }
    };
    visit(data, "$", null, 0, 1, 1, null);
    return out;
  }, [data, isOpen]);
  const focusedRow = rows.some((r) => r.path === focused) ? focused : "$";
  const toggle = (row: Row, open?: boolean) => {
    const next = open ?? !isOpen(row.path, row.depth);
    setOverrides((prev) => new Map(prev).set(row.path, next));
  };
  const focusPath = (path: string) => {
    setFocused(path);
    const items = treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [];
    for (const el of items) if (el.dataset.path === path) el.focus();
  };
  const doCopy = async (row: Row, kind: "value" | "path") => {
    const text = kind === "path" ? row.path : row.kind === "string" ? String(row.value) : JSON.stringify(row.value, null, 2) ?? String(row.value);
    const ok = await copy(text);
    if (!ok) {
      setAnnouncement("Copy failed");
      return;
    }
    setCopiedKey(`${kind}:${row.path}`);
    setAnnouncement(kind === "path" ? `Copied path ${row.path}` : `Copied value of ${row.path}`);
    onCopy?.(text, kind, row.path);
  };
  React.useEffect(() => {
    if (!copiedKey) return;
    const t = setTimeout(() => setCopiedKey(null), 1500);
    return () => clearTimeout(t);
  }, [copiedKey]);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const index = rows.findIndex((r) => r.path === focusedRow);
    const row = rows[index];
    if (!row) return;
    const container = row.kind === "object" || row.kind === "array";
    const open = container && row.childCount > 0 && isOpen(row.path, row.depth);
    const go = (target: Row | undefined) => {
      if (!target) return;
      event.preventDefault();
      focusPath(target.path);
    };
    switch (event.key) {
      case "ArrowDown":
        go(rows[index + 1]);
        break;
      case "ArrowUp":
        go(rows[index - 1]);
        break;
      case "Home":
        go(rows[0]);
        break;
      case "End":
        go(rows[rows.length - 1]);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (container && row.childCount > 0 && !open) toggle(row, true);
        else if (open) go(rows[index + 1]);
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (open) toggle(row, false);
        else if (row.parent) go(rows.find((r) => r.path === row.parent));
        break;
      case "Enter":
      case " ":
        if (container && row.childCount > 0) {
          event.preventDefault();
          toggle(row);
        }
        break;
      case "c":
      case "C":
        if (event.metaKey || event.ctrlKey || event.altKey) break;
        event.preventDefault();
        void doCopy(row, "value");
        break;
      case "p":
      case "P":
        if (event.metaKey || event.ctrlKey || event.altKey) break;
        event.preventDefault();
        void doCopy(row, "path");
        break;
    }
  };
  const indent = size === "sm" ? 14 : 16;
  return (
    <div
      ref={ref}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "relative min-w-0 overflow-auto rounded-pui-lg border border-pui-border bg-pui-surface py-1.5 font-mono text-pui-surface-foreground",
        size === "sm" ? "text-xs" : "text-[0.8125rem]",
        className,
      )}
    >
      {/* Focus lives on the treeitems (roving tabindex); tabIndex -1 keeps the tree itself out of the tab order. */}
      <div ref={treeRef} role="tree" aria-label={label} tabIndex={-1} onKeyDown={handleKeyDown} className={cn(blockReset, "min-w-max outline-hidden")}>
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const container = row.kind === "object" || row.kind === "array";
            const open = container && row.childCount > 0 && isOpen(row.path, row.depth);
            const keyText = row.key === null ? rootLabel : String(row.key);
            const hit = matchSet.has(row.path);
            const isFocused = row.path === focusedRow;
            return (
              <motion.div
                key={row.path}
                role="treeitem"
                data-path={row.path}
                data-match={hit ? "" : undefined}
                aria-level={row.depth + 1}
                aria-posinset={row.posinset}
                aria-setsize={row.setsize}
                aria-expanded={container && row.childCount > 0 ? open : undefined}
                tabIndex={isFocused ? 0 : -1}
                initial={reduced ? false : { opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: durations.base, ease: easings.out }}
                onFocus={() => setFocused(row.path)}
                onClick={() => {
                  setFocused(row.path);
                  if (container && row.childCount > 0) toggle(row);
                }}
                className={cn(
                  blockReset,
                  focusRing,
                  "group/row relative flex cursor-default items-center gap-1 whitespace-nowrap pe-16 leading-6 focus-visible:outline-offset-[-2px]",
                  "hover:bg-pui-muted/60",
                  isFocused && "bg-pui-muted/40",
                  container && row.childCount > 0 && "cursor-pointer",
                )}
                style={{ paddingInlineStart: 8 + row.depth * indent }}
              >
                {Array.from({ length: row.depth }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cn(blockReset, "absolute inset-y-0 w-px bg-pui-border")}
                    style={{ insetInlineStart: 8 + i * indent + 6 }}
                  />
                ))}
                <span aria-hidden="true" className={cn(blockReset, "flex size-3.5 shrink-0 items-center justify-center text-pui-muted-foreground")}>
                  {container && row.childCount > 0 ? (
                    <ChevronRightIcon
                      className={cn(
                        "size-3.5 transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none rtl:-scale-x-100",
                        open && "rotate-90 rtl:rotate-90",
                      )}
                    />
                  ) : null}
                </span>
                <span className={cn(blockReset, row.key === null ? "text-pui-muted-foreground" : typeof row.key === "number" ? "text-pui-muted-foreground" : "text-pui-primary-text")}>
                  {row.key === null || typeof row.key === "number" ? keyText : <Highlight text={keyText} query={query} />}
                </span>
                <span aria-hidden="true" className={cn(blockReset, "-ms-1 me-0.5 text-pui-muted-foreground")}>
                  :
                </span>
                {container ? (
                  <span className={cn(blockReset, "text-pui-muted-foreground")}>
                    {row.kind === "array" ? "[" : "{"}
                    {open ? null : (
                      <>
                        {row.childCount > 0 ? "…" : ""}
                        {row.kind === "array" ? "]" : "}"}
                        <span className={cn(blockReset, "ms-2 rounded-pui-sm bg-pui-muted px-1 py-px text-[0.7rem] not-italic")}>
                          {row.childCount} {row.kind === "array" ? (row.childCount === 1 ? "item" : "items") : row.childCount === 1 ? "key" : "keys"}
                        </span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className={cn(blockReset, valueClass[row.kind], hit && "font-medium")}>
                    <Highlight text={primitiveText(row.value, row.kind)} query={query} />
                  </span>
                )}
                <span
                  className={cn(
                    blockReset,
                    "absolute end-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-(--pui-duration-fast) group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
                    (copiedKey === "value:" + row.path || copiedKey === "path:" + row.path) && "opacity-100",
                  )}
                >
                  <CopyButton
                    label={`Copy path ${row.path}`}
                    text="path"
                    done={copiedKey === `path:${row.path}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void doCopy(row, "path");
                    }}
                  />
                  <CopyButton
                    label={`Copy value of ${row.path}`}
                    done={copiedKey === `value:${row.path}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void doCopy(row, "value");
                    }}
                  />
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});
function CopyButton({ label, text, done, onClick }: { label: string; text?: string; done: boolean; onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        controlReset,
        "flex h-5 min-w-5 cursor-pointer items-center justify-center gap-1 rounded-pui-sm bg-pui-surface px-1 font-sans text-[0.65rem] text-pui-muted-foreground shadow-pui-xs ring-1 ring-pui-border hover:text-pui-foreground",
        done && "text-pui-success-text",
      )}
    >
      {done ? <CheckIcon className="size-3" /> : text ? <span className={cn(blockReset)}>{text}</span> : <CopyIcon className="size-3" />}
    </button>
  );
}
