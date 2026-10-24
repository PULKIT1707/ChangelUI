"use client";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { cn } from "../lib/cn";
import { useLayer } from "../lib/layers";
import { durations, easings, springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { computePosition, type Rect } from "../lib/position";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { Side } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
export type SpotlightTarget = string | React.RefObject<Element | null> | (() => Element | null);
export interface SpotlightTourStep {
  /** CSS selector, ref or getter for the element to highlight. Missing targets center the card. */
  target?: SpotlightTarget;
  title: React.ReactNode;
  content?: React.ReactNode;
  /** Preferred side for the card; it flips when there is no room. Default "bottom". */
  side?: Side;
  /** Extra space around this target in px. Overrides `padding`. */
  padding?: number;
}
export interface SpotlightTourLabels {
  next: string;
  back: string;
  done: string;
  skip: string;
  /** Default `Step ${n} of ${total}`. */
  progress: (n: number, total: number) => string;
}
export interface SpotlightTourProps {
  steps: readonly SpotlightTourStep[];
  open?: boolean;
  /** Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled step index. */
  step?: number;
  /** Default 0. */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Called when the last step's Done button is pressed (before the tour closes). */
  onFinish?: () => void;
  /** Called when the tour is skipped or dismissed with Escape, with the step it was on. */
  onSkip?: (step: number) => void;
  /** Space around the highlighted element in px. Default 8. */
  padding?: number;
  /** Corner radius of the spotlight in px. Default 12. */
  radius?: number;
  /** Clicking the dimmed area skips the tour. Default false. */
  closeOnOverlayClick?: boolean;
  labels?: Partial<SpotlightTourLabels>;
  /** Class for the step card. */
  className?: string;
  /** Portal target. Default document.body. */
  container?: Element | null;
}
const DEFAULT_LABELS: SpotlightTourLabels = {
  next: "Next",
  back: "Back",
  done: "Done",
  skip: "Skip tour",
  progress: (n, total) => `Step ${n} of ${total}`,
};
function resolveTarget(target: SpotlightTarget | undefined): Element | null {
  if (!target || typeof document === "undefined") return null;
  if (typeof target === "string") return document.querySelector(target);
  if (typeof target === "function") return target();
  return target.current;
}
const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);
/**
 * A guided product tour that dims the page and cuts a soft spotlight around one element at a
 * time. The spotlight glides between targets, the step card follows and flips to stay on screen,
 * and both track scrolling, resizing and layout changes every frame. The card is a labelled dialog
 * with a focus trap, arrow-key navigation, Escape to skip and a polite step announcement.
 */
