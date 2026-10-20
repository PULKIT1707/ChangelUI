"use client";
import { Reorder, useDragControls, type DragControls, type HTMLMotionProps } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface SortableAnnouncements {
  pickedUp: (label: string, position: number, total: number) => string;
  moved: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
}

export interface SortableListProps<T>
  extends Omit<HTMLMotionProps<"ul">, "ref" | "children" | "values" | "onReorder" | "axis" | "layoutScroll"> {
  /** Current order. Keep it in state and update it from `onValuesChange`. */
  values: T[];
  /** Called on every step of a move (while dragging and per arrow key). */
  onValuesChange: (values: T[]) => void;
  /** Called once a move finishes (pointer drop or keyboard drop), e.g. to save the order. */
  onReorderEnd?: (values: T[]) => void;
  /** Default "y". */
  axis?: "x" | "y";
  /** Drag only from a `SortableHandle` inside each item. Default false: the whole item drags. */
  handle?: boolean;
  /** Screen reader announcements. */
  announcements?: Partial<SortableAnnouncements>;
  /** Keyboard instructions, read with each item. */
  instructionsLabel?: string;
  /** Default 8. */
  gap?: number;
  children?: React.ReactNode;
}

export interface SortableItemProps<T> extends Omit<HTMLMotionProps<"li">, "ref" | "value" | "children" | "layout"> {
  value: T;
  /** Name used in announcements. Default `String(value)`. */
  label?: string;
  /** Not draggable or movable by keyboard. */
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface SortableHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name. Default "Reorder {item label}". */
  "aria-label"?: string;
}

const defaultAnnouncements: SortableAnnouncements = {
  pickedUp: (label, position, total) => `Picked up ${label}, position ${position} of ${total}.`,
  moved: (label, position, total) => `Moved ${label} to position ${position} of ${total}.`,
  dropped: (label, position, total) => `Dropped ${label} at position ${position} of ${total}.`,
  cancelled: (label, position, total) => `Cancelled. ${label} is back at position ${position} of ${total}.`,
};

interface ListContextValue {
  values: unknown[];
  setValues: (values: unknown[]) => void;
  commit: () => void;
  axis: "x" | "y";
  handle: boolean;
  reduced: boolean;
  lifted: unknown;
  setLifted: (value: unknown) => void;
  original: React.MutableRefObject<unknown[] | null>;
  announce: (key: keyof SortableAnnouncements, label: string, index: number) => void;
  instructionsId: string;
}

const ListContext = React.createContext<ListContextValue | null>(null);

interface ItemContextValue {
  controls: DragControls;
  label: string;
  disabled: boolean;
  lifted: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onBlur: () => void;
}

const ItemContext = React.createContext<ItemContextValue | null>(null);

