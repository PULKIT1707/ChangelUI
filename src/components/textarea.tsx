"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { blockReset, controlReset } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** aria-invalid + danger boundary. */
  invalid?: boolean;
  /** Grow with the content between minRows and maxRows. Default false. */
  autoResize?: boolean;
  /** Default 3. */
  minRows?: number;
  /** Unbounded when unset. */
  maxRows?: number;
  /** Character counter linked through aria-describedby; requires maxLength. Default false. */
  showCount?: boolean;
  /** Classes for the wrapper, which renders only with showCount. */
  wrapperClassName?: string;
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Multi-line input with optional auto-resize and counter; ref and className go to <textarea> (design 7.1 #18). */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    invalid = false,
    autoResize = false,
    minRows = 3,
    maxRows,
    showCount = false,
    wrapperClassName,
    className,
    rows,
    onChange,
    onInput,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLTextAreaElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const countId = React.useId();
  const controlledValue = props.value;
  const [uncontrolledLength, setUncontrolledLength] = React.useState(() => String(props.defaultValue ?? "").length);
  const length = controlledValue !== undefined ? String(controlledValue).length : uncontrolledLength;
  const maxLength = props.maxLength;
  const counted = showCount && maxLength !== undefined;

  React.useEffect(() => {
    if (showCount && maxLength === undefined) devWarn("textarea:count", "Textarea showCount requires maxLength.");
  }, [showCount, maxLength]);

  const resize = React.useCallback(() => {
    const el = localRef.current;
    if (!el || !autoResize) return;
    const style = getComputedStyle(el);
    const lineHeight = px(style.lineHeight) || px(style.fontSize) * 1.5 || 20;
    const chrome = px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth);
    const border = px(style.borderTopWidth) + px(style.borderBottomWidth);
    const min = minRows * lineHeight + chrome;
    const max = maxRows !== undefined ? maxRows * lineHeight + chrome : Number.POSITIVE_INFINITY;
    el.style.height = "auto";
    const content = el.scrollHeight + border;
    el.style.height = `${Math.min(Math.max(content, min), max)}px`;
    el.style.overflowY = content > max ? "auto" : "hidden";
  }, [autoResize, minRows, maxRows]);

  // DOM measurement only (no state): runs before paint and whenever a controlled value changes.
  useIsomorphicLayoutEffect(() => {
    resize();
  }, [resize, controlledValue]);

  const describedBy = [props["aria-describedby"], counted ? countId : undefined].filter(Boolean).join(" ") || undefined;

  const control = (
    <textarea
      ref={mergedRef}
      rows={rows ?? minRows}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      {...props}
      aria-describedby={describedBy}
      onChange={(event) => {
        onChange?.(event);
        if (controlledValue === undefined) setUncontrolledLength(event.currentTarget.value.length);
      }}
      onInput={(event) => {
        onInput?.(event);
        resize();
      }}
      className={cn(
        controlReset,
        fieldClasses,
        "block px-3 py-2 text-sm",
        autoResize ? "resize-none" : "resize-y",
        invalid && invalidClasses,
        className,
      )}
    />
  );

  if (!counted) return control;

  return (
    <div className={cn(blockReset, "flex w-full flex-col gap-1.5", wrapperClassName)}>
      {control}
      <span
        id={countId}
        data-pui-count=""
        className={cn(
          blockReset,
          "self-end text-xs tabular-nums text-pui-muted-foreground",
          maxLength !== undefined && length >= maxLength && "text-pui-danger-text",
        )}
      >
        {length}/{maxLength}
      </span>
    </div>
  );
});
