"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type FancyUnderlineVariant = "draw" | "center" | "slide" | "marker" | "squiggle";
export type FancyUnderlineTag = "a" | "button" | "span" | "strong" | "em" | "h1" | "h2" | "h3" | "h4";

export interface FancyUnderlineProps
  extends Omit<React.AnchorHTMLAttributes<HTMLElement>, "type" | "color">,
    Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled"> {
  children: React.ReactNode;
  /** Rendered tag; "a" and "button" keep their native behavior. Default "span", or "a" when href is set. */
  as?: FancyUnderlineTag;
  /**
   * draw: grows from the left on hover and leaves to the right. center: grows from the middle.
   * slide: a resting line that runs out to the right and back in from the left. marker: a tilted
   * highlighter stroke behind the text. squiggle: a hand-drawn wave that draws in and wiggles.
   * Default "draw".
   */
  variant?: FancyUnderlineVariant;
  /** Line color. Default "var(--pui-primary)" ("var(--pui-highlight)" for marker). */
  color?: string;
  /** Line thickness in px. Default 2 (squiggle 1.75). */
  thickness?: number;
  /** Gap between the text baseline box and the line, in px. Default 2. */
  offset?: number;
  /** Keep the underline shown, e.g. for the current nav item. Default false. */
  active?: boolean;
}

/** Literal class sets per variant (never built dynamically, so Tailwind sees them). */
const showOnHover =
  "group-hover/fu:scale-x-100 group-focus-visible/fu:scale-x-100 group-data-active/fu:scale-x-100";
const lineBase = "pointer-events-none absolute inset-x-0 block rounded-full bg-(--pui-fu-color)";
const lineMotion = "transition-transform duration-300 ease-(--pui-ease-out)";

const lineClasses: Record<"draw" | "center" | "marker", string> = {
  draw: cn(
    lineBase,
    "origin-right scale-x-0",
    "group-hover/fu:origin-left group-focus-visible/fu:origin-left group-data-active/fu:origin-left",
    showOnHover,
  ),
  center: cn(lineBase, "origin-center scale-x-0", showOnHover),
  marker: cn(
    "pointer-events-none absolute -inset-x-[0.15em] bottom-[0.06em] -z-10 block h-[0.5em] -rotate-1 rounded-[0.25em_0.4em_0.3em_0.5em] bg-(--pui-fu-color)",
    "origin-left scale-x-0",
    showOnHover,
  ),
};

const WAVELENGTH = 12;
const AMPLITUDE = 2.25;

/**
 * Link and heading underlines that draw in, slide through, mark or wiggle on hover and keyboard
 * focus (roadmap W6). The native element is kept, so links and buttons behave as usual.
 */
export const FancyUnderline = React.forwardRef<HTMLElement, FancyUnderlineProps>(function FancyUnderline(
  {
    children,
    as,
    variant = "draw",
    color,
    thickness,
    offset = 2,
    active = false,
    className,
    style,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const waveRef = React.useRef<SVGRectElement>(null);
  const waveAnim = React.useRef<Animation | null>(null);
  const [hovered, setHovered] = React.useState(false);
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const patternId = `pui-fu-${React.useId().replace(/:/g, "")}`;
  const tag = as ?? (props.href ? "a" : "span");
  const interactive = tag === "a" || tag === "button";
  const lineColor = color ?? (variant === "marker" ? "var(--pui-highlight)" : "var(--pui-primary)");
  const stroke = thickness ?? (variant === "squiggle" ? 1.75 : 2);
  const waveHeight = AMPLITUDE * 2 + stroke;

  const enter = () => {
    setHovered(true);
    if (variant !== "squiggle" || reduced) return;
    const rect = waveRef.current;
    if (!rect || typeof rect.animate !== "function") return;
    waveAnim.current?.cancel();
    waveAnim.current = rect.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${-WAVELENGTH}px)` }],
      { duration: 420, iterations: Infinity, easing: "linear" },
    );
  };
  const leave = () => {
    // Keyboard focus keeps the effect even when the pointer leaves.
    if (localRef.current?.matches(":focus-visible")) return;
    setHovered(false);
    waveAnim.current?.cancel();
    waveAnim.current = null;
  };
  React.useEffect(() => () => waveAnim.current?.cancel(), []);

  let decoration: React.ReactNode;
  if (variant === "squiggle") {
    const mid = waveHeight / 2;
    const d = `M0 ${mid} Q ${WAVELENGTH / 4} ${mid - AMPLITUDE} ${WAVELENGTH / 2} ${mid} T ${WAVELENGTH} ${mid}`;
    decoration = (
      <svg
        aria-hidden="true"
        focusable="false"
        width="100%"
        height={waveHeight}
        style={{ bottom: -offset - waveHeight / 2 + stroke / 2 }}
        className={cn(
          blockReset,
          "pointer-events-none absolute inset-x-0 block overflow-hidden text-(--pui-fu-color)",
          reduced
            ? "[clip-path:inset(0)]"
            : cn(
                "[clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-(--pui-ease-out)",
                "group-hover/fu:[clip-path:inset(0)] group-focus-visible/fu:[clip-path:inset(0)] group-data-active/fu:[clip-path:inset(0)]",
              ),
        )}
      >
        <defs>
          <pattern id={patternId} width={WAVELENGTH} height={waveHeight} patternUnits="userSpaceOnUse">
            <path d={d} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
          </pattern>
        </defs>
        <rect ref={waveRef} x="0" y="0" width="200%" height={waveHeight} fill={`url(#${patternId})`} />
      </svg>
    );
  } else if (variant === "slide") {
    decoration = (
      <span
        aria-hidden="true"
        style={{ bottom: -offset, height: stroke }}
        className={cn(blockReset, "pointer-events-none absolute inset-x-0 block overflow-hidden rounded-full")}
      >
        <motion.span
          className={cn(blockReset, "block h-full w-full bg-(--pui-fu-color)")}
          initial={false}
          animate={hovered && !reduced ? { x: ["0%", "101%", "-101%", "0%"] } : { x: "0%" }}
          transition={{ duration: 0.6, times: [0, 0.45, 0.4501, 1], ease: easings.inOut }}
        />
      </span>
    );
  } else {
    decoration = (
      <span
        aria-hidden="true"
        style={variant === "marker" ? undefined : { bottom: -offset, height: stroke }}
        className={cn(lineClasses[variant], reduced ? "scale-x-100" : lineMotion)}
      />
    );
  }

  const elementProps = {
    ref: mergedRef,
    "data-variant": variant,
    "data-active": active ? "" : undefined,
    "data-state": hovered || active ? "on" : "off",
    ...(tag === "button" ? { type: props.type ?? "button" } : {}),
    ...props,
    onPointerEnter: composeEventHandlers(onPointerEnter, enter),
    onPointerLeave: composeEventHandlers(onPointerLeave, leave),
    onFocus: composeEventHandlers(onFocus, () => {
      if (localRef.current?.matches(":focus-visible")) enter();
    }),
    onBlur: composeEventHandlers(onBlur, () => {
      setHovered(false);
      waveAnim.current?.cancel();
      waveAnim.current = null;
    }),
    style: { "--pui-fu-color": lineColor, ...style } as React.CSSProperties,
    className: cn(
      tag === "button" ? controlReset : blockReset,
      "group/fu relative isolate inline-block no-underline",
      tag === "a" && "text-inherit",
      interactive && cn("cursor-pointer rounded-pui-sm", focusRing),
      className,
    ),
  } as React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>;
  return React.createElement(tag, elementProps, children, decoration);
});
