"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { cn } from "../lib/cn";
import { CheckIcon, CopyIcon, XIcon } from "../lib/icons";
import { blockReset, iconSize } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { Button } from "./button";
import { IconButton, type IconButtonProps } from "./icon-button";

export interface CopyButtonProps extends Omit<IconButtonProps, "aria-label" | "children" | "onCopy" | "value"> {
  /** Text to copy, or a function that returns it at click time. */
  value: string | (() => string);
  /** How long the copied / error state shows. Default 2000. */
  timeoutMs?: number;
  /** Default "Copy". */
  label?: string;
  /** Default "Copied". */
  copiedLabel?: string;
  /** Default "Copy failed". */
  errorLabel?: string;
  /** true: icon + text in a Button layout. Default false (icon only). */
  showLabel?: boolean;
  onCopied?: (value: string) => void;
  onCopyError?: (error: Error) => void;
}

type CopyState = "idle" | "copied" | "error";

const morph = {
  initial: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
};

/** Copy-to-clipboard button with a copy -> check (or x) icon morph (design 7.1 #5). */
export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    timeoutMs = 2000,
    label = "Copy",
    copiedLabel = "Copied",
    errorLabel = "Copy failed",
    showLabel = false,
    onCopied,
    onCopyError,
    onClick,
    size = "md",
    variant,
    tone,
    shape,
    className,
    ...props
  },
  ref,
) {
  const { copy, copied, error } = useCopyToClipboard({ timeoutMs });
  const state: CopyState = copied ? "copied" : error ? "error" : "idle";
  const currentLabel = state === "copied" ? copiedLabel : state === "error" ? errorLabel : label;
  const onCopyErrorRef = useLatestRef(onCopyError);

  React.useEffect(() => {
    if (error) onCopyErrorRef.current?.(error);
  }, [error, onCopyErrorRef]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const text = typeof value === "function" ? value() : value;
    void copy(text).then((ok) => {
      if (ok) onCopied?.(text);
    });
  };

  const Icon = state === "copied" ? CheckIcon : state === "error" ? XIcon : CopyIcon;
  const icon = (
    <span className={cn(blockReset, "relative inline-flex items-center justify-center", iconSize[size])}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          data-state={state}
          className={cn(blockReset, "inline-flex")}
          initial={morph.initial}
          animate={morph.animate}
          exit={morph.exit}
          transition={{ duration: 0.15 }}
        >
          <Icon className={iconSize[size]} />
        </motion.span>
      </AnimatePresence>
    </span>
  );

  const status = (
    <span role="status" className={cn(blockReset, "sr-only")}>
      {state === "copied" ? copiedLabel : state === "error" ? errorLabel : ""}
    </span>
  );

  if (showLabel) {
    return (
      <>
        <Button
          ref={ref}
          size={size}
          variant={variant ?? "outline"}
          tone={tone ?? "neutral"}
          data-state={state}
          {...props}
          onClick={handleClick}
          leadingIcon={icon}
          className={className}
        >
          {currentLabel}
        </Button>
        {status}
      </>
    );
  }

  return (
    <>
      <IconButton
        ref={ref}
        size={size}
        variant={variant}
        tone={tone}
        shape={shape}
        data-state={state}
        {...props}
        aria-label={currentLabel}
        onClick={handleClick}
        className={className}
      >
        {icon}
      </IconButton>
      {status}
    </>
  );
});
