"use client";

import * as React from "react";
import { buttonBase, buttonPress, iconButtonSizes } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { devWarn } from "../lib/dev";
import { Slot } from "../lib/slot";
import { controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses, variantClasses } from "../lib/tone";
import type { ButtonProps } from "./button";
import { Spinner } from "./spinner";

export interface IconButtonProps
  extends Omit<ButtonProps, "leadingIcon" | "trailingIcon" | "loadingText" | "fullWidth"> {
  /** Required accessible name (the button shows only an icon). */
  "aria-label": string;
  /** Default "square". */
  shape?: "square" | "circle";
}

/** Square or circular icon-only button: 32 / 36 / 44 px (design 7.1 #2). */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = "ghost",
    tone = "neutral",
    size = "md",
    shape = "square",
    loading = false,
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
  const label = props["aria-label"];
  React.useEffect(() => {
    if (typeof label !== "string" || label.trim() === "") {
      devWarn("icon-button:label", "IconButton needs a non-empty aria-label.");
    }
  }, [label]);

  const blocked = loading || (asChild && disabled === true);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const Comp: React.ElementType = asChild ? Slot : "button";

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
      data-shape={shape}
      data-loading={loading ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      onClick={handleClick}
      className={cn(
        controlReset,
        buttonBase,
        focusRing,
        disabledStyles,
        buttonPress,
        iconButtonSizes[size],
        shape === "circle" && "rounded-pui-full",
        variantClasses[variant],
        toneClasses[tone],
        className,
      )}
    >
      {asChild ? children : loading ? <Spinner decorative size={size} /> : children}
    </Comp>
  );
});
