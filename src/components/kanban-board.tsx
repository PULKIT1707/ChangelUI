"use client";
import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { PlusIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface KanbanColumn {
  id: string;
  title: string;
  /** Work-in-progress limit; the header warns when the column holds more. */
  limit?: number;
  /** Dot color in the header. Default "neutral". */
  tone?: Tone;
}
export interface KanbanCardLabel {
  label: string;
  tone?: Tone;
}
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: readonly KanbanCardLabel[];
  /** Bottom-end slot, e.g. an Avatar. */
  assignee?: React.ReactNode;
  /** Bottom-start slot, e.g. "ENG-142" or a due date. */
  meta?: React.ReactNode;
}
export interface KanbanMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Position in the destination column after the move. */
  index: number;
}
export interface KanbanAnnouncements {
  lifted: (card: string, column: string, position: number, total: number) => string;
  moved: (card: string, column: string, position: number, total: number) => string;
  dropped: (card: string, column: string, position: number, total: number) => string;
  cancelled: (card: string, column: string) => string;
  blocked: (card: string, column: string) => string;
}
export interface KanbanBoardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  columns: readonly KanbanColumn[];
  cards?: readonly KanbanCard[];
  defaultCards?: readonly KanbanCard[];
  /** The new card order after a move (cards keep their column order within the array). */
  onCardsChange?: (cards: KanbanCard[], move: KanbanMove) => void;
  /** Card click or Enter-free activation (a click that did not start a drag). */
  onCardClick?: (card: KanbanCard) => void;
  /** Shows an "Add card" button at the bottom of every column. */
  onAddCard?: (columnId: string) => void;
  /** Refuse drops that would put a column over its limit. Default false (warn only). */
  enforceLimits?: boolean;
  /** Custom card body (the drag, focus and lift styling are kept). */
  renderCard?: (card: KanbanCard) => React.ReactNode;
  /** Screen reader messages. */
  announcements?: Partial<KanbanAnnouncements>;
  /** Default "Press Space to pick up a card, arrow keys to move it, Space to drop, Escape to cancel." */
  instructionsLabel?: string;
  /** Default "Board". */
  label?: string;
}
const defaultAnnouncements: KanbanAnnouncements = {
  lifted: (card, column, position, total) => `Picked up ${card}. ${column}, position ${position} of ${total}.`,
  moved: (card, column, position, total) => `${card}: ${column}, position ${position} of ${total}.`,
  dropped: (card, column, position, total) => `Dropped ${card} in ${column}, position ${position} of ${total}.`,
  cancelled: (card, column) => `Move cancelled. ${card} is back in ${column}.`,
  blocked: (card, column) => `${column} is at its limit. ${card} can't move there.`,
};
const dotColor: Record<Tone, string> = {
  neutral: "bg-pui-muted-foreground",
  primary: "bg-pui-primary",
  success: "bg-pui-success",
  warning: "bg-pui-warning",
  danger: "bg-pui-danger",
  info: "bg-pui-info",
};
interface Target {
  columnId: string;
  index: number;
}
interface DragState {
  id: string;
  from: Target;
  to: Target;
  mode: "pointer" | "keyboard";
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}
/** Moves a card to a column position, returning the new array. */
export function moveKanbanCard(cards: readonly KanbanCard[], cardId: string, to: Target): KanbanCard[] {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return [...cards];
  const rest = cards.filter((c) => c.id !== cardId);
  const inColumn = rest.filter((c) => c.columnId === to.columnId);
  const moved = { ...card, columnId: to.columnId };
  const before = inColumn[to.index];
  if (before) {
    const at = rest.indexOf(before);
    return [...rest.slice(0, at), moved, ...rest.slice(at)];
  }
  const last = inColumn[inColumn.length - 1];
  const at = last ? rest.indexOf(last) + 1 : rest.length;
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}
function DefaultCardBody({ card }: { card: KanbanCard }) {
  return (
    <>
      {card.labels && card.labels.length > 0 ? (
        <span className={cn(blockReset, "flex flex-wrap gap-1")}>
          {card.labels.map((l) => (
            <span
              key={l.label}
              className={cn(
                blockReset,
                "rounded-pui-sm bg-(--pui-tone)/12 px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium text-(--pui-tone-text)",
                toneClasses[l.tone ?? "neutral"],
              )}
            >
              {l.label}
            </span>
          ))}
        </span>
      ) : null}
      <span className={cn(blockReset, "text-sm leading-snug font-medium text-pui-foreground")}>{card.title}</span>
      {card.description ? <span className={cn(blockReset, "line-clamp-2 text-xs text-pui-muted-foreground")}>{card.description}</span> : null}
      {card.meta || card.assignee ? (
        <span className={cn(blockReset, "mt-0.5 flex items-center justify-between gap-2 text-xs text-pui-muted-foreground")}>
          <span className={cn(blockReset, "min-w-0 truncate tabular-nums")}>{card.meta}</span>
          {card.assignee ? <span className={cn(blockReset, "flex shrink-0")}>{card.assignee}</span> : null}
        </span>
      ) : null}
    </>
  );
}
const EMPTY: readonly KanbanCard[] = [];
/**
 * Task board with columns and draggable cards. Drag with a mouse or pen (the card lifts and follows
 * the pointer while the others make room), or use the keyboard: Space picks a card up, arrows move
 * it within and across columns, Space drops and Escape cancels, with every step announced. Columns
 * show their count against an optional WIP limit and warn when over it (or refuse the drop with
 * enforceLimits). Works controlled (cards + onCardsChange) or uncontrolled (defaultCards).
 */
