"use client";

import { motion, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type FlipCardTrigger = "click" | "hover" | "manual";

export interface FlipCardProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Controlled: true shows the back face. */
  flipped?: boolean;
  /** Default false. */
  defaultFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  /** "click" flips on a click anywhere outside nested controls, "hover" on mouse hover, "manual" only via FlipCardButton or `flipped`. Default "click". */
  trigger?: FlipCardTrigger;
  /** Rotation axis. Default "y". */
  axis?: "x" | "y";
  /** Rotate the other way. Default false. */
  reverse?: boolean;
  /** Perspective in px. Default 1000. */
  perspective?: number;
  disabled?: boolean;
}

export type FlipCardFaceProps = MotionSafeHTMLProps<HTMLDivElement>;

export interface FlipCardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render the single child element instead of a <button>. */
  asChild?: boolean;
}

interface FlipCardContextValue {
  flipped: boolean;
  toggle: () => void;
  axis: "x" | "y";
  reduced: boolean;
  disabled: boolean;
}

const FlipCardContext = React.createContext<FlipCardContextValue | null>(null);

function useFlipCard(part: string): FlipCardContextValue {
  const context = React.useContext(FlipCardContext);
  if (!context) throw new Error(`${part} must be used inside <FlipCard>.`);
  return context;
}

const flipSpring = { stiffness: 260, damping: 24 };
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button], [role=link], [contenteditable=true], [tabindex]:not([tabindex='-1'])";

/**
 * A card with a front and a back face that flips in 3D on click, hover or a FlipCardButton. The
 * card is as tall as its taller face, and the hidden face is inert so it can't be tabbed into.
 */
export const FlipCard = React.forwardRef<HTMLDivElement, FlipCardProps>(function FlipCard(
  {
    flipped: flippedProp,
    defaultFlipped = false,
    onFlippedChange,
    trigger = "click",
    axis = "y",
    reverse = false,
    perspective = 1000,
    disabled = false,
    onClick,
    onPointerEnter,
    onPointerLeave,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [flipped, setFlipped] = useControllableState({
    value: flippedProp,
    defaultValue: defaultFlipped,
    onChange: onFlippedChange,
    name: "flipped",
  });
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const toggle = React.useCallback(() => {
    if (!disabled) setFlipped((value) => !value);
  }, [disabled, setFlipped]);

  // When the face holding focus turns away (and goes inert), move focus to the visible face.
  const wasFlipped = React.useRef(flipped);
  React.useEffect(() => {
    if (wasFlipped.current === flipped) return;
    wasFlipped.current = flipped;
    const root = rootRef.current;
    const active = root?.ownerDocument.activeElement;
    if (!root || !active || !root.contains(active)) return;
    const face = root.querySelector<HTMLElement>(`[data-pui-flip-face="${flipped ? "back" : "front"}"]`);
    if (!face || face.contains(active)) return;
    const target = face.querySelector<HTMLElement>("[data-pui-flip-button]") ?? face;
    target.focus({ preventScroll: true });
  }, [flipped]);

  const context = React.useMemo(() => ({ flipped, toggle, axis, reduced, disabled }), [flipped, toggle, axis, reduced, disabled]);
  const angle = reduced || !flipped ? 0 : reverse ? -180 : 180;
  const rotation = useSpring(angle, flipSpring);
  // The card dips a little mid-flip, following the real angle (no separate timeline to sync).
  const scale = useTransform(rotation, (r) => 1 - 0.05 * Math.abs(Math.sin((r * Math.PI) / 180)));
  React.useEffect(() => {
    if (reduced) rotation.jump(angle);
    else rotation.set(angle);
  }, [angle, reduced, rotation]);

  return (
    <FlipCardContext.Provider value={context}>
      <div
        ref={mergeRefs(rootRef, ref)}
        data-state={flipped ? "back" : "front"}
        data-orientation={axis === "y" ? "horizontal" : "vertical"}
        data-disabled={disabled ? "" : undefined}
        {...props}
        onClick={composeEventHandlers(onClick, (event) => {
          if (trigger !== "click" || disabled) return;
          // Clicks on nested controls belong to them.
          const hit = (event.target as Element).closest(INTERACTIVE);
          if (hit && event.currentTarget.contains(hit)) return;
          toggle();
        })}
        onPointerEnter={composeEventHandlers(onPointerEnter, (event) => {
          if (trigger === "hover" && event.pointerType === "mouse" && !disabled) setFlipped(true);
        })}
        onPointerLeave={composeEventHandlers(onPointerLeave, (event) => {
          if (trigger === "hover" && event.pointerType === "mouse" && !disabled) setFlipped(false);
        })}
        style={{ perspective: `${perspective}px`, ...style }}
        className={cn(blockReset, "relative grid", trigger === "click" && !disabled && "cursor-pointer", className)}
      >
        <motion.div
          className={cn(blockReset, "relative grid [grid-template-areas:'face'] [transform-style:preserve-3d]")}
          style={axis === "y" ? { rotateY: rotation, scale } : { rotateX: rotation, scale }}
        >
          {children}
        </motion.div>
      </div>
    </FlipCardContext.Provider>
  );
});

function useFace(side: "front" | "back") {
  const { flipped, axis, reduced } = useFlipCard(side === "front" ? "FlipCardFront" : "FlipCardBack");
  const hidden = side === "front" ? flipped : !flipped;
  const ref = React.useRef<HTMLDivElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    // `inert` via the DOM (the prop is React 19 only): the turned-away face leaves the tab order.
    if (hidden) ref.current?.setAttribute("inert", "");
    else ref.current?.removeAttribute("inert");
  }, [hidden]);
  const turn = side === "back" && !reduced ? (axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)") : undefined;
  return { hidden, ref, turn, reduced };
}

