"use client";

import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { buttonBase, buttonSizes } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { useDrag } from "../lib/drag";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type CardStackDirection = "left" | "right";

export interface CardStackRenderInfo {
  /** 0 is the top card. */
  depth: number;
  isTop: boolean;
}

export interface CardStackActions {
  /** Throws the top card out, as if swiped. */
  swipe: (direction: CardStackDirection) => void;
  /** Brings the last swiped card back. */
  undo: () => void;
}

export interface CardStackProps<T> extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "children"> {
  items: readonly T[];
  renderCard: (item: T, info: CardStackRenderInfo) => React.ReactNode;
  /** Stable key per item. Default: the index. */
  getKey?: (item: T, index: number) => React.Key;
  /** Accessible name per card, read when it reaches the top. */
  getCardLabel?: (item: T) => string;
  /** Called after a card leaves. */
  onSwipe?: (item: T, direction: CardStackDirection, index: number) => void;
  /** Called after undo restores a card. */
  onUndo?: (item: T, index: number) => void;
  /** Cards visible behind the top one, plus the top card. Default 3. */
  visible?: number;
  /** px of drag that commits a swipe. Default 100. */
  swipeThreshold?: number;
  /** Start again from the first card after the last. Default false. */
  loop?: boolean;
  /** Visible Skip / Undo / Like buttons; when false they stay for screen readers only. Default true. */
  showControls?: boolean;
  /** "LIKE" / "NOPE" stamps that fade in while dragging. Default true. */
  stamps?: boolean;
  /** Shown when every card is gone. */
  emptyState?: React.ReactNode;
  /** Imperative swipe/undo. */
  actionsRef?: React.Ref<CardStackActions>;
  /** Class for each card's shell. */
  cardClassName?: string;
  likeLabel?: string;
  skipLabel?: string;
  undoLabel?: string;
  /** Accessible name of the region. Default "Card stack". */
  label?: string;
}

interface Flying {
  id: number;
  abs: number;
  direction: CardStackDirection;
  x: number;
  y: number;
  vx: number;
}

interface HistoryEntry {
  abs: number;
  direction: CardStackDirection;
}

/** px each card below sits under the one above it. */
const PEEK = 10;
/** 1, 0.94, 0.88, ... floored so deep stacks stay legible. */
const depthScale = (d: number) => Math.max(1 - d * 0.06, 0.7);

const shell =
  "absolute inset-0 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg";

function Stamp({ label, side, opacity }: { label: string; side: CardStackDirection; opacity: MotionValue<number> }) {
  return (
    <motion.span
      aria-hidden="true"
      style={{ opacity }}
      className={cn(
        blockReset,
        "pointer-events-none absolute top-5 z-10 rounded-pui-md border-[3px] px-2.5 py-0.5 text-xl font-black tracking-widest uppercase",
        side === "right"
          ? "left-5 -rotate-12 border-pui-success text-pui-success-text"
          : "right-5 rotate-12 border-pui-danger text-pui-danger-text",
      )}
    >
      {label}
    </motion.span>
  );
}

interface StackCardProps {
  children: React.ReactNode;
  depth: number;
  visible: number;
  enterFrom: CardStackDirection | null;
  threshold: number;
  reduced: boolean;
  stamps: boolean;
  likeLabel: string;
  skipLabel: string;
  progress: MotionValue<number>;
  className?: string;
  onCommit: (direction: CardStackDirection, x: number, y: number, vx: number) => void;
  registerSwipe: (fn: ((direction: CardStackDirection) => void) | null) => void;
}

