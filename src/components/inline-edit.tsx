"use client";
import { animate, AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, PencilIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type InlineEditState = "idle" | "editing" | "saving" | "saved" | "error";
export interface InlineEditProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children" | "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag" | "onAnimationEnd" | "onAnimationIteration"> {
  /** The saved value (defaultValue, onValueChange). */
  value?: string;
  defaultValue?: string;
  /** Called with the new value once it is saved. */
  onValueChange?: (value: string) => void;
  /** Persist the draft. Throw or reject to roll back; the error message is shown and the editor reopens. */
  onSave?: (value: string) => void | Promise<void>;
  /** Return true, or false / an error message to block saving. Runs on the trimmed draft. */
  validate?: (value: string) => boolean | string;
  /** Visible label for assistive tech, e.g. "Project name". Required for a good accessible name. */
  label: string;
  /** Shown when the value is empty. Default "Empty". */
  placeholder?: string;
  /** Textarea editor: Enter saves, Shift+Enter adds a line. Default false. */
  multiline?: boolean;
  /** Save when focus leaves the editor (Escape always cancels). Default true. */
  saveOnBlur?: boolean;
  /** Select the text when editing starts. Default true. */
  selectOnEdit?: boolean;
  /** How the saved value is displayed (e.g. currency). The editor always shows the raw value. */
  formatDisplay?: (value: string) => React.ReactNode;
  disabled?: boolean;
  /** Props for the input or textarea (inputMode, maxLength, ...). */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange">;
  /** Called when editing starts or stops. */
  onEditingChange?: (editing: boolean) => void;
}
const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : typeof err === "string" && err ? err : "Couldn't save. Try again.");
/**
 * Click-to-edit text that keeps its layout: the editor sits in the same grid cell as an invisible
 * copy of the draft, so the box never jumps. Enter saves, Escape reverts, blur saves. An async
 * onSave shows the new value optimistically with a pending state, flashes a check on success and on
 * failure rolls back, reopens the editor with the draft and shows the error.
 */