const faceBase = "relative [grid-area:face] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] outline-none";

/** The face shown at rest. */
export const FlipCardFront = React.forwardRef<HTMLDivElement, FlipCardFaceProps>(function FlipCardFront(
  { className, style, ...props },
  ref,
) {
  const { hidden, ref: faceRef, reduced } = useFace("front");
  return (
    <motion.div
      ref={mergeRefs(faceRef, ref)}
      tabIndex={-1}
      data-pui-flip-face="front"
      aria-hidden={hidden || undefined}
      {...props}
      initial={false}
      animate={reduced ? { opacity: hidden ? 0 : 1 } : { opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={style}
      className={cn(blockReset, faceBase, hidden && "pointer-events-none", className)}
    />
  );
});

/** The face shown when flipped. */
export const FlipCardBack = React.forwardRef<HTMLDivElement, FlipCardFaceProps>(function FlipCardBack(
  { className, style, ...props },
  ref,
) {
  const { hidden, ref: faceRef, turn, reduced } = useFace("back");
  return (
    <motion.div
      ref={mergeRefs(faceRef, ref)}
      tabIndex={-1}
      data-pui-flip-face="back"
      aria-hidden={hidden || undefined}
      {...props}
      initial={false}
      animate={reduced ? { opacity: hidden ? 0 : 1 } : { opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={{ transform: turn, ...style }}
      className={cn(blockReset, faceBase, hidden && "pointer-events-none", className)}
    />
  );
});

/** A button that flips the card, with aria-pressed. Put one on each face for keyboard users. */
export const FlipCardButton = React.forwardRef<HTMLButtonElement, FlipCardButtonProps>(function FlipCardButton(
  { asChild = false, type, onClick, className, ...props },
  ref,
) {
  const { flipped, toggle, disabled } = useFlipCard("FlipCardButton");
  const shared = {
    "aria-pressed": flipped,
    "data-pui-flip-button": "",
    "data-state": flipped ? "back" : "front",
    disabled: asChild ? undefined : disabled,
    ...props,
    onClick: composeEventHandlers(onClick, (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      toggle();
    }),
  };
  if (asChild) return <Slot ref={ref as React.Ref<HTMLElement>} {...(shared as React.HTMLAttributes<HTMLElement>)} className={className} />;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      {...shared}
      className={cn(
        controlReset,
        "inline-flex cursor-pointer items-center gap-1.5 rounded-pui-md px-2.5 py-1.5 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
        focusRing,
        className,
      )}
    />
  );
});
