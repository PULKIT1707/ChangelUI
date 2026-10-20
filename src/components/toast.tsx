"use client";

import { AnimatePresence, motion, useMotionValue, type PanInfo } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { getGlobal } from "../lib/global";
import { CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon, XIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { blockReset, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { IconButton } from "./icon-button";

export type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export type ToasterLayout = "stack" | "list";

export interface ToasterProps extends React.HTMLAttributes<HTMLElement> {
  /** Default "bottom-right". */
  position?: ToastPosition;
  /** Visible toasts; newer ones queue until a slot frees up (their timers start when visible). Default 3. */
  max?: number;
  /** Default lifetime. Default 5000 ms. */
  durationMs?: number;
  /** Default true. */
  showClose?: boolean;
  /** Key that focuses the region; null disables it. Default "F8". */
  hotkey?: string | null;
  /** Region name. Default "Notifications". */
  label?: string;
  /** Close button name. Default "Dismiss notification". */
  closeLabel?: string;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
  /**
   * "stack": a collapsed deck that fans out on hover or focus. "list": a plain column.
   * Reduced motion always uses the list. Default "stack".
   */
  layout?: ToasterLayout;
  /** A hairline under each timed toast shows its remaining lifetime. Default true. */
  showProgress?: boolean;
  /** Gap between toasts in px (expanded stack and list). Default 8. */
  gap?: number;
}

export interface ToastOptions {
  /** Reuse an id to update that toast in place. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Default "neutral". */
  tone?: Tone;
  /** Replaces the tone icon; false hides it. */
  icon?: React.ReactNode | false;
  /** Lifetime; Infinity keeps the toast until dismissed. Default: the Toaster's durationMs. */
  durationMs?: number;
  action?: { label: string; onClick: () => void };
  /** Show the close button and allow swipe dismissal. Default true. */
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
  /** Shows a spinner instead of the icon; the default lifetime becomes Infinity. */
  loading?: boolean;
  /** Per-toast override of the Toaster's showProgress. */
  showProgress?: boolean;
}

/** A message for toast.promise: a title, or full options. */
export type ToastMessage = React.ReactNode | Omit<ToastOptions, "id">;

export interface ToastPromiseMessages<T> {
  loading: ToastMessage;
  success: ToastMessage | ((data: T) => ToastMessage);
  error: ToastMessage | ((error: unknown) => ToastMessage);
  /** Reuse an existing toast id. */
  id?: string;
}

export type ToastRecord = ToastOptions & { id: string; createdAt: number; state: "queued" | "visible" | "dismissed" };

type ToneShortcut = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "tone">) => string;

export interface ToastFunction {
  (input: string | ToastOptions): string;
  success: ToneShortcut;
  warning: ToneShortcut;
  danger: ToneShortcut;
  info: ToneShortcut;
  /** Shows a loading toast (spinner, no timeout) and returns its id. */
  loading: (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "loading">) => string;
  /** Patches a toast in place and restarts its lifetime. Unknown ids are ignored. */
  update: (id: string, patch: Partial<ToastOptions>) => void;
  /**
   * Shows a loading toast, then turns it into a success or danger toast when the promise settles.
   * Returns the original promise. A toast dismissed before it settles stays dismissed.
   */
  promise: <T>(input: Promise<T> | (() => Promise<T>), messages: ToastPromiseMessages<T>) => Promise<T>;
  /** Dismisses one toast, or every toast without an id. Unknown ids are ignored. */
  dismiss: (id?: string) => void;
}

// ---------------------------------------------------------------------------------------------
// Store: a lazily created global singleton (design 5.9), read through useSyncExternalStore.

type InternalToast = ToastRecord & { rev: number };

interface ToastStore {
  toasts: readonly InternalToast[];
  listeners: Set<() => void>;
  counter: number;
  /** Visible slots; 0 until a Toaster mounts, so toasts queue. */
  max: number;
}

const QUEUE_CAP = 100;
const EMPTY: readonly InternalToast[] = [];

const getStore = () =>
  getGlobal<ToastStore>("toast", () => ({ toasts: EMPTY, listeners: new Set(), counter: 0, max: 0 }));

function emit(store: ToastStore): void {
  for (const listener of store.listeners) listener();
}

function promote(store: ToastStore): void {
  let visible = store.toasts.filter((t) => t.state === "visible").length;
  if (store.toasts.every((t) => t.state === "visible" || visible >= store.max)) return;
  store.toasts = store.toasts.map((t) => {
    if (t.state !== "queued" || visible >= store.max) return t;
    visible += 1;
    return { ...t, state: "visible" };
  });
}

function addToast(input: string | ToastOptions): string {
  const options: ToastOptions = typeof input === "string" ? { title: input } : input;
  const store = getStore();
  const id = options.id ?? `pui-toast-${++store.counter}`;
  if (store.toasts.some((t) => t.id === id)) {
    store.toasts = store.toasts.map((t) => (t.id === id ? { ...t, ...options, id, rev: t.rev + 1 } : t));
  } else {
    const record: InternalToast = { ...options, id, createdAt: Date.now(), state: "queued", rev: 0 };
    store.toasts = [...store.toasts, record].slice(-QUEUE_CAP);
  }
  promote(store);
  emit(store);
  return id;
}

function updateToast(id: string, patch: Partial<ToastOptions>): void {
  const store = getStore();
  if (!store.toasts.some((t) => t.id === id)) return;
  store.toasts = store.toasts.map((t) => (t.id === id ? { ...t, ...patch, id, rev: t.rev + 1 } : t));
  emit(store);
}

/** Options when the value is a plain object with a title; anything else is a title. */
function toOptions(message: ToastMessage): Omit<ToastOptions, "id"> {
  if (typeof message === "object" && message !== null && !React.isValidElement(message) && "title" in message) {
    return message;
  }
  return { title: message };
}

function promiseToast<T>(input: Promise<T> | (() => Promise<T>), messages: ToastPromiseMessages<T>): Promise<T> {
  const promise = typeof input === "function" ? input() : input;
  const id = addToast({ ...toOptions(messages.loading), id: messages.id, loading: true });
  // The settled toast drops the loading state: no spinner, the default lifetime, no stale text.
  const settle = (tone: Tone, message: ToastMessage) =>
    updateToast(id, {
      tone,
      loading: false,
      icon: undefined,
      durationMs: undefined,
      description: undefined,
      ...toOptions(message),
    });
  promise.then(
    (data) => settle("success", typeof messages.success === "function" ? messages.success(data) : messages.success),
    (error: unknown) => settle("danger", typeof messages.error === "function" ? messages.error(error) : messages.error),
  );
  return promise;
}

function dismissToast(id?: string): void {
  const store = getStore();
  const removed = store.toasts.filter((t) => id === undefined || t.id === id);
  if (removed.length === 0) return;
  store.toasts = store.toasts.filter((t) => !removed.includes(t));
  promote(store);
  emit(store);
  for (const t of removed) t.onDismiss?.(t.id);
}

function attach(max: number): () => void {
  const store = getStore();
  store.max = Math.max(0, max);
  promote(store);
  emit(store);
  return () => {
    store.max = 0;
  };
}

const subscribe = (listener: () => void) => {
  const { listeners } = getStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => getStore().toasts;
const getServerSnapshot = () => EMPTY;

const shortcut =
  (tone: Tone): ToneShortcut =>
  (title, options) =>
    addToast({ ...options, title, tone });

/** Shows a toast and returns its id. Works before a Toaster mounts (the toast queues). */
export const toast: ToastFunction = Object.assign((input: string | ToastOptions) => addToast(input), {
  success: shortcut("success"),
  warning: shortcut("warning"),
  danger: shortcut("danger"),
  info: shortcut("info"),
  loading: (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "loading">) =>
    addToast({ ...options, title, loading: true }),
  update: updateToast,
  promise: promiseToast,
  dismiss: (id?: string) => dismissToast(id),
});

/** The current toasts plus the toast and dismiss functions. */
export function useToast(): { toasts: readonly ToastRecord[]; toast: ToastFunction; dismiss: (id?: string) => void } {
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { toasts, toast, dismiss: toast.dismiss };
}

// ---------------------------------------------------------------------------------------------
// Toaster

const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-0 left-0 flex-col-reverse",
  "top-center": "top-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "top-right": "top-0 right-0 flex-col-reverse",
  "bottom-left": "bottom-0 left-0",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-0 right-0",
};

function toneIcon(tone: Tone): React.ReactNode {
  switch (tone) {
    case "success":
      return <CircleCheckIcon className="size-4" />;
    case "warning":
      return <TriangleAlertIcon className="size-4" />;
    case "danger":
      return <CircleXIcon className="size-4" />;
    case "info":
      return <InfoIcon className="size-4" />;
    default:
      return null;
  }
}

const subscribeVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};

