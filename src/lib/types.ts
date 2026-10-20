import type * as React from "react";

/** Shared public types (design 7.0 C2). */
export type Size = "sm" | "md" | "lg";
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";
export type Orientation = "horizontal" | "vertical";
export type Trigger = "mount" | "inView";
export type TextTag = "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "strong" | "em" | "label";
export type PatternMask = "none" | "radial" | "fade-x" | "fade-y" | "fade-bottom";

/** HTML props minus the event handlers whose React and Motion types conflict. */
export type MotionSafeHTMLProps<E> = Omit<
  React.HTMLAttributes<E>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

/** Shared base of the text effects (design 7.2). */
export interface TextBaseProps extends MotionSafeHTMLProps<HTMLElement> {
  /** Rendered tag. */
  as?: TextTag;
  /** When the effect starts. Default "inView". */
  trigger?: Trigger;
  /** Run once (true) or every time the element enters the viewport. Default true. */
  once?: boolean;
  /** Start delay in seconds. Default 0. */
  delay?: number;
}
