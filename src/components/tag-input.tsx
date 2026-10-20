"use client";

import { animate, AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { invalidClasses } from "../lib/field-styles";
import { useFormReset } from "../lib/form";
import { springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { MotionSafeHTMLProps, Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Chip } from "./chip";

export type TagInputRejectReason = "duplicate" | "invalid" | "max";

export interface TagInputProps
  extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Keys or characters that commit the typed text. "Enter" and "Tab" are keys; others split pasted text too. Default [",", "Enter"]. */
  separators?: readonly string[];
  /** Return false (or an error message) to reject a tag. Runs after `normalize`. */
  validate?: (tag: string, tags: readonly string[]) => boolean | string;
  /** Turns typed text into the stored tag. Default: trim. */
  normalize?: (raw: string) => string;
  /** Most tags; the field shows a "n/max" counter. */
  max?: number;
  /** Allow the same tag twice. Default false (the existing chip flashes instead). */
  allowDuplicates?: boolean;
  /** Inline ghost completion from this list; Tab or ArrowRight accepts it. */
  suggestions?: readonly string[];
  /** Commit the typed text when the field loses focus. Default false. */
  addOnBlur?: boolean;
  /** Called when a tag is rejected, with the reason (and the validate message for "invalid"). */
  onReject?: (tag: string, reason: TagInputRejectReason, message?: string) => void;
  /** Chip tone, or a function per tag. Default "primary". */
  tone?: Tone | ((tag: string) => Tone);
  /** Default "Add a tag…" ("Add more…" after the first). */
  placeholder?: string;
  /** Default "md". */
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  /** One hidden form input per tag with this name; form reset restores defaultValue. */
  name?: string;
  /** Accessible name of each remove button. Default (tag) => `Remove ${tag}`. */
  removeLabel?: (tag: string) => string;
  /** Accessible name of the tag list. Default "Tags". */
  listLabel?: string;
  /** Props for the text input (id for a <label htmlFor>, aria-label, ...). */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size">;
}

const minHeights: Record<Size, string> = { sm: "min-h-8 gap-1 p-1 ps-1.5", md: "min-h-9 gap-1 p-1 ps-1.5", lg: "min-h-11 gap-1.5 p-1.5 ps-2" };
const defaultSeparators = [",", "Enter"] as const;
const KEY_SEPARATORS = new Set(["Enter", "Tab"]);

/** Splits pasted text on the character separators (and newlines). */
function splitText(text: string, separators: readonly string[]): string[] {
  const chars = separators.filter((s) => !KEY_SEPARATORS.has(s));
  let parts = [text];
  for (const sep of [...chars, "\n", "\r"]) parts = parts.flatMap((p) => p.split(sep));
  return parts;
}

/**
 * Free-text tags (roadmap W2): Enter or comma commits, pasted lists split into many tags,
 * duplicates flash the chip that already exists, invalid text shakes, Backspace pulls the last tag
 * back into the field for editing and an inline ghost completion (Tab) suggests known tags.
 */
export const TagInput = React.forwardRef<HTMLDivElement, TagInputProps>(function TagInput(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    separators = defaultSeparators,
    validate,
    normalize = (raw) => raw.trim(),
    max,
    allowDuplicates = false,
    suggestions,
    addOnBlur = false,
    onReject,
    tone = "primary",
    placeholder = "Add a tag…",
    size = "md",
    disabled = false,
    invalid = false,
    name,
    removeLabel = (tag) => `Remove ${tag}`,
    listLabel = "Tags",
    inputProps,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const [tags, setTags] = useControllableState<string[]>({
    value: valueProp,
    defaultValue: defaultValue ?? [],
    onChange: onValueChange,
  });
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  useFormReset(rootRef, () => setTags(defaultValue ?? []));

  const atMax = max !== undefined && tags.length >= max;
  const fold = (s: string) => s.toLocaleLowerCase();

  const shake = () => {
    const el = inputRef.current;
    if (!el || reduced) return;
    void animate(el, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35, ease: "easeInOut" });
  };

  const flash = (index: number) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-tag-index="${index}"]`);
    if (!el || reduced) return;
    void animate(el, { scale: [1, 1.14, 1] }, { duration: 0.4, ease: "easeOut" });
  };

  /** Tries to add each raw string; returns the text that could not be added (kept in the field). */
  const addMany = (raws: readonly string[]): string => {
    let next = tags;
    let leftover = "";
    let added = 0;
    for (const raw of raws) {
      const tag = normalize(raw);
      if (tag === "") continue;
      if (max !== undefined && next.length >= max) {
        onReject?.(tag, "max");
        setError(`At most ${max} tags`);
        shake();
        leftover = leftover || raw.trim();
        break;
      }
      const dupe = next.findIndex((t) => fold(t) === fold(tag));
      if (!allowDuplicates && dupe !== -1) {
        onReject?.(tag, "duplicate");
        setError(`“${tag}” is already added`);
        flash(dupe);
        continue;
      }
      const verdict = validate ? validate(tag, next) : true;
      if (verdict !== true) {
        const message = typeof verdict === "string" ? verdict : `“${tag}” is not valid`;
        onReject?.(tag, "invalid", message);
        setError(message);
        shake();
        leftover = leftover || raw.trim();
        continue;
      }
      next = [...next, tag];
      added++;
    }
    if (added > 0) {
      setTags(next);
      setAnnouncement(added === 1 ? `Added ${next[next.length - 1]}` : `Added ${added} tags`);
    }
    return leftover;
  };

  const commitInput = () => {
    if (input.trim() === "") return false;
    const leftover = addMany([input]);
    setInput(leftover);
    return true;
  };

  const removeAt = (index: number) => {
    const tag = tags[index];
    setTags(tags.filter((_, i) => i !== index));
    setAnnouncement(`Removed ${tag}`);
    setError(null);
    inputRef.current?.focus();
  };

  // Inline completion: the first suggestion that starts with the text and is not already a tag.
  const query = input.trimStart();
  const completion =
    suggestions && query !== ""
      ? suggestions.find(
          (s) => fold(s).startsWith(fold(query)) && fold(s) !== fold(query) && !tags.some((t) => fold(t) === fold(s)),
        )
      : undefined;
  const ghost = completion ? completion.slice(query.length) : "";

  const toneOf = (tag: string): Tone => (typeof tone === "function" ? tone(tag) : tone);
  const chipSize = size === "lg" ? "md" : "sm";

  return (
    <div
      ref={mergedRef}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid || error ? "" : undefined}
      aria-disabled={disabled || undefined}
      {...props}
      onClick={composeEventHandlers(onClick, (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || (event.target as HTMLElement).closest("button")) return;
        inputRef.current?.focus();
      })}
      className={cn(
        blockReset,
        "relative flex w-full min-w-0 cursor-text flex-wrap items-center rounded-pui-md border border-pui-input bg-transparent text-pui-foreground shadow-pui-xs transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        "focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
        minHeights[size],
        textSize[size],
        max !== undefined && "pe-12",
        disabled && "pointer-events-none opacity-50",
        invalid && invalidClasses,
        className,
      )}
    >
      <div role="list" aria-label={listLabel} className={cn(blockReset, "contents")}>
        <AnimatePresence initial={false} mode="popLayout">
          {tags.map((tag, index) => (
            <Chip
              key={`${tag}\u0000${tags.slice(0, index).filter((t) => t === tag).length}`}
              role="listitem"
              data-tag-index={index}
              size={chipSize}
              tone={toneOf(tag)}
              variant="soft"
              onRemove={() => removeAt(index)}
              removeLabel={removeLabel(tag)}
              disabled={disabled}
              className="max-w-[14rem]"
            >
              <span className={cn(blockReset, "truncate")}>{tag}</span>
            </Chip>
          ))}
        </AnimatePresence>
      </div>
      <span className={cn(blockReset, "relative flex min-w-[8ch] flex-1 items-center")}>
        {ghost ? (
          <span
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute inset-y-0 start-0 flex items-center overflow-hidden whitespace-pre px-1.5")}
          >
            <span className={cn(blockReset, "invisible")}>{input}</span>
            <span className={cn(blockReset, "text-pui-muted-foreground/70")}>{ghost}</span>
            <span
              className={cn(
                blockReset,
                "ms-1.5 rounded-pui-sm border border-pui-border px-1 font-mono text-[0.65rem] leading-4 text-pui-muted-foreground",
              )}
            >
              Tab
            </span>
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="enter"
          disabled={disabled}
          aria-invalid={invalid || error !== null || undefined}
          placeholder={atMax ? "" : tags.length > 0 ? "Add more…" : placeholder}
          {...inputProps}
          value={input}
          onChange={(event) => {
            const text = event.target.value;
            setError(null);
            // A typed character separator commits everything before it.
            const parts = splitText(text, separators);
            if (parts.length > 1) {
              const rest = parts.pop() ?? "";
              const leftover = addMany(parts);
              setInput(leftover || rest);
            } else setInput(text);
          }}
          onPaste={(event) => {
            inputProps?.onPaste?.(event);
            if (event.defaultPrevented) return;
            const text = event.clipboardData.getData("text");
            const parts = splitText(text, separators);
            if (parts.length < 2) return;
            event.preventDefault();
            setInput(addMany([input + (parts[0] ?? ""), ...parts.slice(1)]));
          }}
          onBlur={(event) => {
            inputProps?.onBlur?.(event);
            if (addOnBlur) commitInput();
          }}
          onKeyDown={(event) => {
            inputProps?.onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            const { key } = event;
            if (ghost && (key === "Tab" || (key === "ArrowRight" && event.currentTarget.selectionStart === input.length))) {
              event.preventDefault();
              setInput(completion ?? input);
              return;
            }
            if (KEY_SEPARATORS.has(key) && separators.includes(key)) {
              if (key === "Tab" && input.trim() === "") return;
              event.preventDefault();
              commitInput();
            } else if (key === "Backspace" && input === "" && tags.length > 0) {
              // Pull the last tag back into the field for editing.
              event.preventDefault();
              const last = tags[tags.length - 1] ?? "";
              setTags(tags.slice(0, -1));
              setInput(last);
              setAnnouncement(`Editing ${last}`);
            } else if (key === "Escape" && (input !== "" || error)) {
              event.preventDefault();
              setInput("");
              setError(null);
            }
          }}
          className={cn(
            controlReset,
            "relative h-7 w-full min-w-0 bg-transparent px-1.5 text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground",
            error !== null && "text-pui-danger-text",
            inputProps?.className,
          )}
        />
      </span>
      {max !== undefined ? (
        <motion.span
          aria-hidden="true"
          animate={{ scale: atMax && !reduced ? [1, 1.15, 1] : 1 }}
          transition={atMax ? { duration: 0.3 } : springs.snappy}
          className={cn(
            blockReset,
            "pointer-events-none absolute end-2.5 top-1/2 -mt-2 text-xs leading-4 tabular-nums",
            atMax ? "font-medium text-pui-warning-text" : "text-pui-muted-foreground",
          )}
        >
          {tags.length}/{max}
        </motion.span>
      ) : null}
      {name !== undefined ? tags.map((tag, i) => <input key={`${i}-${tag}`} type="hidden" name={name} value={tag} />) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {error ?? announcement}
      </span>
    </div>
  );
});
