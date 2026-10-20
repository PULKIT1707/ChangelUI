"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { toIdPart } from "../lib/ids";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "value" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Reveal toggle button. Default true. */
  showToggle?: boolean;
  /** Whether the password is shown as text (defaultVisible, onVisibleChange). */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** true uses the built-in estimate; a function returns 0 (too weak) to 4 (strong). Default none. */
  strength?: boolean | ((value: string) => number);
  /** Names for scores 0-4. Default ["Too weak", "Weak", "Fair", "Good", "Strong"]. */
  strengthLabels?: readonly [string, string, string, string, string];
  /** Requirements shown as a checklist that ticks off as you type. */
  rules?: readonly PasswordRule[];
  /** Small "Caps Lock is on" hint while focused. Default true. */
  capsLockWarning?: boolean;
  /** Default "Caps Lock is on". */
  capsLockLabel?: string;
  /** Accessible name of the reveal toggle (it is a pressed toggle). Default "Show password". */
  toggleLabel?: string;
  /** Default "md". */
  size?: Size;
  invalid?: boolean;
  /** Classes for the outer wrapper (field, meter and rules). */
  wrapperClassName?: string;
}

const heights: Record<Size, string> = { sm: "h-8 ps-2.5", md: "h-9 ps-3", lg: "h-11 ps-3.5" };
const togglePad: Record<Size, string> = { sm: "pe-8", md: "pe-10", lg: "pe-11" };
const toggleSize: Record<Size, string> = { sm: "size-6 end-1", md: "size-7 end-1", lg: "size-9 end-1" };
const eyeSize: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };

const defaultLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;
const segmentTone = ["bg-pui-danger", "bg-pui-danger", "bg-pui-warning", "bg-pui-success", "bg-pui-success"] as const;
const labelTone = [
  "text-pui-danger-text",
  "text-pui-danger-text",
  "text-pui-warning-text",
  "text-pui-success-text",
  "text-pui-success-text",
] as const;

const SEQUENCES = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|wert|asdf|zxcv|pass|letmein|admin|welcome)/i;

/**
 * Quick client-side strength estimate, 0 (too weak) to 4 (strong), from length, character variety
 * and obvious patterns. A UX hint only: check real passwords on the server.
 */
export function estimatePasswordStrength(value: string): PasswordStrength {
  if (value.length < 6) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (variety >= 3) score++;
  if (value.length >= 16 || (variety === 4 && value.length >= 10)) score++;
  if (variety === 1 && value.length < 16) score = Math.min(score, 1);
  if (/^(.)\1+$/.test(value) || /(.)\1\1\1/.test(value) || SEQUENCES.test(value)) score = Math.min(score, 1);
  return Math.max(0, Math.min(4, score)) as PasswordStrength;
}

function Eye({ revealed, reduced, className }: { revealed: boolean; reduced: boolean; className: string }) {
  const isClient = useIsClient();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn(blockReset, "block shrink-0 overflow-visible", className)}
    >
      {/* Blink on every toggle: the lid closes and opens around the change. */}
      <motion.g
        key={isClient && !reduced ? String(revealed) : "still"}
        initial={isClient && !reduced ? { scaleY: 0.1 } : false}
        animate={{ scaleY: 1 }}
        transition={springs.bouncy}
        style={{ originX: "12px", originY: "12px" }}
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </motion.g>
      {/* The slash draws in while the text is visible ("hide"). */}
      <motion.path
        d="M4 4l16 16"
        initial={false}
        animate={{ pathLength: revealed ? 1 : 0, opacity: revealed ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { ...springs.smooth, opacity: { duration: 0.1 } }}
      />
    </svg>
  );
}