const CLEAR_MS = 1000;
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 500;
/** Collapsed deck: each toast behind the front peeks out by this many px. */
const PEEK = 10;
const DECK_DEPTH = 3;

/** Where a toast sits in the stacked deck. */
interface Placement {
  /** 0 for the newest (front) toast. */
  index: number;
  count: number;
  y: number;
  scale: number;
  opacity: number;
  height: number | "auto";
}

// Stack-mode anchoring: toasts are absolute inside the list's padding, and a ::before bridge spans
// the gap toward the next toast so moving between expanded toasts never leaves the hover area.
const stackAnchor = {
  top: "absolute inset-x-4 top-4 origin-bottom before:top-full",
  bottom: "absolute inset-x-4 bottom-4 origin-top before:bottom-full",
} as const;
const gapBridge = "before:absolute before:inset-x-0 before:box-border before:h-(--pui-toast-gap) before:content-['']";

function LoadingIcon({ spin }: { spin: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={cn(blockReset, "size-4", spin && "animate-spin")}
    >
      <circle cx="12" cy="12" r="9" opacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

interface ToastItemProps {
  record: InternalToast;
  paused: boolean;
  durationMs: number;
  showClose: boolean;
  showProgress: boolean;
  closeLabel: string;
  fromTop: boolean;
  /** Set in stack layout; null renders the list layout. */
  placement: Placement | null;
  onHeight?: (id: string, height: number | undefined) => void;
}

function ToastItem({
  record,
  paused,
  durationMs,
  showClose,
  showProgress,
  closeLabel,
  fromTop,
  placement,
  onHeight,
}: ToastItemProps) {
  const reduced = usePrefersReducedMotion();
  const { id, rev, tone = "neutral", dismissible = true, loading = false } = record;
  const duration = record.durationMs ?? (loading ? Infinity : durationMs);
  const remainingRef = React.useRef(duration);
  const revRef = React.useRef(-1);
  const chromeRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  // Swipe direction for the exit (-1, 0, 1); read when the exit starts.
  const swipe = useMotionValue(0);

  // Pausing keeps the remaining time; an update in place (new rev) restarts the lifetime.
  React.useEffect(() => {
    if (revRef.current !== rev) {
      revRef.current = rev;
      remainingRef.current = duration;
    }
    if (paused || !Number.isFinite(duration)) return;
    const start = Date.now();
    const timer = window.setTimeout(() => dismissToast(id), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - start));
    };
  }, [paused, duration, rev, id]);

  // Stack layout: report the natural height (content plus the chrome's borders) as it changes.
  // onHeight is the Toaster's stable callback.
  React.useEffect(() => {
    const content = contentRef.current;
    const chrome = chromeRef.current;
    if (!onHeight || !content || !chrome || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      onHeight(id, content.offsetHeight + chrome.offsetHeight - chrome.clientHeight);
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      onHeight(id, undefined);
    };
  }, [onHeight, id]);

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      swipe.set(Math.sign(info.offset.x || info.velocity.x));
      dismissToast(id);
    }
  };

  const icon = loading ? (
    <LoadingIcon spin={!reduced} />
  ) : record.icon === false ? null : (
    (record.icon ?? toneIcon(tone))
  );
  const enter = reduced ? { opacity: 0 } : { opacity: 0, y: fromTop ? -16 : 16, scale: 0.95 };
  const animate = placement
    ? { opacity: placement.opacity, y: placement.y, scale: placement.scale, height: placement.height }
    : { opacity: 1, y: 0, scale: 1 };
  // Resolved when the exit starts: a swiped toast flies out the way it was thrown.
  const exitVariant = () => {
    if (reduced) return { opacity: 0, transition: { duration: 0.15 } };
    const direction = swipe.get();
    return direction
      ? { x: `${direction * 110}%`, opacity: 0, transition: { duration: 0.2, ease: easings.out } }
      : { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: easings.inQuint } };
  };
  const progress = showProgress && !reduced && Number.isFinite(duration);

  return (
    <motion.li
      layout={!placement && !reduced}
      data-pui-toast-id={id}
      data-pui-toast-rev={rev}
      data-tone={tone}
      data-index={placement?.index}
      data-front={placement?.index === 0 ? "" : undefined}
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      initial={enter}
      animate={animate}
      exit="exit"
      variants={{ exit: exitVariant }}
      transition={reduced ? { duration: 0.15 } : springs.smooth}
      style={placement ? { zIndex: placement.count - placement.index } : undefined}
      drag={dismissible ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={dismissible ? onDragEnd : undefined}
      className={cn(
        blockReset,
        "pointer-events-auto touch-pan-y",
        placement ? [stackAnchor[fromTop ? "top" : "bottom"], gapBridge] : "relative w-full",
        toneClasses[tone],
      )}
    >
      <div
        ref={chromeRef}
        className={cn(
          blockReset,
          "relative h-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) text-sm text-pui-surface-foreground shadow-pui-lg",
        )}
      >
        <div ref={contentRef} className={cn(blockReset, "flex items-start gap-3 p-4 pe-10")}>
          {icon ? (
            <span aria-hidden="true" className={cn(blockReset, "mt-0.5 inline-flex shrink-0 text-(--pui-tone-text)")}>
              {icon}
            </span>
          ) : null}
          <div className={cn(blockReset, "min-w-0 flex-1")}>
            <div data-pui-toast-title="" className={cn(blockReset, "font-medium leading-snug")}>
              {record.title}
            </div>
            {record.description ? (
              <div data-pui-toast-description="" className={cn(blockReset, "mt-0.5 leading-snug text-pui-muted-foreground")}>
                {record.description}
              </div>
            ) : null}
            {record.action ? (
              <Button
                size="sm"
                variant="outline"
                tone="neutral"
                className="mt-3"
                onClick={() => {
                  record.action?.onClick();
                  dismissToast(id);
                }}
              >
                {record.action.label}
              </Button>
            ) : null}
          </div>
        </div>
        {showClose && dismissible ? (
          <IconButton aria-label={closeLabel} size="sm" className="absolute right-2 top-2" onClick={() => dismissToast(id)}>
            <XIcon className="size-4" />
          </IconButton>
        ) : null}
        {progress ? (
          <span
            key={rev}
            aria-hidden="true"
            data-pui-toast-progress=""
            className={cn(
              blockReset,
              "absolute inset-x-0 bottom-0 block h-0.5 origin-left bg-(--pui-tone)/45 animate-pui-toast-progress",
            )}
            style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }}
          />
        ) : null}
      </div>
    </motion.li>
  );
}