function StackCard({
  children,
  depth,
  visible,
  enterFrom,
  threshold,
  reduced,
  stamps,
  likeLabel,
  skipLabel,
  progress,
  className,
  onCommit,
  registerSwipe,
}: StackCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isTop = depth === 0;
  const x = useMotionValue(enterFrom && !reduced ? (enterFrom === "right" ? 1 : -1) * 480 : 0);
  const y = useMotionValue(0);
  // The card right behind the top one grows a little as the top card is dragged away.
  const boost = useMotionValue(1);
  const lift = useMotionValue(0);
  const rotate = useTransform(x, (v) => (reduced ? 0 : Math.max(-18, Math.min(18, v / 20))));
  const yOut = useTransform([y, lift], ([a, b]) => (a as number) + (b as number));
  const likeOpacity = useTransform(x, [0, threshold * 0.8], [0, 1]);
  const skipOpacity = useTransform(x, [-threshold * 0.8, 0], [1, 0]);
  const [dragging, setDragging] = React.useState(false);
  const latest = useLatestRef({ onCommit, threshold, reduced });

  React.useEffect(() => {
    if (x.get() !== 0) animate(x, 0, springs.smooth);
  }, [x]);

  React.useEffect(() => {
    if (isTop) {
      animate(boost, 1, springs.layout);
      animate(lift, 0, springs.layout);
      const unsubscribe = x.on("change", (v) => progress.set(Math.min(1, Math.abs(v) / latest.current.threshold)));
      return unsubscribe;
    }
    if (depth === 1 && !reduced) {
      return progress.on("change", (p) => {
        boost.set(1 + p * 0.025);
        lift.set(-p * 5);
      });
    }
    boost.set(1);
    lift.set(0);
    return undefined;
  }, [isTop, depth, reduced, x, boost, lift, progress, latest]);

  React.useEffect(() => {
    if (!isTop) return;
    registerSwipe((direction) => onCommit(direction, x.get(), y.get(), 0));
    return () => registerSwipe(null);
  }, [isTop, registerSwipe, onCommit, x, y]);

  useDrag(
    ref,
    {
      onStart: ({ event }) => {
        const target = event.target as Element | null;
        if (target?.closest("button, a, input, textarea, select, [role='button']")) return false;
        setDragging(true);
      },
      onMove: ({ dx, dy }) => {
        x.set(dx);
        y.set(dy * 0.35);
      },
      onEnd: ({ dx, vx }) => {
        setDragging(false);
        const { threshold: t, onCommit: commit } = latest.current;
        if (Math.abs(dx) > t || (Math.abs(vx) > 500 && Math.sign(vx) === Math.sign(dx))) {
          commit(dx > 0 ? "right" : "left", x.get(), y.get(), vx);
          return;
        }
        animate(x, 0, springs.bouncy);
        animate(y, 0, springs.bouncy);
      },
    },
    { enabled: isTop },
  );

  const d = Math.min(depth, visible - 1);
  return (
    <motion.div
      aria-hidden={isTop ? undefined : true}
      initial={false}
      // Scale from the bottom edge so each card below peeks out PEEK px under the one above it
      // (scaling from the center would pull the bottom edge back up and hide the offset).
      animate={{ scale: depthScale(d), y: d * PEEK, opacity: depth >= visible ? 0 : 1 }}
      transition={reduced ? { duration: 0.15 } : springs.layout}
      style={{ transformOrigin: "50% 100%" }}
      className={cn(blockReset, "absolute inset-0", isTop ? "z-10" : "pointer-events-none")}
    >
      <motion.div
        ref={ref}
        data-dragging={dragging ? "" : undefined}
        style={{ x, y: yOut, rotate, scale: boost }}
        className={cn(
          blockReset,
          shell,
          isTop ? cn("touch-pan-y select-none", dragging ? "cursor-grabbing" : "cursor-grab") : "",
          className,
        )}
      >
        {children}
        {/* Cards below the top one are slightly dimmed toward the page background. */}
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ opacity: Math.min(d * 0.14, 0.42) }}
          transition={reduced ? { duration: 0.15 } : springs.layout}
          className={cn(blockReset, "pointer-events-none absolute inset-0 bg-pui-background")}
        />
        {stamps && isTop ? (
          <>
            <Stamp label={likeLabel} side="right" opacity={likeOpacity} />
            <Stamp label={skipLabel} side="left" opacity={skipOpacity} />
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function FlyingCard({
  flying,
  children,
  reduced,
  className,
  onDone,
}: {
  flying: Flying;
  children: React.ReactNode;
  reduced: boolean;
  className?: string;
  onDone: (id: number) => void;
}) {
  const sign = flying.direction === "right" ? 1 : -1;
  const startRotate = reduced ? 0 : Math.max(-18, Math.min(18, flying.x / 20));
  return (
    <motion.div
      aria-hidden="true"
      initial={{ x: flying.x, y: flying.y, rotate: startRotate, opacity: 1 }}
      animate={
        reduced
          ? { opacity: 0 }
          : { x: sign * Math.max(600, Math.abs(flying.x) * 3), y: flying.y + 40, rotate: sign * 28, opacity: 0 }
      }
      transition={
        reduced
          ? { duration: 0.15 }
          : {
              x: { type: "spring", stiffness: 200, damping: 25, velocity: flying.vx },
              y: { type: "spring", stiffness: 200, damping: 25 },
              rotate: { type: "spring", stiffness: 200, damping: 25 },
              opacity: { duration: durations.slow, ease: easings.out, delay: 0.1 },
            }
      }
      onAnimationComplete={() => onDone(flying.id)}
      className={cn(blockReset, shell, "pointer-events-none z-20", className)}
    >
      {children}
    </motion.div>
  );
}

function CardStackInner<T>(
  {
    items,
    renderCard,
    getKey,
    getCardLabel,
    onSwipe,
    onUndo,
    visible = 3,
    swipeThreshold = 100,
    loop = false,
    showControls = true,
    stamps = true,
    emptyState,
    actionsRef,
    cardClassName,
    likeLabel = "Like",
    skipLabel = "Skip",
    undoLabel = "Undo",
    label = "Card stack",
    className,
    onKeyDown,
    ...props
  }: CardStackProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [flying, setFlying] = React.useState<Flying[]>([]);
  const [restored, setRestored] = React.useState<HistoryEntry | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const progress = useMotionValue(0);
  const swipeRef = React.useRef<((direction: CardStackDirection) => void) | null>(null);
  const flyId = React.useRef(0);
  const count = items.length;
  const itemAt = React.useCallback(
    (abs: number): T | undefined => (count === 0 ? undefined : loop ? items[abs % count] : items[abs]),
    [items, count, loop],
  );
  const labelOf = (item: T | undefined, abs: number) =>
    item === undefined ? "" : getCardLabel ? getCardLabel(item) : `Card ${(abs % Math.max(count, 1)) + 1} of ${count}`;
  const latest = useLatestRef({ index, history, itemAt, onSwipe, onUndo, labelOf, likeLabel, skipLabel, undoLabel });

  const commit = React.useCallback(
    (direction: CardStackDirection, x: number, y: number, vx: number) => {
      const { index: abs, itemAt: at, onSwipe: notify, labelOf: name } = latest.current;
      const item = at(abs);
      if (item === undefined) return;
      const id = ++flyId.current;
      progress.set(0);
      setFlying((list) => [...list, { id, abs, direction, x, y, vx }]);
      setHistory((list) => [...list, { abs, direction }]);
      setRestored(null);
      setIndex(abs + 1);
      setAnnouncement(`${direction === "right" ? latest.current.likeLabel : latest.current.skipLabel}: ${name(item, abs)}`);
      notify?.(item, direction, abs);
    },
    [latest, progress],
  );

  const undo = React.useCallback(() => {
    const { history: list, itemAt: at, onUndo: notify, labelOf: name } = latest.current;
    const last = list[list.length - 1];
    if (!last) return;
    setHistory(list.slice(0, -1));
    setFlying((f) => f.filter((card) => card.abs !== last.abs));
    setRestored(last);
    setIndex(last.abs);
    const item = at(last.abs);
    if (item !== undefined) {
      setAnnouncement(`${latest.current.undoLabel}: ${name(item, last.abs)}`);
      notify?.(item, last.abs);
    }
  }, [latest]);

  const swipe = React.useCallback((direction: CardStackDirection) => swipeRef.current?.(direction), []);
  const registerSwipe = React.useCallback((fn: ((direction: CardStackDirection) => void) | null) => {
    swipeRef.current = fn;
  }, []);
  React.useImperativeHandle(actionsRef, () => ({ swipe, undo }), [swipe, undo]);

  const remaining = loop ? (count > 0 ? Infinity : 0) : Math.max(count - index, 0);
  const depthCount = Math.min(Math.max(visible, 1) + 1, remaining);
  const stack = Array.from({ length: depthCount }, (_, depth) => index + depth);
  const empty = remaining === 0;
  const keyOf = (abs: number) => {
    const item = itemAt(abs) as T;
    return `${String(getKey ? getKey(item, abs % Math.max(count, 1)) : abs % Math.max(count, 1))}:${abs}`;
  };
  const topItem = itemAt(index);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight" && !empty) {
      event.preventDefault();
      swipe("right");
    } else if (event.key === "ArrowLeft" && !empty) {
      event.preventDefault();
      swipe("left");
    } else if (event.key === "Backspace" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z")) {
      event.preventDefault();
      undo();
    }
  };

  const controlClass = cn(
    controlReset,
    buttonBase,
    buttonSizes.md,
    "border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm hover:bg-pui-muted",
    focusRing,
    disabledStyles,
  );

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="card stack"
      aria-label={label}
      data-state={empty ? "empty" : "active"}
      {...props}
      className={cn(blockReset, "flex flex-col items-center gap-4", className)}
    >
      <div
        tabIndex={0}
        role="group"
        aria-label={empty ? label : `${labelOf(topItem, index)}. Left or right arrow to swipe.`}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
        // Room for the cards peeking out below the top one.
        style={{ marginBottom: (Math.max(visible, 1) - 1) * PEEK }}
        className={cn(blockReset, "relative isolate grid w-full rounded-pui-xl", focusRing)}
      >
        {/* Sizer: the stage takes the size of the first card's content. */}
        <div aria-hidden="true" className={cn(blockReset, "invisible [grid-area:1/1]")}>
          {count > 0 ? renderCard(items[0] as T, { depth: 0, isTop: true }) : null}
        </div>
        {empty ? (
          <div className={cn(blockReset, "absolute inset-0 flex items-center justify-center [grid-area:1/1]")}>
            {emptyState ?? (
              <div
                className={cn(
                  blockReset,
                  "flex h-full w-full flex-col items-center justify-center gap-1 rounded-pui-xl border border-dashed border-pui-border p-6 text-center",
                )}
              >
                <span className={cn(blockReset, "text-sm font-semibold text-pui-foreground")}>All caught up</span>
                <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{undoLabel} brings the last card back.</span>
              </div>
            )}
          </div>
        ) : null}
        {stack
          .slice()
          .reverse()
          .map((abs) => {
            const depth = abs - index;
            return (
              <StackCard
                key={keyOf(abs)}
                depth={depth}
                visible={Math.max(visible, 1)}
                enterFrom={restored?.abs === abs ? restored.direction : null}
                threshold={swipeThreshold}
                reduced={reduced}
                stamps={stamps}
                likeLabel={likeLabel}
                skipLabel={skipLabel}
                progress={progress}
                className={cardClassName}
                onCommit={commit}
                registerSwipe={registerSwipe}
              >
                {renderCard(itemAt(abs) as T, { depth, isTop: depth === 0 })}
              </StackCard>
            );
          })}
        {flying.map((card) => (
          <FlyingCard
            key={`fly-${card.id}`}
            flying={card}
            reduced={reduced}
            className={cardClassName}
            onDone={(id) => setFlying((list) => list.filter((f) => f.id !== id))}
          >
            {renderCard(itemAt(card.abs) as T, { depth: -1, isTop: false })}
          </FlyingCard>
        ))}
      </div>
      <div className={cn(blockReset, "flex items-center gap-2", showControls ? "" : "sr-only")}>
        <button type="button" className={controlClass} disabled={empty} onClick={() => swipe("left")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-pui-danger-text" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          {skipLabel}
        </button>
        <button type="button" className={controlClass} disabled={history.length === 0} onClick={undo}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
          {undoLabel}
        </button>
        <button type="button" className={controlClass} disabled={empty} onClick={() => swipe("right")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-pui-success-text" fill="currentColor">
            <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.5 1.1 4.2 2.4h2C13.7 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
          </svg>
          {likeLabel}
        </button>
      </div>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
}

/**
 * A swipeable deck for decisions, onboarding or testimonials. Drag the top card with rotate and
 * fling physics, or use the arrow keys and the Skip / Undo / Like buttons; the cards behind
 * promote on a layout spring. Undo throws the last card back in from the side it left.
 */
export const CardStack = React.forwardRef(CardStackInner) as <T>(
  props: CardStackProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement | null;
