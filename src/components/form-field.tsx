"use client";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { useFormReset } from "../lib/form";
import { CircleCheckIcon, CircleXIcon } from "../lib/icons";
import { durations, easings } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

/** A message means invalid; anything else (null, undefined, "", false) means valid. */
export type FormFieldValidationResult = string | null | undefined | false;

export type FormFieldStatus = "idle" | "validating" | "valid" | "invalid";

/** Native elements the control props fit. */
export type FormFieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Spread these onto the control: `{(control) => <Input {...control} />}`. */
export interface FormFieldControlProps {
  ref: (element: FormFieldElement | null) => void;
  id: string;
  name?: string;
  value: string;
  /** Takes a change event or a plain string (for custom controls). */
  onChange: (eventOrValue: React.ChangeEvent<FormFieldElement> | string) => void;
  onBlur: (event?: React.FocusEvent<Element>) => void;
  onInvalid: (event: React.FormEvent<Element>) => void;
  required?: boolean;
  disabled?: boolean;
  /** Only when `enforceMaxLength` is set; otherwise the counter lets people overtype and trim. */
  maxLength?: number;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export interface FormFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange" | "id"> {
  label: React.ReactNode;
  /** Help text under the control. An error, check or success message takes its place without moving the layout. */
  hint?: React.ReactNode;
  /** Goes to the control (and the label's htmlFor). Default: generated. */
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Instant checks (format, rules). Runs on blur, then on every change once an error has shown. */
  validate?: (value: string) => FormFieldValidationResult;
  /** Slow checks (is the username free?). Runs after `validate` passes, debounced while typing. Aborted when superseded. */
  validateAsync?: (value: string, context: { signal: AbortSignal }) => Promise<FormFieldValidationResult>;
  /** "blur" (default): quiet until the person leaves the field, then live until it's fixed. "change": live from the first keystroke. */
  validateOn?: "blur" | "change";
  /** ms to wait after typing before `validateAsync` runs. Default 400. */
  debounce?: number;
  required?: boolean;
  /** Default "This field is required". */
  requiredMessage?: string;
  /** Shows a counter; over the limit is an error. */
  maxLength?: number;
  /** Pass maxLength to the control so it can't be exceeded. Default false (overtype, then trim). */
  enforceMaxLength?: boolean;
  /** Shown after a passing check, e.g. "Username is available". */
  successMessage?: React.ReactNode;
  /** Shown while `validateAsync` runs. Default "Checking…". */
  validatingMessage?: React.ReactNode;
  /** An outside error (e.g. from the server). Shown at once and marks the control invalid. */
  error?: React.ReactNode;
  /** Shows "(optional)" after the label. */
  optional?: boolean;
  /** Content at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
  disabled?: boolean;
  /** Called when the status or message changes. */
  onStatusChange?: (status: FormFieldStatus, message: string) => void;
  children: (control: FormFieldControlProps) => React.ReactNode;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

const asMessage = (result: unknown): string => (typeof result === "string" ? result : "");

const valueOf = (input: React.ChangeEvent<FormFieldElement> | string): string => (typeof input === "string" ? input : input.target.value);

/**
 * Label, control, hint and message in one accessible field that validates at the right moment:
 * quiet while you type, checked when you leave, then live until it's fixed. Sync rules show at
 * once, slow `validateAsync` checks are debounced and aborted when superseded, a counter warns
 * near `maxLength`, and the message slot keeps its height so nothing below jumps. The control is
 * yours: spread the render prop onto any input, textarea or select. It also blocks native form
 * submit through setCustomValidity and resets with its form. The ref goes to the wrapper.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  {
    label,
    hint,
    id: idProp,
    name,
    value: valueProp,
    defaultValue = "",
    onValueChange,
    validate,
    validateAsync,
    validateOn = "blur",
    debounce = 400,
    required = false,
    requiredMessage = "This field is required",
    maxLength,
    enforceMaxLength = false,
    successMessage,
    validatingMessage = "Checking…",
    error: errorProp,
    optional = false,
    labelAction,
    disabled = false,
    onStatusChange,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const autoId = React.useId();
  const id = idProp ?? `${autoId}-control`;
  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const [status, setStatus] = React.useState<FormFieldStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [live, setLive] = React.useState(validateOn === "change");
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const controlRef = React.useRef<FormFieldElement | null>(null);
  const [shakeScope, animate] = useAnimate<HTMLDivElement>();
  const run = React.useRef(0);
  const abort = React.useRef<AbortController | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rules = useLatestRef({ validate, validateAsync, required, requiredMessage, maxLength, reduced, status });

  const syncError = React.useCallback(
    (v: string): string => {
      const r = rules.current;
      if (r.required && v.trim() === "") return r.requiredMessage;
      if (r.maxLength !== undefined && v.length > r.maxLength) return `Use ${r.maxLength} characters or fewer`;
      if (v === "" || !r.validate) return "";
      return asMessage(r.validate(v));
    },
    [rules],
  );

  const nudge = React.useCallback(() => {
    if (rules.current.reduced || !shakeScope.current) return;
    void animate(shakeScope.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.36, ease: "easeOut" });
  }, [animate, rules, shakeScope]);

  /** `wait`: debounce the async step (typing). `fromQuiet`: the error is new, so nudge the control. */
  const evaluate = React.useCallback(
    (v: string, wait: boolean) => {
      clearTimeout(timer.current);
      abort.current?.abort();
      const token = ++run.current;
      const wasInvalid = rules.current.status === "invalid";
      const fail = (msg: string) => {
        if (token !== run.current) return;
        setStatus("invalid");
        setMessage(msg);
        setLive(true);
        if (!wasInvalid && !wait) nudge();
      };
      const sync = syncError(v);
      if (sync) return fail(sync);
      const check = rules.current.validateAsync;
      if (v === "") {
        setStatus("idle");
        setMessage("");
        return;
      }
      if (!check) {
        setStatus("valid");
        setMessage("");
        return;
      }
      const start = () => {
        if (token !== run.current) return;
        const controller = new AbortController();
        abort.current = controller;
        setStatus("validating");
        setMessage("");
        let pending: Promise<FormFieldValidationResult>;
        try {
          pending = check(v, { signal: controller.signal });
        } catch (err) {
          return fail(err instanceof Error ? err.message : "Couldn't check this value");
        }
        if (!isThenable(pending)) {
          const msg = asMessage(pending);
          if (msg) return fail(msg);
          setStatus("valid");
          return;
        }
        pending.then(
          (result) => {
            if (token !== run.current || controller.signal.aborted) return;
            const msg = asMessage(result);
            if (msg) return fail(msg);
            setStatus("valid");
            setMessage("");
          },
          (err: unknown) => {
            if (token !== run.current || controller.signal.aborted) return;
            fail(err instanceof Error && err.message ? err.message : "Couldn't check this value");
          },
        );
      };
      if (wait && debounce > 0) {
        // Keep the last verdict on screen while the person is still typing.
        timer.current = setTimeout(start, debounce);
      } else start();
    },
    [debounce, nudge, rules, syncError],
  );

