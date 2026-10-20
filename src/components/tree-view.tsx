"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ChevronRightIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface TreeNode {
  id: string;
  label: React.ReactNode;
  /** Text used for typeahead and announcements when label isn't a string. */
  textValue?: string;
  icon?: React.ReactNode;
  /** Trailing content (badge, count, status dot). */
  meta?: React.ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
}

export interface TreeViewProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "defaultValue" | "children"> {
  items: TreeNode[];
  /** Selected node ids (at most one unless multiSelect). */
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Expanded parent ids. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Ctrl/Cmd-click and Space toggle, Shift-click selects a range. Default false. */
  multiSelect?: boolean;
  /** Enter or double-click on a node (e.g. open a file). */
  onActivate?: (node: TreeNode) => void;
  /** Vertical indentation guides. Default true. */
  guides?: boolean;
  /** Indent per level in px. Default 16. */
  indent?: number;
  /** Row height 28 / 32 px. Default "md". */
  size?: "sm" | "md";
  /** Accessible name; omit when aria-labelledby is passed. */
  label?: string;
  /** Custom label renderer (the row keeps icon, chevron and selection). */
  renderLabel?: (node: TreeNode, state: { selected: boolean; expanded: boolean; depth: number }) => React.ReactNode;
}

interface FlatNode {
  node: TreeNode;
  depth: number;
  parentId: string | null;
  posinset: number;
  setsize: number;
}

const textOf = (node: TreeNode) => node.textValue ?? (typeof node.label === "string" ? node.label : node.id);

function flatten(items: TreeNode[], expanded: ReadonlySet<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (nodes: TreeNode[], depth: number, parentId: string | null) => {
    nodes.forEach((node, i) => {
      out.push({ node, depth, parentId, posinset: i + 1, setsize: nodes.length });
      if (node.children?.length && expanded.has(node.id)) walk(node.children, depth + 1, node.id);
    });
  };
  walk(items, 1, null);
  return out;
}

function findSiblings(items: TreeNode[], id: string): TreeNode[] {
  const search = (nodes: TreeNode[]): TreeNode[] | null => {
    if (nodes.some((n) => n.id === id)) return nodes;
    for (const n of nodes) {
      const found = n.children ? search(n.children) : null;
      if (found) return found;
    }
    return null;
  };
  return search(items) ?? [];
}

const EMPTY: string[] = [];