/**
 * Renders the toast queue (design 7.1 #28): a labelled region with a list of toasts, two persistent
 * live regions for announcements, pause on hover / focus / hidden tab, an F8 hotkey and swipe dismissal.
 */
export const Toaster = React.forwardRef<HTMLElement, ToasterProps>(function Toaster(
  {
    position = "bottom-right",
    max = 3,
    durationMs = 5000,
    showClose = true,
    hotkey = "F8",
    label = "Notifications",
    closeLabel = "Dismiss notification",
    container,
    layout = "stack",
    showProgress = true,
    gap = 8,
    className,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = React.useMemo(() => toasts.filter((t) => t.state === "visible"), [toasts]);
  const [hovered, setHovered] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const documentHidden = React.useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const paused = hovered || focusWithin || documentHidden;
  const expanded = hovered || focusWithin;
  const stacked = layout === "stack" && !reduced;
  const [heights, setHeights] = React.useState<Readonly<Record<string, number>>>({});
  const onHeight = React.useCallback((id: string, height: number | undefined) => {
    setHeights((prev) => {
      if (prev[id] === height) return prev;
      const next = { ...prev };
      if (height === undefined) delete next[id];
      else next[id] = height;
      return next;
    });
  }, []);

  const sectionRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLOListElement>(null);
  const politeRef = React.useRef<HTMLDivElement>(null);
  const assertiveRef = React.useRef<HTMLDivElement>(null);
  const announcer = React.useRef({ seen: new Set<string>(), polite: 0, assertive: 0 });
  const mergedRef = React.useMemo(() => mergeRefs(sectionRef, ref), [ref]);

  useIsomorphicLayoutEffect(() => attach(max), [max]);

  React.useEffect(() => {
    if (!hotkey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== hotkey) return;
      event.preventDefault();
      sectionRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hotkey]);

  React.useEffect(() => {
    const state = announcer.current;
    return () => {
      window.clearTimeout(state.polite);
      window.clearTimeout(state.assertive);
    };
  }, []);

  // One rAF after toasts become visible: read the rendered text and write it into the live regions.
  const visibleKey = visible.map((t) => `${t.id}:${t.rev}`).join("|");
  React.useEffect(() => {
    if (!visibleKey) return;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const state = announcer.current;
      const polite: string[] = [];
      const assertive: string[] = [];
      for (const li of list.querySelectorAll<HTMLElement>("[data-pui-toast-id]")) {
        const key = `${li.dataset.puiToastId ?? ""}:${li.dataset.puiToastRev ?? ""}`;
        if (state.seen.has(key)) continue;
        state.seen.add(key);
        const title = li.querySelector("[data-pui-toast-title]")?.textContent?.trim() ?? "";
        const description = li.querySelector("[data-pui-toast-description]")?.textContent?.trim() ?? "";
        const text = description ? `${title}. ${description}` : title;
        if (text) (li.dataset.tone === "danger" ? assertive : polite).push(text);
      }
      const write = (region: HTMLDivElement | null, parts: string[], slot: "polite" | "assertive") => {
        if (!region || parts.length === 0) return;
        window.clearTimeout(state[slot]);
        region.textContent = parts.join(" ");
        state[slot] = window.setTimeout(() => {
          region.textContent = "";
        }, CLEAR_MS);
      };
      write(politeRef.current, polite, "polite");
      write(assertiveRef.current, assertive, "assertive");
    });
    return () => cancelAnimationFrame(frame);
  }, [visibleKey]);

  const fromTop = position.startsWith("top");
  // Stack placement, newest first: collapsed toasts peek behind the front one at its height;
  // expanded toasts sit at their natural heights, one gap apart.
  const placements = new Map<string, Placement>();
  if (stacked) {
    const direction = fromTop ? 1 : -1;
    const count = visible.length;
    const frontHeight = heights[visible[count - 1]?.id ?? ""];
    let offset = 0;
    for (let index = 0; index < count; index++) {
      const record = visible[count - 1 - index] as InternalToast;
      const height = heights[record.id];
      placements.set(
        record.id,
        expanded
          ? { index, count, y: direction * (offset + gap * index), scale: 1, opacity: 1, height: height ?? "auto" }
          : {
              index,
              count,
              y: direction * index * PEEK,
              scale: 1 - index * 0.05,
              opacity: index < DECK_DEPTH ? 1 : 0,
              height: (index === 0 ? height : (frontHeight ?? height)) ?? "auto",
            },
      );
      offset += height ?? 0;
    }
  }
  return (
    <Portal container={container}>
      <section
        ref={mergedRef}
        aria-label={hotkey ? `${label} (${hotkey})` : label}
        tabIndex={-1}
        data-position={position}
        {...props}
        onFocus={(event) => {
          onFocus?.(event);
          setFocusWithin(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          const next = event.relatedTarget;
          if (!(next instanceof Node) || !event.currentTarget.contains(next)) setFocusWithin(false);
        }}
        className={cn(blockReset, "outline-hidden", className)}
      >
        <ol
          ref={listRef}
          data-layout={stacked ? "stack" : "list"}
          data-expanded={stacked && expanded ? "" : undefined}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          style={{ "--pui-toast-gap": `${gap}px` } as React.CSSProperties}
          className={cn(
            listReset,
            // The list never takes pointer input (each toast opts back in), so its padding and gaps
            // do not block page or modal content beneath it.
            "pointer-events-none fixed z-(--pui-z-toast) w-full max-w-sm p-4",
            stacked ? "block" : "flex flex-col gap-(--pui-toast-gap)",
            positionClasses[position],
          )}
        >
          <AnimatePresence initial={false}>
            {visible.map((record) => (
              <ToastItem
                key={record.id}
                record={record}
                paused={paused}
                durationMs={durationMs}
                showClose={showClose}
                showProgress={record.showProgress ?? showProgress}
                closeLabel={closeLabel}
                fromTop={fromTop}
                placement={placements.get(record.id) ?? null}
                onHeight={stacked ? onHeight : undefined}
              />
            ))}
          </AnimatePresence>
        </ol>
        <div ref={politeRef} role="status" aria-live="polite" aria-atomic="true" className={cn(blockReset, "sr-only")} />
        <div ref={assertiveRef} role="alert" aria-live="assertive" aria-atomic="true" className={cn(blockReset, "sr-only")} />
      </section>
    </Portal>
  );
});