  React.useEffect(
    () => () => {
      clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  const onChange = (input: React.ChangeEvent<FormFieldElement> | string) => {
    const next = valueOf(input);
    setValue(next);
    if (live) evaluate(next, true);
    else if (status !== "idle") {
      // A pass from an earlier blur no longer applies to the new text; stay quiet until the next blur.
      clearTimeout(timer.current);
      abort.current?.abort();
      run.current++;
      setStatus("idle");
      setMessage("");
    }
  };

  const onBlur = () => {
    if (rules.current.status === "validating" && !live) return;
    evaluate(value, false);
  };

  const onInvalid = (event: React.FormEvent<Element>) => {
    // Our message replaces the browser bubble; focus the first invalid control like the browser would.
    event.preventDefault();
    evaluate(value, false);
    const el = controlRef.current;
    const first = el?.form?.querySelector(":invalid");
    if (el && first === el) el.focus();
  };

  useFormReset(rootRef, () => {
    clearTimeout(timer.current);
    abort.current?.abort();
    run.current++;
    setValue(defaultValue);
    setStatus("idle");
    setMessage("");
    setLive(validateOn === "change");
  });

  const hasOutsideError = errorProp !== undefined && errorProp !== null && errorProp !== false && errorProp !== "";
  const shownError: React.ReactNode = hasOutsideError ? errorProp : status === "invalid" ? message : null;
  const invalid = shownError !== null && shownError !== "";

  // Native constraint validation: sync rules block submit even before the first blur.
  const nativeMessage = hasOutsideError ? (typeof errorProp === "string" ? errorProp : "Invalid value") : status === "invalid" ? message : syncError(value);
  useIsomorphicLayoutEffect(() => {
    controlRef.current?.setCustomValidity?.(nativeMessage);
  }, [nativeMessage]);

  const onStatusChangeRef = useLatestRef(onStatusChange);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onStatusChangeRef.current?.(status, message);
  }, [status, message, onStatusChangeRef]);

  const setControlRef = React.useCallback((el: FormFieldElement | null) => {
    controlRef.current = el;
  }, []);

