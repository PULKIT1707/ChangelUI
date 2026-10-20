"use client";

import { motion, type Variants } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { hiddenInputClasses, useFormReset } from "../lib/form";
import { StarIcon } from "../lib/icons";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface RatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: number;
  /** Default 0. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Default 5. */
  max?: number;
  /** 0.5 steps. Default false. */
  allowHalf?: boolean;
  /** Display only (role="img"). */
  readOnly?: boolean;
  disabled?: boolean;
  /** Clicking the current value clears it. Default true. */
  clearable?: boolean;
  /** Default "md". */
  size?: Size;
  /** Default "warning". */
  tone?: Tone;
  /** Replaces the star. */
  icon?: React.ReactNode;
  /** Renders a hidden input for native form submission. */
  name?: string;
  /** aria-valuetext (interactive) or aria-label (read-only). Default `${v} of ${m} stars`. */
  getLabel?: (value: number, max: number) => string;
}

const iconSizes: Record<Size, string> = { sm: "size-4", md: "size-5", lg: "size-6" };
const defaultGetLabel = (value: number, max: number) => `${value} of ${max} stars`;

const pop: Variants = {
  idle: { scale: 1 },
  filled: (delay: number) => ({ scale: [1, 1.25, 1], transition: { duration: 0.3, delay } }),
};

/** Star rating (design 7.1 #31): a single role="slider" when interactive, role="img" when read-only. */
export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    max: maxProp = 5,
    allowHalf = false,
    readOnly = false,
    disabled = false,
    clearable = true,
    size = "md",
    tone = "warning",
    icon,
    name,
    getLabel = defaultGetLabel,
    className,
    onKeyDown,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const max = Number.isFinite(maxProp) && maxProp >= 1 ? Math.floor(maxProp) : 5;
  const unit = allowHalf ? 0.5 : 1;
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    if (!(Number.isFinite(maxProp) && maxProp >= 1)) devWarn("rating:max", "Rating max must be >= 1; using 5.");
  }, [maxProp]);

  const [rawValue, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? 0,
    onChange: onValueChange,
  });
  const clamp = (v: number) => Math.min(Math.max(Math.round(v / unit) * unit, 0), max);
  const value = clamp(Number.isFinite(rawValue) ? rawValue : 0);

  const [hover, setHover] = React.useState<number | null>(null);
  const display = hover ?? value;
  // Newly filled icons pop, staggered from the previously filled count (prev-value-in-state pattern).
  const [prevDisplay, setPrevDisplay] = React.useState(display);
  const [popFrom, setPopFrom] = React.useState(Math.ceil(display));
  if (display !== prevDisplay) {
    setPrevDisplay(display);
    setPopFrom(Math.ceil(prevDisplay));
  }

  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  useFormReset(rootRef, () => setValue(defaultValue ?? 0));

  const interactive = !readOnly && !disabled;
  const label = getLabel(value, max);

  const valueAt = (event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>, index: number) => {
    if (!allowHalf) return index + 1;
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = rect.width > 0 && event.clientX - rect.left < rect.width / 2;
    return isLeftHalf ? index + 0.5 : index + 1;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!interactive || event.defaultPrevented) return;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = value + unit;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = value - unit;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = max;
    else if (/^[0-9]$/.test(event.key)) next = Number(event.key);
    if (next === null) return;
    event.preventDefault();
    setValue(clamp(next));
  };

  const a11y = readOnly
    ? { "aria-label": props["aria-label"] ?? label }
    : {
        tabIndex: disabled ? -1 : 0,
        "aria-label": props["aria-labelledby"] ? undefined : (props["aria-label"] ?? "Rating"),
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": value,
        "aria-valuetext": label,
        "aria-orientation": "horizontal" as const,
        "aria-disabled": disabled || undefined,
      };

  return (
    <>
      <div
        ref={mergedRef}
        data-size={size}
        data-tone={tone}
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        {...props}
        {...a11y}
        role={readOnly ? "img" : "slider"}
        onKeyDown={handleKeyDown}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setHover(null);
        }}
        className={cn(
          blockReset,
          "inline-flex items-center gap-0.5 rounded-pui-sm",
          interactive && focusRing,
          disabled && "opacity-50",
          toneClasses[tone],
          className,
        )}
      >
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.min(Math.max(display - index, 0), 1);
          const filled = fill > 0;
          return (
            <motion.span
              key={index}
              aria-hidden="true"
              data-pui-rating-item=""
              data-state={fill === 1 ? "full" : fill > 0 ? "half" : "empty"}
              custom={Math.max(0, index - popFrom) * 0.03}
              variants={pop}
              initial={false}
              animate={filled && !reduced ? "filled" : "idle"}
              onPointerMove={interactive ? (event) => setHover(valueAt(event, index)) : undefined}
              onClick={
                interactive
                  ? (event) => {
                      const next = valueAt(event, index);
                      setValue(clearable && next === value ? 0 : next);
                      setHover(null);
                    }
                  : undefined
              }
              className={cn(
                blockReset,
                "relative inline-flex shrink-0",
                interactive && "cursor-pointer",
                iconSizes[size],
              )}
            >
              <span className={cn(blockReset, "inline-flex text-pui-input")}>
                {icon ?? <StarIcon className={iconSizes[size]} />}
              </span>
              {filled ? (
                <span
                  className={cn(blockReset, "absolute inset-y-0 left-0 inline-flex overflow-hidden text-(--pui-tone)")}
                  style={{ width: `${fill * 100}%` }}
                >
                  {icon ?? <StarIcon className={iconSizes[size]} />}
                </span>
              ) : null}
            </motion.span>
          );
        })}
      </div>
      {name !== undefined ? (
        <input
          type="hidden"
          aria-hidden="true"
          tabIndex={-1}
          readOnly
          name={name}
          value={String(value)}
          className={cn(controlReset, hiddenInputClasses)}
        />
      ) : null}
    </>
  );
});
