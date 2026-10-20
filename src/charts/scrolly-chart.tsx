"use client";
// ScrollyChart: scrollytelling. Prose steps scroll past a sticky graphic; the step crossing the
// trigger line becomes active and its `state` is handed to `render`, so the chart inside tweens
// between states with its own update animation. "progress" mode also reports how far the reader
// is through the active step (0..1) for scrubbed transitions. Never autoplays.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
const instant: Transition = { duration: 0 };
export interface ScrollyStep<S> {
  id: string;
  /** The prose for this step. */
  content: React.ReactNode;
  /** Chart state while this step is active. */
  state: S;
  /** Short name for the step rail (default: "Step N"). */
  label?: string;
}
export interface ScrollyRenderContext {
  /** Active step index. */
  index: number;
  id: string;
  /** Progress through the active step, 0..1 (mode="progress"; always 0 in step mode). */
  progress: number;
  /** Progress through the whole story, 0..1. */
  total: number;
  reducedMotion: boolean;
}
export interface ScrollyChartProps<S> extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  steps: readonly ScrollyStep<S>[];
  /** The sticky graphic for the active state. */
  render: (state: S, ctx: ScrollyRenderContext) => React.ReactNode;
  /** Where the trigger line sits, as a fraction of the viewport (or scroll box) height. Default 0.5. */
  offset?: number;
  /** "step" switches at each step; "progress" also reports progress within it. Default "step". */
  mode?: "step" | "progress";
  /** Side of the sticky graphic on wide layouts. Default "right". */
  side?: "left" | "right";
  /**
   * Make the component its own scroll box of this height (px), e.g. inside a card or a docs page.
   * Default: the page scrolls.
   */
  height?: number;
  /** Graphic width share on wide layouts, 0.3..0.75. Default 0.58. */
  graphicShare?: number;
  /** Clickable step rail beside the graphic (jump to a step). Default true. */
  rail?: boolean;
  /** Controlled active step. */
  activeStep?: number;
  onStepChange?: (index: number, step: ScrollyStep<S>) => void;
}
function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ScrollyChartInner<S>(
  { steps, render, offset = 0.5, mode = "step", side = "right", height, graphicShare = 0.58, rail = true, activeStep, onStepChange, className, style, ...rest }: ScrollyChartProps<S>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLElement | null>(null);
  const stepRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [internal, setInternal] = React.useState(0);
  const [progress, setProgress] = React.useState({ step: 0, total: 0 });
  const active = Math.max(0, Math.min(steps.length - 1, activeStep ?? internal));
  const latest = React.useRef({ active, onStepChange, steps });
  latest.current = { active, onStepChange, steps };
  const setRef = React.useCallback(
    (el: HTMLElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  const own = height !== undefined;
  const at = clamp01(offset);

  // One rAF-throttled scroll handler: the active step is the last one whose top passed the trigger
  // line (robust to fast flings, unlike per-step enter events), and progress is measured in px.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const target: HTMLElement | Window = own ? root : window;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = own ? root.getBoundingClientRect() : { top: 0, height: window.innerHeight };
      const line = box.top + box.height * at;
      let index = 0;
      let within = 0;
      const els = stepRefs.current;
      for (let i = 0; i < latest.current.steps.length; i++) {
        const el = els[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line) {
          index = i;
          within = r.height ? clamp01((line - r.top) / r.height) : 0;
        }
      }
      const first = els[0]?.getBoundingClientRect();
      const last = els[latest.current.steps.length - 1]?.getBoundingClientRect();
      const total = first && last ? clamp01((line - first.top) / Math.max(1, last.bottom - first.top)) : 0;
      setProgress((p) => (p.step === within && p.total === total ? p : { step: within, total }));
      if (index !== latest.current.active) {
        setInternal(index);
        const step = latest.current.steps[index];
        if (step) latest.current.onStepChange?.(index, step);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [own, at]);

  const jump = (i: number) => {
    const el = stepRefs.current[i];
    const root = rootRef.current;
    if (!el || !root) return;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
    if (own) {
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - root.clientHeight * at + 24;
      root.scrollTo({ top, behavior });
    } else {
      el.scrollIntoView({ behavior, block: "center" });
    }
    // Move focus to the step so the next Tab continues from the story, not the rail.
    el.focus({ preventScroll: true });
  };

  const step = steps[active];
  const ctx: ScrollyRenderContext = { index: active, id: step?.id ?? "", progress: mode === "progress" ? progress.step : 0, total: progress.total, reducedMotion };
  const share = Math.max(0.3, Math.min(0.75, graphicShare));
  const viewport = own ? `${height}px` : "100vh";
  const graphic = (
    <div
      className={cn(blockReset, "sticky z-0 flex flex-col justify-center gap-3")}
      style={{ top: own ? 0 : `calc(${viewport} * 0.08)`, height: own ? viewport : `calc(${viewport} * 0.84)` }}
    >
      <div className={cn(blockReset, "flex items-center justify-between gap-3")}>
        {rail ? (
          <ol aria-label="Story steps" className={cn(listReset, "flex items-center gap-1.5")}>
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={i === active ? "step" : undefined}
                  aria-label={s.label ?? `Step ${i + 1}`}
                  title={s.label ?? `Step ${i + 1}`}
                  onClick={() => jump(i)}
                  className={cn(controlReset, focusRing, "relative flex h-5 items-center rounded-pui-full px-0.5")}
                >
                  <motion.span
                    aria-hidden="true"
                    initial={false}
                    animate={{ width: i === active ? 22 : 8 }}
                    transition={reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 32 }}
                    className={cn(blockReset, "block h-2 rounded-pui-full", i === active ? "bg-pui-primary" : i < active ? "bg-pui-primary/45" : "bg-pui-muted-foreground/30")}
                  />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <span />
        )}
        <span className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")} aria-hidden="true">
          {active + 1} / {steps.length}
        </span>
      </div>
      <div className={cn(blockReset, "relative min-h-0 w-full")}>{step ? render(step.state, ctx) : null}</div>
      <div aria-hidden="true" className={cn(blockReset, "h-0.5 w-full overflow-hidden rounded-pui-full bg-pui-muted")}>
        <div className={cn(blockReset, "h-full rounded-pui-full bg-pui-primary/70")} style={{ width: `${progress.total * 100}%` }} />
      </div>
    </div>
  );
  const prose = (
    <ol className={cn(listReset, "relative z-10 flex flex-col")} aria-label="Story">
      <li aria-hidden="true" style={{ height: `calc(${viewport} * ${at * 0.8})` }} />
      {steps.map((s, i) => {
        const on = i === active;
        return (
          <li
            key={s.id}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            tabIndex={-1}
            aria-current={on ? "step" : undefined}
            className={cn(blockReset, "flex outline-none")}
            style={{ minHeight: `calc(${viewport} * 0.7)` }}
          >
            <motion.div
              initial={false}
              animate={{ opacity: on ? 1 : 0.35, y: on ? 0 : 12, scale: on ? 1 : 0.985 }}
              transition={reducedMotion ? instant : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                blockReset,
                "my-auto w-full rounded-pui-lg border bg-pui-background/90 p-4 text-sm leading-relaxed shadow-pui-sm backdrop-blur-sm transition-colors duration-300",
                on ? "border-pui-primary/40" : "border-pui-border",
              )}
            >
              {s.content}
            </motion.div>
          </li>
        );
      })}
      <li aria-hidden="true" style={{ height: `calc(${viewport} * ${(1 - at) * 0.8})` }} />
    </ol>
  );
  return (
    <section
      ref={setRef}
      aria-roledescription="scrollytelling"
      {...rest}
      className={cn(blockReset, "relative w-full text-pui-foreground", own ? "overflow-y-auto overscroll-contain" : "", className)}
      style={{ ...(own ? { height } : null), ...style }}
    >
      {/* Narrow: graphic sticky on top with the steps scrolling over it. Wide: side by side. */}
      <div
        className={cn(blockReset, "grid gap-6 px-1 max-md:!grid-cols-1")}
        style={{ gridTemplateColumns: side === "right" ? `minmax(0, ${1 - share}fr) minmax(0, ${share}fr)` : `minmax(0, ${share}fr) minmax(0, ${1 - share}fr)` }}
      >
        <div className={cn(blockReset, "relative z-10 min-w-0 max-md:col-start-1 max-md:row-start-1", side === "right" ? "md:order-1" : "md:order-2")}>{prose}</div>
        <div className={cn(blockReset, "min-w-0 max-md:col-start-1 max-md:row-start-1", side === "right" ? "md:order-2" : "md:order-1")}>{graphic}</div>
      </div>
    </section>
  );
}
/**
 * Scrollytelling: prose steps drive a sticky chart's state (data, domain, highlight, annotations),
 * the chart tweens between states, and a step rail jumps around the story.
 */
export const ScrollyChart = React.forwardRef(ScrollyChartInner) as (<S>(props: ScrollyChartProps<S> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
ScrollyChart.displayName = "ScrollyChart";