function useList(part: string): ListContextValue {
  const ctx = React.useContext(ListContext);
  if (!ctx) throw new Error(`${part} must be used inside SortableList.`);
  return ctx;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

function SortableListInner<T>(
  {
    values,
    onValuesChange,
    onReorderEnd,
    axis = "y",
    handle = false,
    announcements,
    instructionsLabel = "Press Space to pick up, arrow keys to move, Space again to drop, Escape to cancel.",
    gap = 8,
    className,
    style,
    children,
    ...props
  }: SortableListProps<T>,
  ref: React.ForwardedRef<HTMLUListElement>,
) {
  const reduced = usePrefersReducedMotion();
  const instructionsId = React.useId();
  const [lifted, setLifted] = React.useState<unknown>(null);
  const [message, setMessage] = React.useState("");
  const original = React.useRef<unknown[] | null>(null);
  const valuesRef = useLatestRef(values);
  const texts = React.useMemo(() => ({ ...defaultAnnouncements, ...announcements }), [announcements]);

  const ctx = React.useMemo<ListContextValue>(
    () => ({
      values,
      setValues: (next) => onValuesChange(next as T[]),
      commit: () => onReorderEnd?.(valuesRef.current),
      axis,
      handle,
      reduced,
      lifted,
      setLifted,
      original,
      announce: (key, label, index) => setMessage(texts[key](label, index + 1, valuesRef.current.length)),
      instructionsId,
    }),
    [values, valuesRef, onValuesChange, onReorderEnd, axis, handle, reduced, lifted, texts, instructionsId],
  );

  return (
    <ListContext.Provider value={ctx}>
      <Reorder.Group
        ref={ref}
        as="ul"
        axis={axis}
        values={values}
        onReorder={(next: T[]) => ctx.setValues(next)}
        data-orientation={axis === "y" ? "vertical" : "horizontal"}
        {...props}
        style={{ gap, ...style }}
        className={cn(listReset, "relative flex", axis === "y" ? "flex-col" : "flex-row flex-wrap", className)}
      >
        {children}
      </Reorder.Group>
      <span id={instructionsId} className={cn(blockReset, "sr-only")}>
        {instructionsLabel}
      </span>
      <span role="status" aria-live="assertive" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
    </ListContext.Provider>
  );
}

/**
 * A drag-to-reorder list with lift, settle and live layout springs, built on Motion's Reorder.
 * Fully keyboard operable: Space picks an item up, arrows move it, Space drops and Escape cancels,
 * with each step announced.
 */
export const SortableList = React.forwardRef(SortableListInner) as <T>(
  props: SortableListProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement | null;

function SortableItemInner<T>(
  { value, label: labelProp, disabled = false, className, children, onKeyDown, onBlur, ...props }: SortableItemProps<T>,
  ref: React.ForwardedRef<HTMLLIElement>,
) {
  const list = useList("SortableItem");
  const controls = useDragControls();
  const [dragging, setDragging] = React.useState(false);
  const label = labelProp ?? String(value);
  const isLifted = list.lifted === value;
  const anyLifted = list.lifted !== null;

  const indexOf = () => list.values.indexOf(value);

  const drop = (announce: boolean) => {
    list.setLifted(null);
    list.original.current = null;
    if (announce) list.announce("dropped", label, indexOf());
    list.commit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (disabled || event.defaultPrevented) return;
    const { key } = event;
    if (!isLifted) {
      if ((key === " " || key === "Enter") && !anyLifted) {
        event.preventDefault();
        list.original.current = list.values.slice();
        list.setLifted(value);
        list.announce("pickedUp", label, indexOf());
      }
      return;
    }
    const from = indexOf();
    const last = list.values.length - 1;
    let to: number | null = null;
    const back = list.axis === "y" ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft", "ArrowUp"];
    const forward = list.axis === "y" ? ["ArrowDown", "ArrowRight"] : ["ArrowRight", "ArrowDown"];
    if (back.includes(key)) to = Math.max(0, from - 1);
    else if (forward.includes(key)) to = Math.min(last, from + 1);
    else if (key === "Home") to = 0;
    else if (key === "End") to = last;
    else if (key === " " || key === "Enter") {
      event.preventDefault();
      drop(true);
      return;
    } else if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      const original = list.original.current;
      list.setLifted(null);
      list.original.current = null;
      if (original) {
        list.setValues(original);
        list.announce("cancelled", label, original.indexOf(value));
      }
      return;
    }
    if (to === null) return;
    event.preventDefault();
    if (to === from) return;
    list.setValues(move(list.values, from, to));
    list.announce("moved", label, to);
  };

  const itemCtx: ItemContextValue = {
    controls,
    label,
    disabled,
    lifted: isLifted,
    onKeyDown: handleKeyDown,
    onBlur: () => {
      if (isLifted) drop(true);
    },
  };

  const state = dragging ? "dragging" : isLifted ? "lifted" : "idle";
  const raised = (dragging || isLifted) && !list.reduced;

  return (
    <ItemContext.Provider value={itemCtx}>
      <Reorder.Item
        ref={ref}
        as="li"
        value={value}
        dragListener={!list.handle && !disabled}
        dragControls={controls}
        layout={list.reduced ? "position" : true}
        transition={list.reduced ? { duration: 0.15 } : springs.layout}
        animate={{ scale: raised ? 1.02 : 1 }}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => {
          setDragging(false);
          list.commit();
        }}
        tabIndex={list.handle || disabled ? undefined : 0}
        aria-describedby={list.handle || disabled ? undefined : list.instructionsId}
        aria-disabled={disabled || undefined}
        data-state={state}
        {...props}
        onKeyDown={(event: React.KeyboardEvent<HTMLLIElement>) => {
          onKeyDown?.(event);
          if (!list.handle) handleKeyDown(event);
        }}
        onBlur={(event: React.FocusEvent<HTMLLIElement>) => {
          onBlur?.(event);
          if (!list.handle && event.target === event.currentTarget) itemCtx.onBlur();
        }}
        style={{ position: "relative", ...props.style }}
        className={cn(
          blockReset,
          "select-none rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xs transition-[box-shadow,border-color] duration-(--pui-duration-base)",
          !list.handle && !disabled && "cursor-grab touch-none active:cursor-grabbing",
          "data-[state=dragging]:z-10 data-[state=dragging]:shadow-pui-lg data-[state=lifted]:z-10 data-[state=lifted]:border-pui-ring data-[state=lifted]:shadow-pui-lg",
          disabled && "opacity-60",
          !list.handle && focusRing,
          className,
        )}
      >
        {children}
      </Reorder.Item>
    </ItemContext.Provider>
  );
}

/** One row of a SortableList. Give it a stable `key` and the `value` from `values`. */
export const SortableItem = React.forwardRef(SortableItemInner) as <T>(
  props: SortableItemProps<T> & { ref?: React.Ref<HTMLLIElement> },
) => React.ReactElement | null;

function GripGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      {[6, 12, 18].map((y) => (
        <React.Fragment key={y}>
          <circle cx="9" cy={y} r="1.6" />
          <circle cx="15" cy={y} r="1.6" />
        </React.Fragment>
      ))}
    </svg>
  );
}

/** Drag handle for `SortableList handle`. It's also the keyboard target for its item. */
export const SortableHandle = React.forwardRef<HTMLButtonElement, SortableHandleProps>(function SortableHandle(
  { className, children, onPointerDown, onKeyDown, onBlur, ...props },
  ref,
) {
  const list = useList("SortableHandle");
  const item = React.useContext(ItemContext);
  if (!item) throw new Error("SortableHandle must be used inside SortableItem.");
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Reorder ${item.label}`}
      aria-describedby={list.instructionsId}
      aria-pressed={item.lifted}
      disabled={item.disabled}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented && !item.disabled) item.controls.start(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        item.onKeyDown(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        item.onBlur();
      }}
      className={cn(
        controlReset,
        "grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground active:cursor-grabbing aria-pressed:bg-pui-muted aria-pressed:text-pui-foreground disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
    >
      {children ?? <GripGlyph aria-hidden="true" className="size-4" />}
    </button>
  );
});
