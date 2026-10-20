"use client";

import * as React from "react";
import { buttonBase, buttonPress, buttonSizes, linkSizes, linkTransition, type ButtonVariant } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { Slot } from "../lib/slot";
import { controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses, variantClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { Spinner } from "./spinner";

export type { ButtonVariant } from "../lib/button-styles";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default "solid". */
  variant?: ButtonVariant;
  /** Default "primary". */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
  /** aria-busy + aria-disabled, suppresses onClick and shows a decorative Spinner. Default false. */
  loading?: boolean;
  /** Replaces the label while loading (the label is kept otherwise, so the width stays stable). */
  loadingText?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Default false. */
  fullWidth?: boolean;
  /** Render the single child element instead of a <button> (icons and the spinner are not added). */
  asChild?: boolean;
}

/** Button with five variants, six tones, loading state and asChild (design 7.1 #1). */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "solid",
    tone = "primary",
    size = "md",
    loading = false,
    loadingText,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    asChild = false,
    disabled,
    type,
    onClick,
    className,
    children,
    ...props
  },
  ref,
) {
  const isLink = variant === "link";
  const blocked = loading || (asChild && disabled === true);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const Comp: React.ElementType = asChild ? Slot : "button";
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? <Spinner decorative size={size} variant="ring" /> : leadingIcon}
      {loading && loadingText !== undefined ? loadingText : children}
      {trailingIcon}
    </>
  );

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled}
      aria-disabled={blocked ? true : undefined}
      aria-busy={loading ? true : undefined}
      tabIndex={asChild && disabled ? -1 : undefined}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      data-loading={loading ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      onClick={handleClick}
      className={cn(
        controlReset,
        buttonBase,
        focusRing,
        disabledStyles,
        isLink ? linkSizes[size] : buttonSizes[size],
        isLink ? linkTransition : buttonPress,
        variantClasses[variant],
        toneClasses[tone],
        fullWidth && "w-full",
        className,
      )}
    >
      {content}
    </Comp>
  );
});
