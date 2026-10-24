"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ChatScrollerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The messages, oldest first. Give each a stable key: new keys at the end count as unread, new keys at the start are older history. */
  children?: React.ReactNode;
  /** Accessible name of the scroll region. Default "Conversation". */
  "aria-label"?: string;
  /** Distance from the bottom (px) that still counts as "at the bottom". Default 48. */
  threshold?: number;
  /** Start at the bottom (default) or the top. */
  initialScroll?: "bottom" | "top";
  /** Changing it jumps to the latest and sticks again, e.g. the id of the message the person just sent. */
  scrollKey?: React.Key;
  /** Called near the top so you can prepend older messages; the view stays where it is when they land. */
  onLoadOlder?: () => void;
  /** Shows a loading row at the top and pauses `onLoadOlder`. */
  loadingOlder?: boolean;
  /** No older history: hides the loading row and stops `onLoadOlder`. */
  hasOlder?: boolean;
  /** Content of the top row when there's no more history. */
  startOfHistory?: React.ReactNode;
  /** Called when following the latest turns on or off. */
  onStickChange?: (stuck: boolean) => void;
  /** Pill text. Default: "N new messages" or "Jump to latest". */
  jumpLabel?: (unread: number) => React.ReactNode;
  /** Classes for the scrolling viewport (the wrapper gets `className`). */
  viewportClassName?: string;
  /** Classes for the content column inside the viewport. */
  contentClassName?: string;
}

const keysOf = (children: React.ReactNode): React.Key[] =>
  React.Children.toArray(children).map((child, i) => (React.isValidElement(child) && child.key !== null ? child.key : `#${i}`));

const defaultJumpLabel = (unread: number): React.ReactNode =>
  unread > 0 ? `${unread} new ${unread === 1 ? "message" : "messages"}` : "Jump to latest";

/**
 * Chat viewport that behaves: it follows new messages and streaming tokens only while you're at
 * the bottom, lets you read history without being yanked down, shows a "3 new messages" pill
 * that jumps back, and keeps your place when older messages are prepended (with an optional
 * load-older trigger at the top). Works with any message markup; no virtualization library.
 * The ref goes to the scrolling viewport.
 */