  const setRootRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const length = value.length;
  const remaining = maxLength !== undefined ? maxLength - length : 0;
  const warnAt = maxLength !== undefined ? Math.max(5, Math.ceil(maxLength * 0.1)) : 0;
  const counterTone = maxLength === undefined ? "" : remaining < 0 ? "text-pui-danger-text font-medium" : remaining <= warnAt ? "text-pui-warning-text" : "text-pui-muted-foreground";

  const slot: { key: string; tone: string; icon: React.ReactNode; text: React.ReactNode } | null = invalid
    ? { key: "error", tone: "text-pui-danger-text", icon: <CircleXIcon className="size-3.5" />, text: shownError }
    : status === "validating"
      ? {
          key: "validating",
          tone: "text-pui-muted-foreground",
          icon: <span aria-hidden="true" className={cn(blockReset, "inline-block size-3 rounded-pui-full border-[1.5px] border-current border-t-transparent motion-safe:animate-spin")} />,
          text: validatingMessage,
        }
      : status === "valid" && successMessage
        ? { key: "success", tone: "text-pui-success-text", icon: <CircleCheckIcon className="size-3.5" />, text: successMessage }
        : null;

  const describedBy = [hint ? hintId : null, slot ? messageId : null].filter(Boolean).join(" ") || undefined;

  const control: FormFieldControlProps = {
    ref: setControlRef,
    id,
    name,
    value,
    onChange,
    onBlur,
    onInvalid,
    required: required || undefined,
    disabled: disabled || undefined,
    maxLength: enforceMaxLength ? maxLength : undefined,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": describedBy,
  };

  const transition = reduced ? { duration: durations.fast } : { duration: durations.base, ease: easings.out };

  return (
    <div ref={setRootRef} data-status={invalid ? "invalid" : status} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-1.5 text-pui-foreground", disabled && "opacity-60", className)}>
      <div className={cn(blockReset, "flex min-h-5 items-baseline justify-between gap-3")}>
        <label htmlFor={id} className={cn(blockReset, "text-sm leading-5 font-medium text-pui-foreground", disabled ? "cursor-not-allowed" : "cursor-default")}>
          {label}
          {required ? (
            <span aria-hidden="true" className={cn(blockReset, "ms-0.5 text-pui-danger-text")}>
              *
            </span>
          ) : optional ? (
            <span className={cn(blockReset, "ms-1.5 text-xs font-normal text-pui-muted-foreground")}>(optional)</span>
          ) : null}
        </label>
        {labelAction ? <div className={cn(blockReset, "shrink-0 text-xs")}>{labelAction}</div> : null}
      </div>
      <div ref={shakeScope} className={cn(blockReset, "w-full min-w-0")}>
        {children(control)}
      </div>
      <div className={cn(blockReset, "flex min-h-5 items-start gap-3 text-xs leading-5")}>
        <div aria-live="polite" className={cn(blockReset, "grid min-w-0 flex-1")}>
          {hint ? (
            <p
              id={hintId}
              className={cn(blockReset, "col-start-1 row-start-1 text-pui-muted-foreground transition-opacity duration-(--pui-duration-base)", slot ? "opacity-0" : "opacity-100")}
            >
              {hint}
            </p>
          ) : null}
          <AnimatePresence initial={false}>
            {slot ? (
              <motion.p
                key={slot.key}
                id={messageId}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 2 }}
                transition={transition}
                className={cn(blockReset, "col-start-1 row-start-1 flex min-w-0 items-start gap-1.5", slot.tone)}
              >
                <span aria-hidden="true" className={cn(blockReset, "inline-flex h-5 shrink-0 items-center")}>
                  {slot.icon}
                </span>
                <span className={cn(blockReset, "min-w-0 [overflow-wrap:anywhere]")}>{slot.text}</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
          {maxLength !== undefined && remaining <= warnAt ? (
            <span className={cn(blockReset, "sr-only")}>
              {remaining < 0 ? `${-remaining} ${remaining === -1 ? "character" : "characters"} over the limit` : `${remaining} ${remaining === 1 ? "character" : "characters"} left`}
            </span>
          ) : null}
        </div>
        {maxLength !== undefined ? (
          <motion.span
            aria-hidden="true"
            animate={!reduced && remaining < 0 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: durations.slow }}
            key={remaining < 0 ? "over" : "under"}
            className={cn(blockReset, "shrink-0 tabular-nums transition-colors", counterTone)}
          >
            {length}/{maxLength}
          </motion.span>
        ) : null}
      </div>
    </div>
  );
});
