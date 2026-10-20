"use client";
import { AnimatePresence, motion, useIsPresent, type Transition, type Variants } from "motion/react";
import * as React from "react";
import { useViewTransition } from "../hooks/use-view-transition";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { cssEasing, durations, easings, springs } from "../hooks/motion-presets";
import { blockReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type PageTransitionPreset = "fade" | "slide" | "scale" | "blur" | "flip" | "wipe" | "curtain" | "view";
export type PageTransitionDirection = "auto" | "forward" | "back";
export type PageTransitionMode = "wait" | "popLayout" | "sync";

export interface PageTransitionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Identifies the page (a pathname, a step id). A new key plays the transition. */
  routeKey: string | number;
  /** The current page. */
  children?: React.ReactNode;
  /** Default "slide". "view" uses the View Transitions API and falls back to "fade" elsewhere. */
  preset?: PageTransitionPreset;
  /**
   * "auto" picks back when the new key is the page you came from (or a lower `order`), otherwise
   * forward. Default "auto".
   */
  direction?: PageTransitionDirection;
  /** Position of this page in a sequence (tabs, steps). With direction="auto" it decides the direction. */
  order?: number;
  /** Axis for slide, flip and wipe. Default "x". */
  axis?: "x" | "y";
  /** Slide travel in px. Default 24. */
  distance?: number;
  /**
   * How old and new pages overlap. Default "wait" ("popLayout" for wipe, so the new page wipes
   * over the old one). Curtain always waits.
   */
  mode?: PageTransitionMode;
  /** Move focus to the new page's h1 (true) or the first match of a selector. Default false. */
  focusOnChange?: boolean | string;
  /** Class for each page layer, e.g. a background so wipe/popLayout pages cover each other. */
  layerClassName?: string;
  /** Class for the curtain panel (default: the foreground color with a primary edge). */
  curtainClassName?: string;
  /** Called when the old page has left. */
  onExitComplete?: () => void;
}

type Dir = 1 | -1;

interface NavState {
  key: string | number;
  firstKey: string | number;
  order: number | undefined;
  history: Array<string | number>;
  direction: Dir;
  count: number;
}

function nextNav(nav: NavState, key: string | number, order: number | undefined, direction: PageTransitionDirection): NavState {
  const cameBack = nav.history.length > 1 && nav.history[nav.history.length - 2] === key;
  const history = cameBack ? nav.history.slice(0, -1) : [...nav.history, key].slice(-50);
  let dir: Dir;
  if (direction === "forward") dir = 1;
  else if (direction === "back") dir = -1;
  else if (order !== undefined && nav.order !== undefined && order !== nav.order) dir = order > nav.order ? 1 : -1;
  else dir = cameBack ? -1 : 1;
  return { key, firstKey: nav.firstKey, order, history, direction: dir, count: nav.count + 1 };
}

const exitTween: Transition = { duration: durations.fast, ease: easings.inQuint };

function axisOffset(axis: "x" | "y", value: number) {
  return axis === "x" ? { x: value } : { y: value };
}

function wipeInset(axis: "x" | "y", dir: number): string {
  // inset(top right bottom left): reveal from the edge the new page travels in from.
  if (axis === "x") return dir > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
  return dir > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";
}

