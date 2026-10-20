import type { Size } from "./types";

// Shared literal class strings (design 5.12). Components must look right without preflight,
// so every intrinsic element starts its cn() call with exactly one reset constant.

/** Visible keyboard focus ring; outline-solid is required because outline-hidden sets the style to none. */
export const focusRing =
  "outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-pui-ring";

/** For button, input, textarea and select. Contains everything blockReset sets. */
export const controlReset =
  "box-border m-0 p-0 border-0 bg-transparent text-inherit appearance-none font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit]";

/** For every other intrinsic element (div, span, p, headings, img, svg root, ...). */
export const blockReset = "box-border m-0";

/** For ol and ul. */
export const listReset = "box-border m-0 p-0 list-none";

export const disabledStyles =
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/** Control heights: 32 / 36 / 44 px (lg meets the touch-target size). */
export const controlHeight: Record<Size, string> = {
  sm: "h-8",
  md: "h-9",
  lg: "h-11",
};

export const textSize: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const iconSize: Record<Size, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};
