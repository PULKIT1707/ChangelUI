"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface Story {
  id: string;
  /** Accessible title, announced when the story opens. */
  label: string;
  content: React.ReactNode;
  /** Seconds on screen. Defaults to the viewer's duration. */
  duration?: number;
}

export interface StoryViewerProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "children"> {
  stories: readonly Story[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Fires when the last story finishes on its own (not when the user skips past it). */
  onComplete?: () => void;
  /** Seconds per story. Default 6. */
  duration?: number;
  /** Advance on a timer. Default true. */
  autoPlay?: boolean;
  /** Start over after the last story. Default false. */
  loop?: boolean;
  /** Accessible name of the whole viewer. Default "Stories". */
  label?: string;
}

const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role='button'],[role='link'],[tabindex]:not([data-story-stage])";

function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

/**
 * Tap-through stories for announcements, onboarding and release highlights. Segmented progress bars
 * fill on a timer; tap the right side for next and the left for back, press and hold to pause.
 * The timer stops in background tabs, while hovered or focused, and with the pause button.
 */
export const StoryViewer = React.forwardRef<HTMLDivElement, StoryViewerProps>(function StoryViewer(
  {
    stories,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    onComplete,
    duration = 6,
    autoPlay = true,
    loop = false,
    label = "Stories",
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();
  const [rawIndex, setIndex] = useControllableState({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange, name: "StoryViewer index" });
  const count = stories.length;
  const index = Math.min(Math.max(rawIndex, 0), Math.max(count - 1, 0));
  const story = stories[index];
  const [paused, setPaused] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [dir, setDir] = React.useState(1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const fills = React.useRef<(HTMLSpanElement | null)[]>([]);
  const elapsed = React.useRef(0);
  const hold = React.useRef<{ timer?: ReturnType<typeof setTimeout>; long: boolean; x: number }>({ long: false, x: 0 });
  const done = useLatestRef(onComplete);
  const id = React.useId();
  const seconds = story?.duration ?? duration;
  const running = autoPlay && !paused && !held && !hovered && !focused && visible && !finished && count > 0;

  const go = React.useCallback(
    (next: number) => {
      if (count === 0) return;
      const target = loop ? (next + count) % count : Math.min(Math.max(next, 0), count - 1);
      setFinished(false);
      if (target === index) return;
      setDir(target > index ? 1 : -1);
      setIndex(target);
    },
    [count, index, loop, setIndex],
  );

  // Reset the clock for each story.
  React.useEffect(() => {
    elapsed.current = 0;
    fills.current.forEach((fill, i) => {
      if (fill) fill.style.transform = `scaleX(${i < index ? 1 : 0})`;
    });
  }, [index]);

  // Drive the active bar with requestAnimationFrame and direct style writes (no re-render per frame).
  React.useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += Math.min(now - last, 100) / 1000;
      last = now;
      const progress = Math.min(elapsed.current / seconds, 1);
      const fill = fills.current[index];
      if (fill) fill.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        if (index < count - 1 || loop) go(index + 1);
        else {
          setFinished(true);
          done.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, seconds, index, count, loop, go, done]);

  const onStageDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(INTERACTIVE)) return;
    hold.current.long = false;
    hold.current.x = event.clientX;
    hold.current.timer = setTimeout(() => {
      hold.current.long = true;
      setHeld(true);
    }, 220);
  };
  const onStageUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (hold.current.timer === undefined) return;
    clearTimeout(hold.current.timer);
    hold.current.timer = undefined;
    setHeld(false);
    if (hold.current.long) return;
    const box = event.currentTarget.getBoundingClientRect();
    go(hold.current.x - box.left < box.width * 0.33 ? index - 1 : index + 1);
  };
  const cancelHold = () => {
    clearTimeout(hold.current.timer);
    hold.current.timer = undefined;
    setHeld(false);
  };

  // Arrow keys anywhere inside the viewer (a native listener: the region itself is not a control).
  const keyNav = useLatestRef({ go, index, count });
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target as HTMLElement).closest("input,textarea,select")) return;
      const { go: move, index: at, count: total } = keyNav.current;
      if (event.key === "ArrowRight") move(at + 1);
      else if (event.key === "ArrowLeft") move(at - 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(total - 1);
      else return;
      event.preventDefault();
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [keyNav]);

  const state = finished ? "finished" : running ? "playing" : "paused";
  const x = reduced ? 0 : 28 * dir;

  return (
    <div
      ref={refs}
      role="region"
      aria-roledescription="stories"
      aria-label={label}
      data-state={state}
      {...props}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        setHovered(false);
        cancelHold();
      }}
      onFocus={(e) => {
        onFocus?.(e);
        // Keyboard focus pauses (time to read); a mouse click on a control should not.
        if (isFocusVisible(e.target)) setFocused(true);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className={cn(
        blockReset,
        "relative isolate flex aspect-[9/16] w-full max-w-xs flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg",
        className,
      )}
    >
      <div className={cn(blockReset, "absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-pui-surface/90 to-transparent px-3 pt-3 pb-6")}>
        <div className={cn(blockReset, "flex flex-1 gap-1")}>
          {stories.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Story ${i + 1} of ${count}: ${s.label}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => go(i)}
              className={cn(controlReset, focusRing, "group flex h-4 flex-1 cursor-pointer items-center rounded-pui-full")}
            >
              <span className={cn(blockReset, "relative block h-1 w-full overflow-hidden rounded-pui-full bg-pui-foreground/15 transition-[height] group-hover:h-1.5")}>
                <span
                  ref={(el) => {
                    fills.current[i] = el;
                  }}
                  className={cn(blockReset, "absolute inset-0 origin-left rounded-pui-full bg-pui-foreground")}
                  style={{ transform: `scaleX(${i < index || (i === index && finished) ? 1 : 0})` }}
                />
              </span>
            </button>
          ))}
        </div>
        {autoPlay ? (
          <button
            type="button"
            aria-label={paused ? "Play stories" : "Pause stories"}
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pui-full text-pui-foreground hover:bg-pui-foreground/10",
            )}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className={cn(blockReset, "size-3.5")} fill="currentColor">
              {paused ? <path d="M4.5 2.8v10.4L13 8z" /> : <path d="M4 2.5h2.6v11H4zM9.4 2.5H12v11H9.4z" />}
            </svg>
          </button>
        ) : null}
      </div>
      <div
        data-story-stage=""
        className={cn(blockReset, "relative flex-1 cursor-pointer touch-manipulation")}
        onPointerDown={onStageDown}
        onPointerUp={onStageUp}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => hold.current.long && e.preventDefault()}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {story ? (
            <motion.div
              key={story.id}
              id={`${id}-panel`}
              role="group"
              aria-roledescription="story"
              aria-label={`${index + 1} of ${count}: ${story.label}`}
              initial={{ opacity: 0, x, scale: reduced ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -x, scale: reduced ? 1 : 0.98 }}
              transition={reduced ? { duration: 0.12 } : springs.smooth}
              className={cn(blockReset, "absolute inset-0")}
            >
              {story.content}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <p aria-live="polite" className={cn(blockReset, "sr-only")}>
        {story ? `Story ${index + 1} of ${count}: ${story.label}${state === "paused" && autoPlay && paused ? ", paused" : ""}` : ""}
      </p>
    </div>
  );
});
