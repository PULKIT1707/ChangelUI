"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import * as React from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementSize } from "../hooks/use-element-size";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset, controlReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface DynamicIslandProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Name of the DynamicIslandView to show. Falls back to the first view. */
  state: string;
  /** Show the active view's `expanded` content. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** "top" pins the island to the top center of the viewport. Default "inline". */
  position?: "inline" | "top";
  /** Screen reader hint on the compact view when it can expand. Default "Show details". */
  expandLabel?: string;
}

export interface DynamicIslandViewProps {
  /** Matched against DynamicIsland's `state`. */
  name: string;
  /** Announced politely when this view becomes active, e.g. "Recording, 0:42". */
  label?: string;
  /** Content for the expanded island. When set, the compact view becomes a button that expands. */
  expanded?: React.ReactNode;
  /** Classes for the compact view's wrapper. */
  className?: string;
  /** Classes for the expanded view's wrapper. */
  expandedClassName?: string;
  /** Compact content. */
  children?: React.ReactNode;
}

/** Slightly underdamped so the island lands with a little life. */
const islandSpring = { type: "spring", stiffness: 400, damping: 30 } as const;
const EXPANDED_RADIUS = 28;

/** One state of a DynamicIsland. Rendered by its parent; on its own it renders its compact content. */
export function DynamicIslandView({ children }: DynamicIslandViewProps) {
  return <>{children}</>;
}

function isView(node: React.ReactNode): node is React.ReactElement<DynamicIslandViewProps> {
  return React.isValidElement(node) && node.type === DynamicIslandView;
}

/**
 * Status pill that morphs between states (idle, timer, music, call, upload, AI thinking...). Size and
 * corner radius spring to fit each view, content crossfades with a blur, and a small squash marks every
 * change. Views with `expanded` content open on click and close on Escape or a click outside.
 */
export const DynamicIsland = React.forwardRef<HTMLDivElement, DynamicIslandProps>(function DynamicIsland(
  {
    state,
    expanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    position = "inline",
    expandLabel = "Show details",
    className,
    children,
    onKeyDown,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [expandedState, setExpanded] = useControllableState({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });
  const views = React.Children.toArray(children).filter(isView);
  const active = views.find((view) => view.props.name === state) ?? views[0];
  const canExpand = active?.props.expanded !== undefined;
  const expanded = expandedState && canExpand;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(measureRef, { box: "border-box" });
  const measured = width > 0 && height > 0;
  const [scope, animateScope] = useAnimate<HTMLDivElement>();
  const viewKey = `${active?.props.name ?? ""}:${expanded ? "x" : "c"}`;
  const focusTarget = React.useRef<"trigger" | "panel" | null>(null);

  useClickOutside(rootRef, () => setExpanded(false), { enabled: expanded });

  // Squash on every change after the first render.
  const lastKey = React.useRef(viewKey);
  React.useEffect(() => {
    if (lastKey.current === viewKey) return;
    lastKey.current = viewKey;
    if (reduced || !scope.current) return;
    const controls = animateScope(
      scope.current,
      { scaleX: [1, 1.045, 1], scaleY: [1, 0.96, 1] },
      { duration: 0.42, ease: easings.out },
    );
    return () => controls.stop();
  }, [viewKey, reduced, scope, animateScope]);

  // Keep keyboard focus inside the island as it swaps between its compact button and expanded panel.
  React.useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const el = measureRef.current?.querySelector<HTMLElement>(
      target === "panel" ? "[data-island-panel]" : "[data-island-trigger]",
    );
    el?.focus({ preventScroll: true });
  }, [viewKey]);

  const contentTransition = reduced
    ? { duration: 0.15 }
    : { opacity: { duration: 0.2, delay: 0.06 }, scale: { ...islandSpring, delay: 0.04 }, filter: { duration: 0.25, delay: 0.04 } };

  let content: React.ReactNode = null;
  if (active) {
    if (expanded) {
      content = (
        <div
          data-island-panel=""
          tabIndex={-1}
          className={cn(blockReset, "min-w-64 p-4 text-sm outline-hidden", active.props.expandedClassName)}
        >
          {active.props.expanded}
        </div>
      );
    } else if (canExpand) {
      content = (
        <button
          type="button"
          data-island-trigger=""
          aria-expanded={false}
          onClick={() => {
            focusTarget.current = "panel";
            setExpanded(true);
          }}
          className={cn(
            controlReset,
            "flex h-9 min-w-28 cursor-pointer items-center justify-center gap-2 px-3.5 text-sm outline-hidden",
            active.props.className,
          )}
        >
          {active.props.children}
          <span className={cn(blockReset, "sr-only")}>{expandLabel}</span>
        </button>
      );
    } else {
      content = (
        <div className={cn(blockReset, "flex h-9 min-w-28 items-center justify-center gap-2 px-3.5 text-sm", active.props.className)}>
          {active.props.children}
        </div>
      );
    }
  }

  return (
    <div
      ref={mergedRef}
      data-state={active?.props.name}
      data-expanded={expanded ? "" : undefined}
      data-position={position}
      {...props}
      onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          focusTarget.current = "trigger";
          setExpanded(false);
        }
      })}
      className={cn(
        blockReset,
        "flex justify-center",
        position === "top" ? "fixed left-1/2 top-3 z-(--pui-z-toast) -translate-x-1/2" : "relative",
        className,
      )}
    >
      <span role="status" className={cn(blockReset, "sr-only")}>
        {active?.props.label}
      </span>
      <div ref={scope} className={cn(blockReset, "flex justify-center")}>
        <motion.div
          initial={false}
          animate={measured ? { width, height, borderRadius: expanded ? EXPANDED_RADIUS : height / 2 } : undefined}
          transition={reduced ? { duration: 0 } : islandSpring}
          style={{ borderRadius: EXPANDED_RADIUS }}
          className={cn(
            blockReset,
            "relative flex items-center justify-center overflow-hidden bg-pui-shimmer-bg text-pui-shimmer-fg shadow-pui-lg",
            "has-[[data-island-trigger]:focus-visible]:outline-2 has-[[data-island-trigger]:focus-visible]:outline-offset-2 has-[[data-island-trigger]:focus-visible]:outline-solid has-[[data-island-trigger]:focus-visible]:outline-pui-ring",
          )}
        >
          <div ref={measureRef} className={cn(blockReset, "relative w-max shrink-0")}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={viewKey}
                className={cn(blockReset, "w-max")}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : { opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.12, ease: easings.inQuint } }
                }
                transition={contentTransition}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
});