export function SpotlightTour({
  steps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onFinish,
  onSkip,
  padding = 8,
  radius = 12,
  closeOnOverlayClick = false,
  labels: labelsProp,
  className,
  container,
}: SpotlightTourProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: "open" });
  const [rawStep, setStep] = useControllableState({ value: stepProp, defaultValue: defaultStep, onChange: onStepChange, name: "step" });
  const total = steps.length;
  const index = Math.min(Math.max(rawStep, 0), Math.max(total - 1, 0));
  const current = steps[index];
  const active = open && total > 0;
  return (
    <Portal container={container}>
      <AnimatePresence>
        {active && current ? (
          <TourLayer
            key="tour"
            steps={steps}
            index={index}
            total={total}
            current={current}
            setStep={setStep}
            close={(finished) => {
              if (finished) onFinish?.();
              else onSkip?.(index);
              setOpen(false);
            }}
            padding={current.padding ?? padding}
            radius={radius}
            closeOnOverlayClick={closeOnOverlayClick}
            labels={{ ...DEFAULT_LABELS, ...labelsProp }}
            className={className}
          />
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
interface TourLayerProps {
  steps: readonly SpotlightTourStep[];
  index: number;
  total: number;
  current: SpotlightTourStep;
  setStep: (next: number) => void;
  close: (finished: boolean) => void;
  padding: number;
  radius: number;
  closeOnOverlayClick: boolean;
  labels: SpotlightTourLabels;
  className?: string;
}
function TourLayer({ steps, index, total, current, setStep, close, padding, radius, closeOnOverlayClick, labels, className }: TourLayerProps) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [card, setCard] = React.useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const isPresent = useIsPresent();
  const latest = useLatestRef({ close });
  const { isTopFocusLayer } = useLayer(isPresent, {
    kind: "modal",
    onEscape: () => latest.current.close(false),
    contentEls: () => [cardRef.current],
  });
  useFocusTrap(cardRef, { active: isPresent && isTopFocusLayer, initialFocus: "first" });
  // Bring each target into view, then follow it every frame (scroll, resize and layout shifts).
  React.useEffect(() => {
    const el = resolveTarget(current.target);
    el?.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
    let raf = 0;
    let last: Rect | null = null;
    let lastView = { width: 0, height: 0 };
    const tick = () => {
      const target = resolveTarget(current.target);
      const box = target?.getBoundingClientRect();
      const next = box && (box.width > 0 || box.height > 0) ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
      if (!sameRect(next, last)) {
        last = next;
        setRect(next);
      }
      const view = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
      if (view.width !== lastView.width || view.height !== lastView.height) {
        lastView = view;
        setViewport(view);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [current.target, reduced]);
  React.useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      if (el) setCard({ width: el.offsetWidth, height: el.offsetHeight });
      return;
    }
    const observer = new ResizeObserver(() => setCard({ width: el.offsetWidth, height: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const hole = rect
    ? { x: rect.x - padding, y: rect.y - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null;
  const placed =
    card && viewport.width > 0
      ? hole
        ? computePosition(hole, card, viewport, { side: current.side ?? "bottom", align: "center", sideOffset: 14, collisionPadding: 12 })
        : { x: (viewport.width - card.width) / 2, y: (viewport.height - card.height) / 2 }
      : null;
  const last = index === total - 1;
  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0) return;
    if (next >= total) latest.current.close(true);
    else setStep(next);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable='true']")) return;
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else return;
    event.preventDefault();
  };
  const glide = reduced ? { duration: 0 } : springs.layout;
  const center = { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0 };
  const spot = hole ?? center;
  return (
    <div className={cn(blockReset, "fixed inset-0 z-(--pui-z-overlay)")} data-step={index}>
      {/* Click shield: the page stays visible but inert while the tour runs. */}
      <div
        aria-hidden="true"
        className={cn(blockReset, "absolute inset-0")}
        onPointerDown={(event) => {
          event.preventDefault();
          if (closeOnOverlayClick) close(false);
        }}
      />
      <motion.div
        aria-hidden="true"
        className={cn(blockReset, "pointer-events-none absolute start-0 top-0", hole && "ring-2 ring-pui-primary/70")}
        style={{ borderRadius: hole ? radius : 0, boxShadow: "0 0 0 200vmax var(--color-pui-overlay)" }}
        initial={{ opacity: 0, x: spot.x, y: spot.y, width: spot.width, height: spot.height }}
        animate={{ opacity: 1, x: spot.x, y: spot.y, width: spot.width, height: spot.height }}
        exit={{ opacity: 0, transition: { duration: durations.base, ease: easings.inQuint } }}
        transition={{ ...glide, opacity: { duration: reduced ? 0 : durations.slow } }}
      >
        {hole && !reduced ? (
          <motion.span
            className={cn(blockReset, "absolute -inset-1 block border-2 border-pui-primary")}
            style={{ borderRadius: radius + 4 }}
            animate={{ opacity: [0.55, 0, 0.55], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
      </motion.div>
      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={current.content ? `${id}-body` : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          blockReset,
          "absolute start-0 top-0 w-[min(22rem,calc(100vw-1.5rem))] rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-xl outline-hidden",
          className,
        )}
        style={{ pointerEvents: placed ? undefined : "none" }}
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96, x: placed?.x ?? 0, y: placed?.y ?? 0 }}
        animate={{ opacity: placed ? 1 : 0, scale: 1, x: placed?.x ?? 0, y: placed?.y ?? 0 }}
        exit={{ opacity: 0, scale: reduced ? 1 : 0.97, transition: { duration: durations.fast, ease: easings.inQuint } }}
        transition={{ ...glide, opacity: { duration: reduced ? 0 : durations.base } }}
      >
        <div className={cn(blockReset, "flex items-center justify-between gap-3")}>
          <span className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground tabular-nums")}>{labels.progress(index + 1, total)}</span>
          <span aria-hidden="true" className={cn(blockReset, "flex items-center gap-1")}>
            {steps.map((_, i) => (
              <motion.span
                key={i}
                className={cn(blockReset, "block h-1.5 rounded-pui-full", i === index ? "bg-pui-primary" : i < index ? "bg-pui-primary/40" : "bg-pui-muted")}
                initial={false}
                animate={{ width: i === index ? 16 : 6 }}
                transition={reduced ? { duration: 0 } : springs.snappy}
              />
            ))}
          </span>
        </div>
        <div aria-live="polite" className={cn(blockReset, "mt-2")}>
          <h2 id={`${id}-title`} className={cn(blockReset, "text-base font-semibold leading-snug text-pui-foreground")}>
            {current.title}
          </h2>
          {current.content ? (
            <div id={`${id}-body`} className={cn(blockReset, "mt-1 text-sm leading-relaxed text-pui-muted-foreground")}>
              {current.content}
            </div>
          ) : null}
        </div>
        <div className={cn(blockReset, "mt-4 flex items-center gap-2")}>
          {!last ? (
            <button
              type="button"
              onClick={() => close(false)}
              className={cn(
                controlReset,
                focusRing,
                "me-auto cursor-pointer rounded-pui-sm px-1 text-sm text-pui-muted-foreground underline-offset-4 hover:text-pui-foreground hover:underline",
              )}
            >
              {labels.skip}
            </button>
          ) : (
            <span className={cn(blockReset, "me-auto")} />
          )}
          {index > 0 ? (
            <Button size="sm" variant="outline" tone="neutral" onClick={() => go(-1)}>
              {labels.back}
            </Button>
          ) : null}
          <Button size="sm" data-autofocus onClick={() => go(1)}>
            {last ? labels.done : labels.next}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