function layerVariants(preset: PageTransitionPreset, axis: "x" | "y", distance: number, reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.15 } },
    };
  }
  switch (preset) {
    case "slide":
      return {
        hidden: (dir: Dir) => ({ opacity: 0, ...axisOffset(axis, dir * distance) }),
        visible: { opacity: 1, x: 0, y: 0, transition: { ...springs.layout, opacity: { duration: durations.base } } },
        exit: (dir: Dir) => ({ opacity: 0, ...axisOffset(axis, -dir * distance * 0.5), transition: exitTween }),
      };
    case "scale":
      return {
        hidden: (dir: Dir) => ({ opacity: 0, scale: dir > 0 ? 0.94 : 1.04 }),
        visible: { opacity: 1, scale: 1, transition: { ...springs.layout, opacity: { duration: durations.base } } },
        exit: (dir: Dir) => ({ opacity: 0, scale: dir > 0 ? 1.03 : 0.97, transition: exitTween }),
      };
    case "blur":
      return {
        hidden: { opacity: 0, scale: 0.985, filter: "blur(12px)" },
        // transitionEnd drops the filter so it doesn't become a containing block for fixed children.
        visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: easings.out }, transitionEnd: { filter: "none" } },
        exit: { opacity: 0, filter: "blur(8px)", transition: { duration: 0.16, ease: easings.inQuint } },
      };
    case "flip": {
      // rotateX turns the other way for the same visual direction.
      const turn = (deg: number) => (axis === "x" ? { rotateY: deg } : { rotateX: -deg });
      return {
        hidden: (dir: Dir) => ({ opacity: 0, scale: 0.96, ...turn(dir * 70) }),
        visible: { opacity: 1, rotateX: 0, rotateY: 0, scale: 1, transition: { ...springs.smooth, opacity: { duration: durations.base } } },
        exit: (dir: Dir) => ({ opacity: 0, scale: 0.96, ...turn(-dir * 70), transition: { duration: 0.2, ease: easings.inQuint } }),
      };
    }
    case "wipe":
      return {
        hidden: (dir: Dir) => ({ clipPath: wipeInset(axis, dir), opacity: 1 }),
        visible: {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.55, ease: easings.emphasized },
          transitionEnd: { clipPath: "none" },
        },
        // The old page drifts back and dims while the new one wipes over it.
        exit: (dir: Dir) => ({
          opacity: 0.4,
          ...axisOffset(axis, -dir * distance),
          transition: { duration: 0.55, ease: easings.emphasized },
        }),
      };
    case "curtain":
      // The layer holds still; its curtain panels and content wrapper carry the motion.
      return { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } };
    case "view":
    case "fade":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: durations.slow, ease: easings.out } },
        exit: { opacity: 0, transition: exitTween },
      };
  }
}

// Curtain: covers from the bottom on exit, uncovers toward the top on enter (0.45s-ish sweep).
const curtainBack: Variants = {
  hidden: { scaleY: 1, originY: 0 },
  visible: { scaleY: 0, originY: 0, transition: { duration: 0.42, ease: easings.emphasized, delay: 0.08 } },
  exit: { scaleY: 1, originY: 1, transition: { duration: 0.3, ease: easings.emphasized } },
};
const curtainFront: Variants = {
  hidden: { scaleY: 1, originY: 0 },
  visible: { scaleY: 0, originY: 0, transition: { duration: 0.42, ease: easings.emphasized } },
  exit: { scaleY: 1, originY: 1, transition: { duration: 0.3, ease: easings.emphasized, delay: 0.07 } },
};
const curtainContent: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ...springs.smooth, delay: 0.18 } },
  exit: { opacity: 1, y: -8, transition: { duration: 0.3, ease: easings.inQuint } },
};
const noVariants: Variants = { hidden: {}, visible: {}, exit: {} };

interface PageLayerProps {
  variants: Variants;
  direction: Dir;
  curtain: boolean;
  focusTarget: boolean | string;
  focusKey: number;
  className?: string;
  curtainClassName?: string;
  children?: React.ReactNode;
}

function focusPage(layer: HTMLElement, target: boolean | string) {
  const selector = typeof target === "string" ? target : "h1";
  const el = layer.querySelector<HTMLElement>(selector) ?? layer;
  if (!el.hasAttribute("tabindex") && el.tabIndex < 0) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

const PageLayer = React.forwardRef<HTMLDivElement, PageLayerProps>(function PageLayer(
  { variants, direction, curtain, focusTarget, focusKey, className, curtainClassName, children },
  ref,
) {
  const isPresent = useIsPresent();
  const localRef = React.useRef<HTMLDivElement>(null);
  const focusRef = useLatestRef(focusTarget);
  const presentRef = useLatestRef(isPresent);

  // Exiting pages leave the tab order and the accessibility tree until they unmount.
  useIsomorphicLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    if (isPresent) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [isPresent]);

  // Runs when the page mounts after a navigation, or when the view preset swaps it in place.
  React.useEffect(() => {
    const el = localRef.current;
    if (focusKey === 0 || !focusRef.current || !presentRef.current || !el) return;
    focusPage(el, focusRef.current);
  }, [focusKey, focusRef, presentRef]);

  return (
    <motion.div
      ref={mergeRefs(ref, localRef)}
      custom={direction}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      data-state={isPresent ? "active" : "exiting"}
      aria-hidden={isPresent ? undefined : true}
      className={cn(blockReset, "relative", !isPresent && "pointer-events-none", curtain && "overflow-clip", className)}
    >
      {curtain ? (
        <>
          <motion.div variants={curtainContent}>{children}</motion.div>
          <motion.div
            aria-hidden="true"
            variants={curtainBack}
            className={cn(blockReset, "pointer-events-none absolute inset-0 z-10 bg-pui-primary")}
          />
          <motion.div
            aria-hidden="true"
            variants={curtainFront}
            className={cn(blockReset, "pointer-events-none absolute inset-0 z-10 bg-pui-foreground", curtainClassName)}
          />
        </>
      ) : (
        children
      )}
    </motion.div>
  );
});