export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(function KanbanBoard(
  {
    columns,
    cards: cardsProp,
    defaultCards = EMPTY,
    onCardsChange,
    onCardClick,
    onAddCard,
    enforceLimits = false,
    renderCard,
    announcements,
    instructionsLabel = "Press Space to pick up a card, arrow keys to move it, Space to drop, Escape to cancel.",
    label = "Board",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const baseId = React.useId();
  const instructionsId = `${baseId}-instructions`;
  const texts = React.useMemo(() => ({ ...defaultAnnouncements, ...announcements }), [announcements]);
  const [cards, setCards] = useControllableState<readonly KanbanCard[]>({ value: cardsProp, defaultValue: defaultCards });
  const [drag, setDragState] = React.useState<DragState | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const [message, setMessage] = React.useState("");
  const cardRefs = React.useRef(new Map<string, HTMLDivElement>());
  const listRefs = React.useRef(new Map<string, HTMLUListElement>());
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const focusRequest = React.useRef<string | null>(null);
  const suppressClick = React.useRef(false);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => cleanupRef.current?.(), []);
  // Keyboard moves remount the card under another column; put focus back on it.
  useIsomorphicLayoutEffect(() => {
    const id = focusRequest.current;
    if (id === null) return;
    focusRequest.current = null;
    cardRefs.current.get(id)?.focus({ preventScroll: false });
  });
  const display = drag ? moveKanbanCard(cards, drag.id, drag.to) : cards;
  const columnTitle = (id: string) => columns.find((c) => c.id === id)?.title ?? id;
  const othersIn = (columnId: string, cardId: string) => cards.filter((c) => c.columnId === columnId && c.id !== cardId);
  const positionOf = (cardId: string): Target | null => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return null;
    return { columnId: card.columnId, index: cards.filter((c) => c.columnId === card.columnId).indexOf(card) };
  };
  const allowed = (cardId: string, from: Target, to: Target) => {
    if (!enforceLimits || to.columnId === from.columnId) return true;
    const limit = columns.find((c) => c.id === to.columnId)?.limit;
    return limit === undefined || othersIn(to.columnId, cardId).length < limit;
  };
  const say = (key: "lifted" | "moved" | "dropped", cardId: string, to: Target) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    setMessage(texts[key](card.title, columnTitle(to.columnId), to.index + 1, othersIn(to.columnId, cardId).length + 1));
  };
  const commit = (d: DragState) => {
    setDrag(null);
    focusRequest.current = d.mode === "keyboard" ? d.id : null;
    if (d.to.columnId === d.from.columnId && d.to.index === d.from.index) return;
    const next = moveKanbanCard(cards, d.id, d.to);
    setCards(next);
    onCardsChange?.(next, { cardId: d.id, fromColumnId: d.from.columnId, toColumnId: d.to.columnId, index: d.to.index });
  };
  const cancel = (d: DragState) => {
    setDrag(null);
    focusRequest.current = d.mode === "keyboard" ? d.id : null;
    const card = cards.find((c) => c.id === d.id);
    if (card) setMessage(texts.cancelled(card.title, columnTitle(d.from.columnId)));
  };
  /** Column under the pointer (nearest by x) and the slot among its other cards. */
  const hitTest = (x: number, y: number, cardId: string): Target | null => {
    let best: { columnId: string; distance: number } | null = null;
    for (const column of columns) {
      const el = listRefs.current.get(column.id)?.closest("section");
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const distance = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      if (!best || distance < best.distance) best = { columnId: column.id, distance };
    }
    if (!best) return null;
    let index = 0;
    for (const card of othersIn(best.columnId, cardId)) {
      const rect = cardRefs.current.get(card.id)?.getBoundingClientRect();
      if (rect && rect.top + rect.height / 2 < y) index += 1;
    }
    return { columnId: best.columnId, index };
  };
  const startPointer = (event: React.PointerEvent<HTMLDivElement>, card: KanbanCard) => {
    if (event.button !== 0 || dragRef.current) return;
    const from = positionOf(card.id);
    if (!from) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let started = false;
    const onMove = (ev: PointerEvent) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
        started = true;
        suppressClick.current = true;
        document.body.style.cursor = "grabbing";
        setDrag({
          id: card.id,
          from,
          to: from,
          mode: "pointer",
          x: ev.clientX,
          y: ev.clientY,
          offsetX: startX - rect.left,
          offsetY: startY - rect.top,
          width: rect.width,
          height: rect.height,
        });
        say("lifted", card.id, from);
      }
      const current = dragRef.current;
      if (!current) return;
      // Nudge the board sideways near its edges.
      const scroller = scrollerRef.current;
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        if (ev.clientX < box.left + 48) scroller.scrollLeft -= 14;
        else if (ev.clientX > box.right - 48) scroller.scrollLeft += 14;
      }
      const hit = hitTest(ev.clientX, ev.clientY, card.id);
      const to = hit && allowed(card.id, from, hit) ? hit : current.to;
      setDrag({ ...current, x: ev.clientX, y: ev.clientY, to });
    };
    const stop = (dropIt: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      cleanupRef.current = null;
      document.body.style.cursor = "";
      const current = dragRef.current;
      if (!started || !current) return;
      if (dropIt) {
        say("dropped", current.id, current.to);
        commit(current);
      } else cancel(current);
      // The click that ends a drag must not open the card.
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    };
    const onUp = () => stop(true);
    const onCancel = () => stop(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    cleanupRef.current = () => stop(false);
  };
  const onCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, card: KanbanCard) => {
    const { key } = event;
    const current = dragRef.current;
    if (!current) {
      if (key === " " || (key === "Enter" && !onCardClick)) {
        event.preventDefault();
        const from = positionOf(card.id);
        if (!from) return;
        setDrag({ id: card.id, from, to: from, mode: "keyboard", x: 0, y: 0, offsetX: 0, offsetY: 0, width: 0, height: 0 });
        say("lifted", card.id, from);
      } else if (key === "Enter" && onCardClick) {
        event.preventDefault();
        onCardClick(card);
      }
      return;
    }
    if (current.id !== card.id || current.mode !== "keyboard") return;
    if (key === " " || key === "Enter") {
      event.preventDefault();
      say("dropped", current.id, current.to);
      commit(current);
    } else if (key === "Escape") {
      event.preventDefault();
      cancel(current);
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const count = othersIn(current.to.columnId, card.id).length;
      const index = Math.min(count, Math.max(0, current.to.index + (key === "ArrowUp" ? -1 : 1)));
      if (index === current.to.index) return;
      const to = { columnId: current.to.columnId, index };
      setDrag({ ...current, to });
      focusRequest.current = card.id;
      say("moved", card.id, to);
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const step = (key === "ArrowLeft") !== rtl ? -1 : 1;
      const col = columns.findIndex((c) => c.id === current.to.columnId) + step;
      const target = columns[col];
      if (!target) return;
      const to = { columnId: target.id, index: Math.min(current.to.index, othersIn(target.id, card.id).length) };
      if (!allowed(card.id, current.from, to)) {
        setMessage(texts.blocked(card.title, target.title));
        return;
      }
      setDrag({ ...current, to });
      focusRequest.current = card.id;
      say("moved", card.id, to);
    } else if (key === "Tab") {
      cancel(current);
    }
  };
  const dragged = drag ? cards.find((c) => c.id === drag.id) : undefined;
  return (
    <div ref={ref} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col text-pui-foreground", className)}>
      <p id={instructionsId} className={cn(blockReset, "sr-only")}>
        {instructionsLabel}
      </p>
      <span role="status" aria-live="assertive" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
      <div ref={scrollerRef} role="group" aria-label={label} className={cn(blockReset, "flex w-full items-start gap-3 overflow-x-auto pb-2")}>
        {columns.map((column) => {
          const items = display.filter((c) => c.columnId === column.id);
          const over = column.limit !== undefined && items.length > column.limit;
          const full = column.limit !== undefined && items.length >= column.limit;
          const headingId = `${baseId}-col-${column.id}`;
          const target = drag !== null && drag.to.columnId === column.id && drag.from.columnId !== column.id;
          return (
            <section
              key={column.id}
              aria-labelledby={headingId}
              data-over-limit={over ? "" : undefined}
              data-drop-target={target ? "" : undefined}
              className={cn(
                blockReset,
                "flex min-w-48 max-w-80 flex-1 basis-0 flex-col gap-2 rounded-pui-lg border bg-pui-muted/50 p-2 transition-[border-color,background-color] duration-(--pui-duration-fast)",
                over ? "border-pui-warning/60" : target ? "border-pui-primary/50 bg-pui-primary/5" : "border-pui-border",
              )}
            >
              <header className={cn(blockReset, "flex items-center gap-2 px-1.5 pt-1")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2 shrink-0 rounded-pui-full", dotColor[column.tone ?? "neutral"])} />
                <h3 id={headingId} className={cn(blockReset, "min-w-0 flex-1 truncate text-sm font-semibold")}>
                  {column.title}
                </h3>
                <span
                  className={cn(
                    blockReset,
                    "rounded-pui-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                    over ? "bg-pui-warning/15 text-pui-warning-text" : full ? "bg-pui-background text-pui-foreground" : "text-pui-muted-foreground",
                  )}
                >
                  {items.length}
                  {column.limit !== undefined ? ` / ${column.limit}` : ""}
                  <span className={cn(blockReset, "sr-only")}>
                    {column.limit !== undefined ? ` cards, limit ${column.limit}${over ? ", over the limit" : ""}` : " cards"}
                  </span>
                </span>
              </header>
              {over ? (
                <p className={cn(blockReset, "px-1.5 text-xs text-pui-warning-text")}>Over the WIP limit by {items.length - (column.limit ?? 0)}. Finish something first.</p>
              ) : null}
              <ul
                ref={(node) => {
                  if (node) listRefs.current.set(column.id, node);
                  else listRefs.current.delete(column.id);
                }}
                aria-labelledby={headingId}
                className={cn(listReset, "flex min-h-16 flex-col gap-2")}
              >
                {items.map((card) => {
                  const isDragged = drag?.id === card.id;
                  const placeholder = isDragged && drag.mode === "pointer";
                  const lifted = isDragged && drag.mode === "keyboard";
                  return (
                    <motion.li
                      key={card.id}
                      layout={reduced ? false : "position"}
                      transition={springs.snappy}
                      className={cn(blockReset, "relative")}
                    >
                      {placeholder ? (
                        <div
                          aria-hidden="true"
                          className={cn(blockReset, "rounded-pui-md border-2 border-dashed border-pui-primary/40 bg-pui-primary/5")}
                          style={{ height: drag.height }}
                        />
                      ) : null}
                      <div
                        ref={(node) => {
                          if (node) cardRefs.current.set(card.id, node);
                          else cardRefs.current.delete(card.id);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-roledescription="draggable card"
                        aria-describedby={instructionsId}
                        aria-pressed={lifted ? true : undefined}
                        data-state={lifted ? "lifted" : undefined}
                        hidden={placeholder}
                        onPointerDown={(event) => startPointer(event, card)}
                        onClick={() => {
                          if (suppressClick.current || dragRef.current) return;
                          onCardClick?.(card);
                        }}
                        onKeyDown={(event) => onCardKeyDown(event, card)}
                        className={cn(
                          blockReset,
                          focusRing,
                          "flex cursor-grab touch-none flex-col gap-1.5 rounded-pui-md border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-xs select-none transition-[box-shadow,transform,border-color] duration-(--pui-duration-fast) hover:border-pui-foreground/20 hover:shadow-pui-sm",
                          lifted && "z-10 scale-[1.02] border-pui-primary shadow-pui-md ring-2 ring-pui-primary/30 motion-reduce:scale-100",
                        )}
                      >
                        {renderCard ? renderCard(card) : <DefaultCardBody card={card} />}
                      </div>
                    </motion.li>
                  );
                })}
                {items.length === 0 ? (
                  <li aria-hidden="true" className={cn(blockReset, "flex h-16 items-center justify-center rounded-pui-md border border-dashed border-pui-border text-xs text-pui-muted-foreground")}>
                    Drop cards here
                  </li>
                ) : null}
              </ul>
              {onAddCard ? (
                <button
                  type="button"
                  onClick={() => onAddCard(column.id)}
                  className={cn(
                    controlReset,
                    focusRing,
                    "flex h-8 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-background hover:text-pui-foreground",
                  )}
                >
                  <PlusIcon className="size-3.5" />
                  Add card<span className={cn(blockReset, "sr-only")}> to {column.title}</span>
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
      {drag && drag.mode === "pointer" && dragged ? (
        <Portal>
          <motion.div
            aria-hidden="true"
            initial={reduced ? false : { scale: 1, rotate: 0 }}
            animate={reduced ? { scale: 1, rotate: 0 } : { scale: 1.03, rotate: 2 }}
            transition={springs.snappy}
            className={cn(
              blockReset,
              "pointer-events-none fixed z-50 flex flex-col gap-1.5 rounded-pui-md border border-pui-primary/40 bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-lg",
            )}
            style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width }}
          >
            {renderCard ? renderCard(dragged) : <DefaultCardBody card={dragged} />}
          </motion.div>
        </Portal>
      ) : null}
    </div>
  );
});