/**
 * Password field (roadmap W2): a reveal toggle whose eye blinks and draws a slash, an optional
 * segmented strength meter, a rules checklist that ticks off as you type and a Caps Lock hint.
 * The ref and className go to the native <input>.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onChange,
    showToggle = true,
    visible: visibleProp,
    defaultVisible = false,
    onVisibleChange,
    strength,
    strengthLabels = defaultLabels,
    rules,
    capsLockWarning = true,
    capsLockLabel = "Caps Lock is on",
    toggleLabel = "Show password",
    size = "md",
    invalid = false,
    wrapperClassName,
    className,
    disabled,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const baseId = `pui-pw-${toIdPart(React.useId())}`;
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const [visible, setVisible] = useControllableState({
    value: visibleProp,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
    name: "visible",
  });
  const [capsLock, setCapsLock] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const score: PasswordStrength | null =
    strength === undefined || strength === false
      ? null
      : (Math.max(0, Math.min(4, Math.round(strength === true ? estimatePasswordStrength(value) : strength(value)))) as PasswordStrength);
  const met = rules ? rules.filter((r) => r.test(value)).length : 0;
  const empty = value === "";
  const filled = score === null || empty ? 0 : Math.max(1, score);

  const meterId = `${baseId}-meter`;
  const rulesId = `${baseId}-rules`;
  const describedBy =
    [props["aria-describedby"], score !== null ? meterId : null, rules ? rulesId : null].filter(Boolean).join(" ") || undefined;

  const readCaps = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!capsLockWarning || typeof event.getModifierState !== "function") return;
    const on = event.getModifierState("CapsLock");
    if (on !== capsLock) setCapsLock(on);
  };

  const showCaps = capsLockWarning && capsLock && focused;

  return (
    <div
      data-size={size}
      data-visible={visible ? "" : undefined}
      className={cn(blockReset, "flex w-full min-w-0 flex-col gap-2", wrapperClassName)}
    >
      <div className={cn(blockReset, "relative flex w-full items-center")}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-size={size}
          data-invalid={invalid ? "" : undefined}
          aria-invalid={invalid || props["aria-invalid"] || undefined}
          disabled={disabled}
          {...props}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => {
            onChange?.(event);
            setValue(event.target.value);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            readCaps(event);
          }}
          onKeyUp={(event) => {
            onKeyUp?.(event);
            readCaps(event);
          }}
          onFocus={(event) => {
            onFocus?.(event);
            setFocused(true);
          }}
          onBlur={(event) => {
            onBlur?.(event);
            setFocused(false);
          }}
          className={cn(
            controlReset,
            fieldClasses,
            heights[size],
            textSize[size],
            showToggle ? togglePad[size] : "pe-3",
            !visible && !empty && "tracking-[0.12em]",
            invalid && invalidClasses,
            className,
          )}
        />
        <AnimatePresence initial={false}>
          {showCaps ? (
            <motion.span
              key="caps"
              aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={springs.snappy}
              className={cn(
                blockReset,
                "pointer-events-none absolute inline-flex items-center gap-1 rounded-pui-sm bg-pui-warning/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-pui-warning-text",
                showToggle ? (size === "lg" ? "end-11" : "end-9") : "end-2",
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true" focusable="false" className={cn(blockReset, "block size-3")}>
                <path d="m6 13 6-7 6 7" />
                <path d="M8 18h8" />
              </svg>
              Caps
            </motion.span>
          ) : null}
        </AnimatePresence>
        {showToggle ? (
          <button
            type="button"
            aria-label={toggleLabel}
            aria-pressed={visible}
            aria-controls={props.id}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setVisible(!visible)}
            className={cn(
              controlReset,
              focusRing,
              "absolute inline-flex cursor-pointer items-center justify-center rounded-pui-sm text-pui-muted-foreground transition-colors duration-(--pui-duration-fast)",
              "hover:bg-pui-muted hover:text-pui-foreground active:scale-95 disabled:pointer-events-none",
              toggleSize[size],
            )}
          >
            <Eye revealed={visible} reduced={reduced} className={eyeSize[size]} />
          </button>
        ) : null}
      </div>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {showCaps ? capsLockLabel : ""}
      </span>
      {score !== null ? (
        <div className={cn(blockReset, "flex items-center gap-3")}>
          <div
            id={meterId}
            role="meter"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={empty ? 0 : score}
            aria-valuetext={empty ? "No password" : strengthLabels[score]}
            className={cn(blockReset, "grid flex-1 grid-cols-4 gap-1.5")}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn(blockReset, "relative h-1.5 overflow-hidden rounded-pui-full bg-pui-muted")}>
                <motion.span
                  initial={false}
                  animate={{ scaleX: i < filled ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { ...springs.smooth, delay: i < filled ? i * 0.04 : (3 - i) * 0.03 }}
                  className={cn(
                    blockReset,
                    "absolute inset-0 origin-left rounded-pui-full transition-colors duration-(--pui-duration-base) rtl:origin-right",
                    segmentTone[score],
                  )}
                />
              </span>
            ))}
          </div>
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "min-w-[4.5rem] text-end text-xs font-medium transition-colors duration-(--pui-duration-base)",
              empty ? "text-pui-muted-foreground" : labelTone[score],
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={empty ? "empty" : score}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, transition: { duration: 0.1 } }}
                transition={springs.snappy}
                className={cn(blockReset, "inline-block")}
              >
                {empty ? "Strength" : strengthLabels[score]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      ) : null}
      {rules && rules.length > 0 ? (
        <>
          <ul id={rulesId} aria-label="Password requirements" className={cn(listReset, "grid gap-1 text-xs sm:grid-cols-2")}>
            {rules.map((rule) => {
              const ok = rule.test(value);
              return (
                <li
                  key={rule.label}
                  data-state={ok ? "met" : "unmet"}
                  className={cn(
                    blockReset,
                    "flex items-center gap-1.5 transition-colors duration-(--pui-duration-base)",
                    ok ? "text-pui-success-text" : "text-pui-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      blockReset,
                      "relative inline-flex size-4 shrink-0 items-center justify-center rounded-pui-full border transition-colors duration-(--pui-duration-base)",
                      ok ? "border-transparent bg-pui-success/15" : "border-pui-border",
                    )}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" focusable="false" className={cn(blockReset, "block size-2.5")}>
                      <motion.path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        initial={false}
                        animate={{ pathLength: ok ? 1 : 0, opacity: ok ? 1 : 0 }}
                        transition={reduced ? { duration: 0 } : { ...springs.smooth, opacity: { duration: 0.08 } }}
                      />
                    </svg>
                  </span>
                  <span className={cn(blockReset, "min-w-0")}>
                    {rule.label}
                    <span className={cn(blockReset, "sr-only")}>{ok ? " (met)" : " (not met)"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <span aria-live="polite" className={cn(blockReset, "sr-only")}>
            {empty ? "" : `${met} of ${rules.length} requirements met`}
          </span>
        </>
      ) : null}
    </div>
  );
});