export const ChatScroller = React.forwardRef<HTMLDivElement, ChatScrollerProps>(function ChatScroller(
  {
    children,
    "aria-label": ariaLabel = "Conversation",
    threshold = 48,
    initialScroll = "bottom",
    scrollKey,
    onLoadOlder,
    loadingOlder = false,
    hasOlder = false,
    startOfHistory,
    onStickChange,
    jumpLabel = defaultJumpLabel,
    className,
    viewportClassName,
    contentClassName,
    onScroll,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const viewport = React.useRef<HTMLDivElement | null>(null);
  const content = React.useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = React.useState(initialScroll === "bottom");
  const [unread, setUnread] = React.useState(0);
  const stuckRef = React.useRef(stuck);
  const lastHeight = React.useRef(0);
  const lastKeys = React.useRef<React.Key[] | null>(null);
  const programmatic = React.useRef(false);
  const onStickChangeRef = useLatestRef(onStickChange);
  const older = useLatestRef({ onLoadOlder, loadingOlder, hasOlder });

  const keys = keysOf(children);

  const setStuckBoth = React.useCallback(
    (next: boolean) => {
      if (stuckRef.current === next) return;
      stuckRef.current = next;
      setStuck(next);
      if (next) setUnread(0);
      onStickChangeRef.current?.(next);
    },
    [onStickChangeRef],
  );

  const toBottom = React.useCallback(
    (smooth: boolean) => {
      const el = viewport.current;
      if (!el) return;
      if (smooth && typeof el.scrollTo === "function") {
        // A smooth jump passes through "not at bottom" positions; ignore those until it lands.
        programmatic.current = true;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else el.scrollTop = el.scrollHeight;
      lastHeight.current = el.scrollHeight;
    },
    [],
  );

  const setViewport = React.useCallback(
    (el: HTMLDivElement | null) => {
      viewport.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // Initial position, before paint.
  useIsomorphicLayoutEffect(() => {
    if (initialScroll === "bottom") toBottom(false);
    lastHeight.current = viewport.current?.scrollHeight ?? 0;
  }, []);

  // After every commit: anchor prepends, follow appends, count unread.
  const keySig = keys.join("\u0000");
  useIsomorphicLayoutEffect(() => {
    const el = viewport.current;
    const prev = lastKeys.current;
    lastKeys.current = keys;
    if (!el || !prev) return;
    const height = el.scrollHeight;
    const firstPrev = prev[0];
    const prepended = firstPrev !== undefined && keys[0] !== firstPrev && keys.includes(firstPrev);
    if (prepended) {
      el.scrollTop += height - lastHeight.current;
      lastHeight.current = height;
      return;
    }
    if (stuckRef.current) {
      toBottom(false);
      return;
    }
    const lastPrev = prev[prev.length - 1];
    const tailFrom = lastPrev === undefined ? 0 : keys.lastIndexOf(lastPrev) + 1;
    const appended = tailFrom > 0 || prev.length === 0 ? keys.length - tailFrom : 0;
    if (appended > 0) setUnread((n) => n + appended);
    lastHeight.current = height;
  }, [keySig]);

  // Content that grows without new keys (streaming tokens, images loading).
  React.useEffect(() => {
    const el = content.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const vp = viewport.current;
      if (!vp) return;
      if (stuckRef.current) toBottom(false);
      lastHeight.current = vp.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [toBottom]);

  // Jump on scrollKey change (skip the first render).
  const lastScrollKey = React.useRef(scrollKey);
  const reducedRef = useLatestRef(reduced);
  React.useEffect(() => {
    if (Object.is(lastScrollKey.current, scrollKey)) return;
    lastScrollKey.current = scrollKey;
    setStuckBoth(true);
    toBottom(!reducedRef.current);
  }, [scrollKey, setStuckBoth, toBottom, reducedRef]);

  // A wheel, touch or key scroll by the person always wins over a pending smooth jump.
  React.useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const userIntent = () => {
      programmatic.current = false;
    };
    const events = ["wheel", "touchstart", "keydown"] as const;
    for (const type of events) el.addEventListener(type, userIntent, { passive: true });
    return () => {
      for (const type of events) el.removeEventListener(type, userIntent);
    };
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(event);
    const el = event.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= threshold;
    if (programmatic.current) {
      // Ignore the scroll events our own jump produces until it lands.
      if (atBottom) programmatic.current = false;
      if (!atBottom) return;
    }
    setStuckBoth(atBottom);
    lastHeight.current = el.scrollHeight;
    const o = older.current;
    if (o.onLoadOlder && o.hasOlder && !o.loadingOlder && el.scrollTop <= 80) o.onLoadOlder();
  };

  const showTop = loadingOlder || (!hasOlder && startOfHistory !== undefined);

  return (
    <div {...props} className={cn(blockReset, "relative flex min-h-0 flex-col", className)}>
      <div
        ref={setViewport}
        role="log"
        aria-label={ariaLabel}
        aria-relevant="additions"
        // Focusable so keyboard users can scroll the history.
        tabIndex={keys.length > 0 ? 0 : undefined}
        onScroll={handleScroll}
        data-stuck={stuck ? "" : undefined}
        className={cn(blockReset, focusRing, "min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] focus-visible:outline-offset-[-2px]", viewportClassName)}
      >
        <div ref={content} className={cn(blockReset, "flex min-h-full flex-col", contentClassName)}>
          {showTop ? (
            <div className={cn(blockReset, "flex justify-center py-2 text-xs text-pui-muted-foreground")}>
              {loadingOlder ? (
                <span role="status" className={cn(blockReset, "inline-flex items-center gap-2")}>
                  <span aria-hidden="true" className={cn(blockReset, "inline-block size-3 rounded-pui-full border-[1.5px] border-current border-t-transparent motion-safe:animate-spin")} />
                  Loading earlier messages…
                </span>
              ) : (
                startOfHistory
              )}
            </div>
          ) : null}
          {children}
        </div>
      </div>
      <AnimatePresence>
        {!stuck ? (
          <motion.div
            key="jump"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={reduced ? { duration: durations.fast } : springs.snappy}
            className={cn(blockReset, "pointer-events-none absolute inset-x-0 bottom-3 z-1 flex justify-center")}
          >
            <button
              type="button"
              onClick={() => {
                setStuckBoth(true);
                toBottom(!reduced);
                viewport.current?.focus({ preventScroll: true });
              }}
              className={cn(
                controlReset,
                focusRing,
                "pointer-events-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-pui-full border border-pui-border bg-pui-surface/95 ps-3 pe-3.5 text-xs font-medium text-pui-foreground shadow-pui-md backdrop-blur-sm transition-colors hover:bg-pui-muted",
                unread > 0 && "border-pui-primary/30 text-pui-primary-text",
              )}
            >
              <ChevronDownIcon className="size-3.5" />
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={unread}
                  initial={reduced ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: durations.fast, ease: easings.out }}
                  className={cn(blockReset, "tabular-nums")}
                >
                  {jumpLabel(unread)}
                </motion.span>
              </AnimatePresence>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