export const InlineEdit = React.forwardRef<HTMLDivElement, InlineEditProps>(function InlineEdit(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onSave,
    validate,
    label,
    placeholder = "Empty",
    multiline = false,
    saveOnBlur = true,
    selectOnEdit = true,
    formatDisplay,
    disabled = false,
    inputProps,
    onEditingChange,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useControllableState<string>({ value: valueProp, defaultValue, onChange: onValueChange });
  const [state, setState] = React.useState<InlineEditState>("idle");
  const [draft, setDraft] = React.useState(value);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const fieldRef = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocus = React.useRef(false);
  /** Set once Enter, Escape or blur has closed this edit, so the unmount blur can't save twice. */
  const closing = React.useRef(false);
  const errorId = React.useId();
  const editing = state === "editing" || state === "error";
  const setEditing = (next: InlineEditState) => {
    const was = editing;
    setState(next);
    const now = next === "editing" || next === "error";
    if (was !== now) onEditingChange?.(now);
  };
  const selectRef = useLatestRef(selectOnEdit);
  // Focus the editor when it opens and the trigger when it closes from the keyboard.
  React.useEffect(() => {
    if (editing) {
      const el = fieldRef.current;
      if (!el) return;
      el.focus();
      if (selectRef.current) el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [editing, selectRef]);
  React.useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1400);
    return () => clearTimeout(t);
  }, [state]);
  const shake = () => {
    const el = fieldRef.current?.parentElement;
    if (!el || reduced) return;
    void animate(el, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.32, ease: "easeInOut" });
  };
  const start = () => {
    if (disabled || state === "saving") return;
    closing.current = false;
    setDraft(value);
    setError(null);
    setEditing("editing");
  };
  const cancel = (focusTrigger: boolean) => {
    closing.current = true;
    restoreFocus.current = focusTrigger;
    setDraft(value);
    setError(null);
    setEditing("idle");
  };
  const commit = async (focusTrigger: boolean) => {
    if (closing.current) return;
    const next = multiline ? draft.replace(/\s+$/, "") : draft.trim();
    const verdict = validate ? validate(next) : true;
    if (verdict !== true) {
      const message = typeof verdict === "string" ? verdict : "Enter a valid value";
      setError(message);
      setState("error");
      setAnnouncement(message);
      shake();
      return;
    }
    closing.current = true;
    restoreFocus.current = focusTrigger;
    if (next === value) {
      setEditing("idle");
      return;
    }
    if (!onSave) {
      setValue(next);
      setEditing("saved");
      setAnnouncement(`${label} saved`);
      return;
    }
    const previous = value;
    setPending(next);
    setEditing("saving");
    setAnnouncement(`Saving ${label}`);
    try {
      await onSave(next);
      setPending(null);
      setValue(next);
      setState("saved");
      setAnnouncement(`${label} saved`);
    } catch (err) {
      const message = errorText(err);
      setPending(null);
      setValue(previous);
      setDraft(next);
      setError(message);
      closing.current = false;
      restoreFocus.current = false;
      setEditing("error");
      setAnnouncement(`${label} not saved: ${message}`);
    }
  };
  const shown = pending ?? value;
  const Field = multiline ? "textarea" : "input";
  const sizer = (editing ? draft : shown) || placeholder;
  return (
    <div
      ref={ref}
      data-state={state}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, "inline-block max-w-full min-w-0 align-top", className)}
    >
      {editing ? (
        <span
          className={cn(
            blockReset,
            "relative -mx-1.5 -my-0.5 inline-grid max-w-[calc(100%+0.75rem)] min-w-[6ch] rounded-pui-md bg-pui-background px-1.5 py-0.5 align-top ring-2 ring-pui-ring/60",
            state === "error" && "ring-pui-danger/70",
          )}
        >
          {/* Invisible copy of the draft sizes the editor so the layout doesn't jump. */}
          <span aria-hidden="true" className={cn(blockReset, "invisible col-start-1 row-start-1 pe-px", multiline ? "whitespace-pre-wrap break-words" : "overflow-hidden whitespace-pre")}>
            {sizer}
            {multiline ? "\u200b" : ""}
          </span>
          <Field
            ref={fieldRef}
            aria-label={label}
            aria-invalid={state === "error" || undefined}
            aria-describedby={error ? errorId : undefined}
            rows={multiline ? 1 : undefined}
            // Tiny intrinsic size so the invisible sizer, not the browser default width, sets the box.
            size={multiline ? undefined : 1}
            cols={multiline ? 1 : undefined}
            {...inputProps}
            value={draft}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              setDraft(event.target.value);
              if (state === "error") {
                setError(null);
                setState("editing");
              }
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>) => {
              inputProps?.onKeyDown?.(event);
              if (event.defaultPrevented || event.nativeEvent.isComposing) return;
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                cancel(true);
              } else if (event.key === "Enter" && !(multiline && event.shiftKey)) {
                event.preventDefault();
                void commit(true);
              }
            }}
            onBlur={(event: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
              inputProps?.onBlur?.(event);
              if (!editing || closing.current) return;
              if (saveOnBlur) void commit(false);
              else cancel(false);
            }}
            className={cn(
              controlReset,
              "col-start-1 row-start-1 w-full min-w-0 resize-none overflow-hidden bg-transparent text-inherit outline-hidden placeholder:text-pui-muted-foreground",
              inputProps?.className,
            )}
            placeholder={placeholder}
          />
        </span>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${shown || placeholder}. Edit`}
          aria-busy={state === "saving" || undefined}
          onClick={start}
          className={cn(
            controlReset,
            focusRing,
            "group/edit relative -mx-1.5 -my-0.5 inline-flex max-w-[calc(100%+0.75rem)] cursor-text items-start gap-1.5 rounded-pui-md px-1.5 py-0.5 text-start align-top",
            "transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted/70 disabled:cursor-default disabled:hover:bg-transparent",
          )}
        >
          <span
            className={cn(
              blockReset,
              "min-w-0 whitespace-pre-wrap break-words transition-opacity duration-(--pui-duration-base)",
              !shown && "text-pui-muted-foreground italic",
              state === "saving" && "opacity-60",
            )}
          >
            {shown ? (formatDisplay ? formatDisplay(shown) : shown) : placeholder}
          </span>
          <span aria-hidden="true" className={cn(blockReset, "relative mt-[0.3em] flex size-[0.9em] min-h-3 min-w-3 shrink-0 items-center justify-center")}>
            <AnimatePresence initial={false} mode="popLayout">
              {state === "saving" ? (
                <motion.span
                  key="saving"
                  initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(blockReset, "block size-full animate-spin rounded-pui-full border-2 border-pui-muted-foreground/30 border-t-pui-primary motion-reduce:[animation-duration:1.5s]")}
                />
              ) : state === "saved" ? (
                <motion.span
                  key="saved"
                  initial={reduced ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springs.bouncy}
                  className={cn(blockReset, "text-pui-success-text")}
                >
                  <CheckIcon className="size-full" />
                </motion.span>
              ) : (
                <span
                  key="pencil"
                  className={cn(
                    blockReset,
                    "text-pui-muted-foreground opacity-0 transition-opacity duration-(--pui-duration-fast) group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100 group-disabled/edit:hidden",
                  )}
                >
                  <PencilIcon className="size-full" />
                </span>
              )}
            </AnimatePresence>
          </span>
        </button>
      )}
      {error ? (
        <motion.span
          id={errorId}
          initial={reduced ? false : { opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(blockReset, "mt-1 block text-xs text-pui-danger-text")}
        >
          {error}
        </motion.span>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});