/** File / outline explorer: animated expand, a sliding selection pill, guides and full APG keyboard. */
export const TreeView = React.forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  {
    items,
    selected: selectedProp,
    defaultSelected = EMPTY,
    onSelectedChange,
    expanded: expandedProp,
    defaultExpanded = EMPTY,
    onExpandedChange,
    multiSelect = false,
    onActivate,
    guides = true,
    indent = 16,
    size = "md",
    label,
    renderLabel,
    className,
    onKeyDown,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const pillId = `${React.useId()}-pill`;
  const [selected, setSelected] = useControllableState({ value: selectedProp, defaultValue: defaultSelected, onChange: onSelectedChange });
  const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
  const expandedSet = React.useMemo(() => new Set(expanded), [expanded]);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const flat = React.useMemo(() => flatten(items, expandedSet), [items, expandedSet]);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const anchorRef = React.useRef<string | null>(null);
  const rowRefs = React.useRef(new Map<string, HTMLDivElement>());
  const typeahead = React.useRef({ text: "", time: 0 });
  const onActivateRef = useLatestRef(onActivate);

  // The tab stop: the focused node if still visible, else the first selected visible node, else the first.
  const visibleIds = flat.map((f) => f.node.id);
  const tabStop =
    (focusedId && visibleIds.includes(focusedId) ? focusedId : null) ??
    flat.find((f) => selectedSet.has(f.node.id))?.node.id ??
    flat[0]?.node.id ??
    null;

  const focusNode = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    rowRefs.current.get(id)?.focus();
  };

  const toggleExpanded = (id: string, open?: boolean) => {
    const isOpen = expandedSet.has(id);
    const next = open ?? !isOpen;
    if (next === isOpen) return;
    setExpanded(next ? [...expanded, id] : expanded.filter((e) => e !== id));
  };

  const select = (id: string, mode: "replace" | "toggle" | "range") => {
    const flatNode = flat.find((f) => f.node.id === id);
    if (!flatNode || flatNode.node.disabled) return;
    if (!multiSelect || mode === "replace") {
      setSelected([id]);
      anchorRef.current = id;
      return;
    }
    if (mode === "toggle") {
      setSelected(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
      anchorRef.current = id;
      return;
    }
    const anchor = anchorRef.current ?? id;
    const a = visibleIds.indexOf(anchor);
    const b = visibleIds.indexOf(id);
    if (a === -1) {
      setSelected([id]);
      return;
    }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setSelected(flat.slice(lo, hi + 1).filter((f) => !f.node.disabled).map((f) => f.node.id));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const index = flat.findIndex((f) => f.node.id === tabStop);
    const current = flat[index];
    if (!current) return;
    const { node } = current;
    const hasChildren = Boolean(node.children?.length);
    const isOpen = expandedSet.has(node.id);
    const move = (to: number) => {
      const target = flat[Math.max(0, Math.min(flat.length - 1, to))];
      if (!target) return;
      focusNode(target.node.id);
      if (multiSelect && event.shiftKey) select(target.node.id, "range");
    };
    let handled = true;
    switch (event.key) {
      case "ArrowDown":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index - 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(flat.length - 1);
        break;
      case "ArrowRight":
        if (hasChildren && !isOpen) toggleExpanded(node.id, true);
        else if (hasChildren) move(index + 1);
        break;
      case "ArrowLeft":
        if (hasChildren && isOpen) toggleExpanded(node.id, false);
        else if (current.parentId) focusNode(current.parentId);
        break;
      case "Enter":
        select(node.id, "replace");
        onActivateRef.current?.(node);
        break;
      case " ":
        select(node.id, multiSelect ? "toggle" : "replace");
        break;
      case "*": {
        const siblings = findSiblings(items, node.id).filter((n) => n.children?.length && !expandedSet.has(n.id));
        if (siblings.length) setExpanded([...expanded, ...siblings.map((n) => n.id)]);
        break;
      }
      case "a":
        if (multiSelect && (event.metaKey || event.ctrlKey)) {
          setSelected(flat.filter((f) => !f.node.disabled).map((f) => f.node.id));
          break;
        }
        handled = false;
        break;
      default:
        handled = false;
    }
    if (!handled && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const state = typeahead.current;
      state.text = now - state.time > 700 ? event.key.toLowerCase() : state.text + event.key.toLowerCase();
      state.time = now;
      const order = [...flat.slice(index + 1), ...flat.slice(0, index + 1)];
      const single = state.text.split("").every((c) => c === state.text[0]);
      const match =
        order.find((f) => textOf(f.node).toLowerCase().startsWith(state.text)) ??
        (single ? order.find((f) => textOf(f.node).toLowerCase().startsWith(state.text[0] ?? "")) : undefined);
      if (match) focusNode(match.node.id);
      handled = true;
    }
    if (handled) event.preventDefault();
  };

  // The guide of the group that holds the focused or selected row is highlighted.
  const activeParent = flat.find((f) => f.node.id === (focusedId ?? selected[0]))?.parentId ?? null;
  const rowHeight = size === "sm" ? "h-7 text-xs" : "h-8 text-sm";

  const renderLevel = (nodes: TreeNode[], depth: number, parentId: string | null): React.ReactNode =>
    nodes.map((node, i) => {
      const hasChildren = Boolean(node.children?.length);
      const isOpen = hasChildren && expandedSet.has(node.id);
      const isSelected = selectedSet.has(node.id);
      const groupId = `${pillId}-g-${node.id}`;
      return (
        <React.Fragment key={node.id}>
          <div
            ref={(el) => {
              if (el) rowRefs.current.set(node.id, el);
              else rowRefs.current.delete(node.id);
            }}
            role="treeitem"
            aria-level={depth}
            aria-posinset={i + 1}
            aria-setsize={nodes.length}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-selected={isSelected}
            aria-disabled={node.disabled || undefined}
            aria-owns={isOpen ? groupId : undefined}
            tabIndex={node.id === tabStop ? 0 : -1}
            data-state={isSelected ? "selected" : undefined}
            data-disabled={node.disabled ? "" : undefined}
            onFocus={() => setFocusedId(node.id)}
            onClick={(event) => {
              if (node.disabled) return;
              focusNode(node.id);
              const mode = event.shiftKey ? "range" : event.metaKey || event.ctrlKey ? "toggle" : "replace";
              select(node.id, mode);
              if (hasChildren && mode === "replace") toggleExpanded(node.id);
            }}
            onDoubleClick={() => {
              if (!node.disabled) onActivateRef.current?.(node);
            }}
            style={{ paddingInlineStart: (depth - 1) * indent + 6 }}
            className={cn(
              blockReset,
              "group/row relative isolate flex cursor-pointer select-none items-center gap-1.5 rounded-pui-sm pe-2 outline-hidden",
              rowHeight,
              "text-pui-foreground hover:bg-pui-muted/70",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-pui-ring",
              isSelected && "text-pui-primary-text",
              node.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {isSelected ? (
              multiSelect || reduced ? (
                <span aria-hidden="true" className={cn(blockReset, "absolute inset-0 -z-[1] rounded-pui-sm bg-pui-primary/12")} />
              ) : (
                <motion.span
                  aria-hidden="true"
                  layoutId={pillId}
                  transition={springs.snappy}
                  className={cn(blockReset, "absolute inset-0 -z-[1] rounded-pui-sm bg-pui-primary/12")}
                />
              )
            ) : null}
            <span aria-hidden="true" className={cn(blockReset, "grid size-4 shrink-0 place-items-center text-pui-muted-foreground")}>
              {hasChildren ? (
                <motion.span
                  initial={false}
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={reduced ? { duration: 0 } : springs.snappy}
                  className="grid place-items-center rtl:-scale-x-100"
                >
                  <ChevronRightIcon className="size-3.5" />
                </motion.span>
              ) : null}
            </span>
            {node.icon ? (
              <span aria-hidden="true" className={cn(blockReset, "grid shrink-0 place-items-center [&_svg]:size-4")}>
                {node.icon}
              </span>
            ) : null}
            <span className={cn(blockReset, "min-w-0 flex-1 truncate")}>
              {renderLabel ? renderLabel(node, { selected: isSelected, expanded: isOpen, depth }) : node.label}
            </span>
            {node.meta ? <span className={cn(blockReset, "shrink-0 text-xs text-pui-muted-foreground")}>{node.meta}</span> : null}
          </div>
          {hasChildren ? (
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="group"
                  id={groupId}
                  role="group"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.22, ease: easings.out }}
                  className={cn(blockReset, "relative overflow-hidden")}
                >
                  {guides ? (
                    <span
                      aria-hidden="true"
                      style={{ insetInlineStart: (depth - 1) * indent + 6 + 7.5 }}
                      className={cn(
                        blockReset,
                        "pointer-events-none absolute inset-y-1 w-px transition-colors duration-200",
                        activeParent === node.id ? "bg-pui-primary/50" : "bg-pui-border",
                      )}
                    />
                  ) : null}
                  {renderLevel(node.children ?? [], depth + 1, node.id)}
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : null}
        </React.Fragment>
      );
    });

  return (
    <div
      ref={ref}
      role="tree"
      aria-label={label}
      aria-multiselectable={multiSelect || undefined}
      data-size={size}
      {...props}
      onKeyDown={handleKeyDown}
      className={cn(blockReset, "relative isolate flex flex-col", className)}
    >
      {renderLevel(items, 1, null)}
    </div>
  );
});