function viewTransitionIdent(id: string): string {
  return `pui-page-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Route-agnostic page transition: key it by path and it animates between pages with a preset
 * (fade, slide, scale, blur, flip, wipe, curtain, or the native View Transitions API). Direction
 * follows history or an `order`. Exiting pages are inert, focus can move to the new h1, and
 * reduced motion turns every preset into a 150ms fade. Renders the page statically on the server.
 */
export const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(function PageTransition(
  {
    routeKey,
    children,
    preset = "slide",
    direction = "auto",
    order,
    axis = "x",
    distance = 24,
    mode,
    focusOnChange = false,
    layerClassName,
    curtainClassName,
    onExitComplete,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const runViewTransition = useViewTransition();
  const [nav, setNav] = React.useState<NavState>(() => ({
    key: routeKey,
    firstKey: routeKey,
    order,
    history: [routeKey],
    direction: 1,
    count: 0,
  }));
  // Snapshot of the current page, shown while a view transition captures the old DOM.
  const [frozen, setFrozen] = React.useState<React.ReactNode>(children);
  const useView =
    preset === "view" &&
    !reduced &&
    isClient &&
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function";
  const changed = routeKey !== nav.key;

  let current = nav;
  if (changed && !useView) {
    // Derived state: adopt the new key during render so the old page exits with the new direction.
    current = nextNav(nav, routeKey, order, direction);
    setNav(current);
  }
  if (useView && !changed && frozen !== children) setFrozen(children);

  const layerRef = React.useRef<HTMLDivElement>(null);
  const pendingRef = React.useRef<string | number | null>(null);
  const navRef = useLatestRef({ nav, routeKey, order, direction, axis, distance });
  const onExitCompleteRef = useLatestRef(onExitComplete);
  const name = viewTransitionIdent(React.useId());

  useIsomorphicLayoutEffect(() => {
    if (!useView || !changed || pendingRef.current === routeKey) return;
    const el = layerRef.current;
    const latest = navRef.current;
    const next = nextNav(latest.nav, latest.routeKey, latest.order, latest.direction);
    pendingRef.current = routeKey;
    if (el) el.style.setProperty("view-transition-name", name);
    const handle = runViewTransition(() => setNav(next));
    const dir = next.direction;
    const prop = latest.axis === "x" ? "translateX" : "translateY";
    const travel = latest.distance;
    void handle.ready.then((ok) => {
      if (!ok) return;
      const root = document.documentElement;
      root.animate(
        { transform: [`${prop}(0px)`, `${prop}(${-dir * travel}px)`], opacity: [1, 0] },
        { duration: 180, easing: cssEasing("inQuint"), fill: "both", pseudoElement: `::view-transition-old(${name})` },
      );
      root.animate(
        { transform: [`${prop}(${dir * travel}px)`, `${prop}(0px)`], opacity: [0, 1] },
        { duration: 380, delay: 60, easing: cssEasing("emphasized"), fill: "both", pseudoElement: `::view-transition-new(${name})` },
      );
    });
    void handle.finished.then(() => {
      if (pendingRef.current === routeKey) pendingRef.current = null;
      el?.style.removeProperty("view-transition-name");
      onExitCompleteRef.current?.();
    });
  });

  const effectiveMode: PageTransitionMode = preset === "curtain" || reduced ? "wait" : (mode ?? (preset === "wipe" ? "popLayout" : "wait"));
  const variants = useView ? noVariants : layerVariants(preset, axis, distance, reduced);
  const shownChildren = useView && changed ? frozen : children;
  const layerKey = useView ? current.firstKey : current.key;

  return (
    <div
      ref={ref}
      data-preset={preset}
      data-direction={current.direction > 0 ? "forward" : "back"}
      {...props}
      className={cn(blockReset, "relative", preset === "flip" && "[perspective:1200px]", className)}
    >
      <AnimatePresence initial={false} mode={effectiveMode} custom={current.direction} onExitComplete={onExitComplete}>
        <PageLayer
          key={layerKey}
          ref={layerRef}
          variants={variants}
          direction={current.direction}
          curtain={preset === "curtain" && !reduced}
          focusTarget={focusOnChange}
          focusKey={current.count}
          className={layerClassName}
          curtainClassName={curtainClassName}
        >
          <React.Fragment key={useView ? current.key : undefined}>{shownChildren}</React.Fragment>
        </PageLayer>
      </AnimatePresence>
    </div>
  );
});
