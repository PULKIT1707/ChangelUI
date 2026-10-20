import type { Size } from "./types";

// Shared literal class strings for Button, IconButton, RippleButton and CopyButton (design 7.1 #1-#5).

export type ButtonVariant = "solid" | "outline" | "ghost" | "soft" | "link";

export const buttonBase =
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-pui-md font-medium";

/**
 * CSS press feedback (keeps asChild working); not used by the link variant. The press is quick
 * (75ms, ease-out); the release takes 200ms on the spring curve so the button settles with a bounce.
 */
export const buttonPress =
  "active:scale-[0.97] motion-reduce:active:scale-100 transition-[transform,background-color,color,box-shadow] duration-200 ease-pui-spring active:duration-75 active:ease-pui-out";

export const linkTransition = "transition-colors duration-(--pui-duration-fast)";

export const buttonSizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

/** Link buttons drop the control height and padding so they sit inline with text. */
export const linkSizes: Record<Size, string> = {
  sm: "h-auto px-0 text-xs",
  md: "h-auto px-0 text-sm",
  lg: "h-auto px-0 text-base",
};

/** Square icon buttons: 32 / 36 / 44 px. */
export const iconButtonSizes: Record<Size, string> = {
  sm: "size-8 p-0 text-xs",
  md: "size-9 p-0 text-sm",
  lg: "size-11 p-0 text-base",
};
