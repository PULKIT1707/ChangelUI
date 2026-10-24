"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { invalidClasses } from "../lib/field-styles";
import { BoldIcon, CodeIcon, HeadingIcon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon } from "../lib/icons";
import { Markdown } from "../lib/markdown";
import { durations, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type MarkdownTool = "heading" | "bold" | "italic" | "code" | "link" | "quote" | "bulleted" | "numbered";
export type MarkdownEditorMode = "write" | "preview";

export interface MarkdownEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onSubmit"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Controlled Write / Preview tab (defaultMode, onModeChange). */
  mode?: MarkdownEditorMode;
  defaultMode?: MarkdownEditorMode;
  onModeChange?: (mode: MarkdownEditorMode) => void;
  /** Toolbar buttons, in order. Default: all eight. Pass [] to hide the toolbar. */
  tools?: MarkdownTool[];
  placeholder?: string;
  /** Visible rows before the field grows. Default 6. */
  minRows?: number;
  /** Rows after which it scrolls. Default 16. */
  maxRows?: number;
  /** Accessible name of the text field. Default "Markdown". */
  label?: string;
  /** Form field name (the textarea submits the markdown). */
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  /** Fires on Cmd/Ctrl+Enter with the current markdown. */
  onSubmit?: (value: string) => void;
  /** Shows "N words" in the footer. Default true. */
  showCount?: boolean;
  /** Footer content on the right (buttons, status). */
  footer?: React.ReactNode;
  /** Shown in an empty preview. Default "Nothing to preview". */
  emptyPreview?: React.ReactNode;
  /** Extra props for the textarea (id, aria-describedby, autoFocus...). */
  textareaProps?: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange">;
}

export interface MarkdownEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface Replacement {
  start: number;
  end: number;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

const URL_RE = /^(https?:\/\/|mailto:)\S+$/i;

function lineBounds(value: string, start: number, end: number): [number, number] {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nl = value.indexOf("\n", end);
  return [from, nl === -1 ? value.length : nl];
}

function wrap(value: string, start: number, end: number, marker: string, placeholder: string): Replacement {
  const selected = value.slice(start, end);
  const m = marker.length;
  // Toggle off when the selection is already wrapped (inside or outside the markers).
  if (selected.length >= 2 * m && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(m, -m);
    return { start, end, text: inner, selectionStart: start, selectionEnd: start + inner.length };
  }
  if (value.slice(start - m, start) === marker && value.slice(end, end + m) === marker) {
    return { start: start - m, end: end + m, text: selected, selectionStart: start - m, selectionEnd: end - m };
  }
  const inner = selected || placeholder;
  return { start, end, text: `${marker}${inner}${marker}`, selectionStart: start + m, selectionEnd: start + m + inner.length };
}

function prefixLines(value: string, start: number, end: number, kind: "heading" | "quote" | "bulleted" | "numbered"): Replacement {
  const [from, to] = lineBounds(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const patterns = { heading: /^#{1,4}\s+/, quote: /^>\s?/, bulleted: /^\s*[-*+]\s+/, numbered: /^\s*\d+[.)]\s+/ };
  const pattern = patterns[kind];
  const all = lines.every((l) => pattern.test(l) || !l.trim());
  const next = lines.map((l, i) => {
    if (all) return l.replace(pattern, "");
    // Strip any other list or quote marker first, so bulleted <-> numbered switches cleanly.
    const bare = l.replace(/^(\s*[-*+]\s+|\s*\d+[.)]\s+|>\s?|#{1,4}\s+)/, "");
    if (!bare.trim() && lines.length > 1) return l;
    const prefix = kind === "heading" ? "## " : kind === "quote" ? "> " : kind === "bulleted" ? "- " : `${i + 1}. `;
    return prefix + bare;
  });
  const text = next.join("\n");
  const single = lines.length === 1;
  const delta = text.length - (to - from);
  return {
    start: from,
    end: to,
    text,
    selectionStart: single ? Math.max(from, start + delta) : from,
    selectionEnd: single ? Math.max(from, end + delta) : from + text.length,
  };
}

function linkify(value: string, start: number, end: number, url = "https://"): Replacement {
  const selected = value.slice(start, end);
  const label = selected || "link text";
  const text = `[${label}](${url})`;
  // Select the URL when it still needs typing, otherwise the label.
  const urlStart = start + label.length + 3;
  return selected && url === "https://"
    ? { start, end, text, selectionStart: urlStart, selectionEnd: urlStart + url.length }
    : { start, end, text, selectionStart: start + 1, selectionEnd: start + 1 + label.length };
}

function fenceOrCode(value: string, start: number, end: number): Replacement {
  const selected = value.slice(start, end);
  if (selected.includes("\n")) {
    const text = `\`\`\`\n${selected}\n\`\`\``;
    return { start, end, text, selectionStart: start + 4, selectionEnd: start + 4 + selected.length };
  }
  return wrap(value, start, end, "`", "code");
}

/** Pure toolbar edit: applies a tool to `value` at the selection and returns the new value and selection. */
export function applyMarkdownTool(value: string, selectionStart: number, selectionEnd: number, tool: MarkdownTool): MarkdownEdit {
  const r = toolReplacement(value, selectionStart, selectionEnd, tool);
  return { value: value.slice(0, r.start) + r.text + value.slice(r.end), selectionStart: r.selectionStart, selectionEnd: r.selectionEnd };
}

function toolReplacement(value: string, start: number, end: number, tool: MarkdownTool): Replacement {
  switch (tool) {
    case "bold":
      return wrap(value, start, end, "**", "bold text");
    case "italic":
      return wrap(value, start, end, "_", "italic text");
    case "code":
      return fenceOrCode(value, start, end);
    case "link":
      return linkify(value, start, end);
    default:
      return prefixLines(value, start, end, tool);
  }
}

/**
 * What Enter should insert on `line` (the text before the caret on that line): the next list
 * marker, or null when it is not a list. An empty item returns "" (Enter ends the list).
 */
export function continueMarkdownList(line: string): string | null {
  const task = /^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/.exec(line);
  if (task) return task[3]?.trim() ? `${task[1]}${task[2]} [ ] ` : "";
  const bullet = /^(\s*)([-*+])\s+(.*)$/.exec(line);
  if (bullet) return bullet[3]?.trim() ? `${bullet[1]}${bullet[2]} ` : "";
  const ordered = /^(\s*)(\d+)([.)])\s+(.*)$/.exec(line);
  if (ordered) return ordered[4]?.trim() ? `${ordered[1]}${Number(ordered[2]) + 1}${ordered[3]} ` : "";
  const quote = /^(\s*>\s?)(.*)$/.exec(line);
  if (quote) return quote[2]?.trim() ? quote[1] ?? "> " : "";
  return null;
}

const TOOL_META: Record<MarkdownTool, { label: string; icon: React.ReactNode; keys?: string; shortcut?: string }> = {
  heading: { label: "Heading", icon: <HeadingIcon /> },
  bold: { label: "Bold", icon: <BoldIcon />, keys: "b", shortcut: "Control+B Meta+B" },
  italic: { label: "Italic", icon: <ItalicIcon />, keys: "i", shortcut: "Control+I Meta+I" },
  code: { label: "Code", icon: <CodeIcon />, keys: "e", shortcut: "Control+E Meta+E" },
  link: { label: "Link", icon: <LinkIcon />, keys: "k", shortcut: "Control+K Meta+K" },
  quote: { label: "Quote", icon: <QuoteIcon /> },
  bulleted: { label: "Bulleted list", icon: <ListIcon />, keys: "8", shortcut: "Control+Shift+8 Meta+Shift+8" },
  numbered: { label: "Numbered list", icon: <ListOrderedIcon />, keys: "7", shortcut: "Control+Shift+7 Meta+Shift+7" },
};

const DEFAULT_TOOLS: MarkdownTool[] = ["heading", "bold", "italic", "code", "link", "quote", "bulleted", "numbered"];
const GROUP_BREAK: ReadonlySet<MarkdownTool> = new Set(["code", "link"]);

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/**
 * Markdown field that helps instead of just accepting text: a formatting toolbar and shortcuts
 * that wrap or unwrap the selection (Cmd/Ctrl+B, I, E, K), list and quote continuation on Enter
 * (Enter on an empty item ends the list), pasting a URL over selected text makes a link, and a
 * Write / Preview switch rendered by the same safe light-markdown renderer as ChatMessage. Edits
 * go through the browser's undo stack where it allows. The field grows from minRows to maxRows,
 * and the preview keeps the editor's height so nothing jumps. The ref goes to the root.
 */
export const MarkdownEditor = React.forwardRef<HTMLDivElement, MarkdownEditorProps>(function MarkdownEditor(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    mode: modeProp,
    defaultMode = "write",
    onModeChange,
    tools = DEFAULT_TOOLS,
    placeholder = "Write in markdown…",
    minRows = 6,
    maxRows = 16,
    label = "Markdown",
    name,
    disabled = false,
    readOnly = false,
    invalid = false,
    onSubmit,
    showCount = true,
    footer,
    emptyPreview = "Nothing to preview",
    textareaProps,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const [mode, setModeState] = useControllableState<MarkdownEditorMode>({ value: modeProp, defaultValue: defaultMode, onChange: onModeChange, name: "mode" });
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const pendingSelection = React.useRef<[number, number] | null>(null);
  const [height, setHeight] = React.useState<number | null>(null);
  const editable = !disabled && !readOnly;
  const inputId = textareaProps?.id ?? `${id}-input`;

  // Auto-grow between minRows and maxRows. Measured while the textarea is mounted (write mode).
  useIsomorphicLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || 20;
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minRows * line + pad), maxRows * line + pad);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > next + 1 ? "auto" : "hidden";
    setHeight((h) => (h === next ? h : next));
    const sel = pendingSelection.current;
    if (sel) {
      pendingSelection.current = null;
      el.setSelectionRange(sel[0], sel[1]);
    }
  }, [value, minRows, maxRows, mode]);

  const replace = (r: Replacement) => {
    const el = textareaRef.current;
    if (!el || !editable) return;
    el.focus();
    el.setSelectionRange(r.start, r.end);
    // insertText keeps the edit on the native undo stack; jsdom and old engines fall back.
    let done = false;
    try {
      done = typeof document.execCommand === "function" && document.execCommand("insertText", false, r.text);
    } catch {
      done = false;
    }
    if (done && el.value === value.slice(0, r.start) + r.text + value.slice(r.end)) {
      el.setSelectionRange(r.selectionStart, r.selectionEnd);
      return;
    }
    pendingSelection.current = [r.selectionStart, r.selectionEnd];
    setValue(value.slice(0, r.start) + r.text + value.slice(r.end));
  };

  const runTool = (tool: MarkdownTool) => {
    const el = textareaRef.current;
    if (!el) return;
    replace(toolReplacement(value, el.selectionStart, el.selectionEnd, tool));
  };

  const setMode = (next: MarkdownEditorMode) => {
    setModeState(next);
    if (next === "write") requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    textareaProps?.onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const el = event.currentTarget;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key === "Enter") {
      if (onSubmit) {
        event.preventDefault();
        onSubmit(value);
      }
      return;
    }
    if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      setMode("preview");
      return;
    }
    if (mod && !event.altKey && editable) {
      // Shift+7 / Shift+8 report "&" / "*" on most layouts; event.code is layout-stable for digits.
      const key = event.shiftKey ? event.code.replace(/^Digit/, "") : event.key.toLowerCase();
      const tool = tools.find((t) => TOOL_META[t].keys === key && (event.shiftKey === /\d/.test(key)));
      if (tool) {
        event.preventDefault();
        runTool(tool);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !mod && !event.altKey && editable && el.selectionStart === el.selectionEnd) {
      const caret = el.selectionStart;
      const [from] = lineBounds(value, caret, caret);
      const before = value.slice(from, caret);
      const next = continueMarkdownList(before);
      if (next === null) return;
      event.preventDefault();
      if (next === "") {
        // Empty item: drop the marker and leave the list.
        replace({ start: from, end: caret, text: "", selectionStart: from, selectionEnd: from });
      } else {
        const text = `\n${next}`;
        replace({ start: caret, end: caret, text, selectionStart: caret + text.length, selectionEnd: caret + text.length });
      }
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    textareaProps?.onPaste?.(event);
    if (event.defaultPrevented || !editable) return;
    const el = event.currentTarget;
    const text = event.clipboardData.getData("text/plain").trim();
    if (el.selectionStart !== el.selectionEnd && URL_RE.test(text)) {
      event.preventDefault();
      replace(linkify(value, el.selectionStart, el.selectionEnd, text));
    }
  };

  const onToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at === -1) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const fwd = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (at + (fwd ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  const [focusIndex, setFocusIndex] = React.useState(0);
  const words = countWords(value);
  const tabId = (m: MarkdownEditorMode) => `${id}-tab-${m}`;
  const panelId = (m: MarkdownEditorMode) => `${id}-panel-${m}`;
  const tabs: { value: MarkdownEditorMode; label: string }[] = [
    { value: "write", label: "Write" },
    { value: "preview", label: "Preview" },
  ];

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = mode === "write" ? "preview" : "write";
    setModeState(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div
      ref={ref}
      data-mode={mode}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-xl border border-pui-input bg-pui-background text-pui-foreground shadow-pui-xs transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        "focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_22%,transparent)]",
        invalid && invalidClasses,
        disabled && "opacity-60",
        className,
      )}
    >
      <div className={cn(blockReset, "flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-pui-border bg-pui-muted/35 px-2 py-1.5")}>
        <div role="tablist" aria-label={`${label} mode`} className={cn(blockReset, "inline-flex rounded-pui-md bg-pui-muted p-0.5")}>
          {tabs.map((t) => {
            const active = mode === t.value;
            return (
              <button
                key={t.value}
                id={tabId(t.value)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId(t.value)}
                tabIndex={active ? 0 : -1}
                disabled={disabled}
                onClick={() => setMode(t.value)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  controlReset,
                  focusRing,
                  "relative inline-flex h-7 cursor-pointer items-center rounded-pui-sm px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                  active ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={`${id}-mode`}
                    transition={reduced ? { duration: 0 } : springs.snappy}
                    className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-background shadow-pui-xs")}
                  />
                ) : null}
                <span className={cn(blockReset, "relative")}>{t.label}</span>
              </button>
            );
          })}
        </div>
        {tools.length > 0 ? (
          <motion.div
            role="toolbar"
            aria-label="Formatting"
            aria-controls={inputId}
            onKeyDown={onToolbarKeyDown}
            animate={{ opacity: mode === "write" ? 1 : 0.4 }}
            transition={{ duration: reduced ? 0 : durations.base }}
            className={cn(blockReset, "flex flex-wrap items-center gap-0.5")}
          >
            {tools.map((tool, i) => {
              const meta = TOOL_META[tool];
              const hint = meta.keys ? ` (⌘/Ctrl+${meta.keys === "7" || meta.keys === "8" ? `Shift+${meta.keys}` : meta.keys.toUpperCase()})` : "";
              return (
                <React.Fragment key={tool}>
                  {i > 0 && GROUP_BREAK.has(tool) ? <span aria-hidden="true" className={cn(blockReset, "mx-1 h-4 w-px bg-pui-border")} /> : null}
                  <motion.button
                    type="button"
                    aria-label={meta.label}
                    aria-keyshortcuts={meta.shortcut}
                    title={`${meta.label}${hint}`}
                    tabIndex={i === Math.min(focusIndex, tools.length - 1) ? 0 : -1}
                    onFocus={() => setFocusIndex(i)}
                    disabled={!editable || mode !== "write"}
                    // Keep the textarea selection: the button never takes focus on mouse down.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runTool(tool)}
                    whileTap={reduced ? undefined : { scale: 0.88 }}
                    transition={springs.press}
                    className={cn(
                      controlReset,
                      focusRing,
                      "inline-flex size-7 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-background hover:text-pui-foreground hover:shadow-pui-xs disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none [&_svg]:size-3.5",
                    )}
                  >
                    {meta.icon}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </motion.div>
        ) : null}
      </div>
      <div className={cn(blockReset, "relative")}>
        {mode === "write" ? (
          <div id={panelId("write")} role="tabpanel" aria-labelledby={tabId("write")} className={cn(blockReset)}>
            <textarea
              rows={minRows}
              {...textareaProps}
              ref={textareaRef}
              id={inputId}
              name={name}
              aria-label={textareaProps?.["aria-labelledby"] ? undefined : label}
              aria-invalid={invalid || undefined}
              aria-keyshortcuts={onSubmit ? "Control+Enter Meta+Enter" : undefined}
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              spellCheck={textareaProps?.spellCheck ?? true}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              className={cn(
                controlReset,
                "block w-full resize-none bg-transparent px-3.5 py-3 font-mono text-[0.8125rem] leading-6 text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground disabled:cursor-not-allowed",
                textareaProps?.className,
              )}
            />
          </div>
        ) : null}
        {/* name keeps submitting while the preview is shown. */}
        {mode === "preview" && name ? <input type="hidden" name={name} value={value} className={cn(controlReset)} /> : null}
        <AnimatePresence initial={false}>
          {mode === "preview" ? (
            <motion.div
              key="preview"
              id={panelId("preview")}
              role="tabpanel"
              aria-labelledby={tabId("preview")}
              // Focusable so keyboard users can scroll a long preview.
              tabIndex={0}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={reduced ? { duration: durations.fast } : { duration: durations.base }}
              style={height !== null ? { height } : undefined}
              className={cn(blockReset, focusRing, "flex flex-col gap-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-pui-foreground [overflow-wrap:anywhere]", height === null && "min-h-40")}
            >
              {value.trim() ? (
                <Markdown source={value} caret={null} />
              ) : (
                <p className={cn(blockReset, "m-auto text-sm text-pui-muted-foreground")}>{emptyPreview}</p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {showCount || footer ? (
        <div className={cn(blockReset, "flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-pui-border px-3 py-1.5 text-xs text-pui-muted-foreground")}>
          <span className={cn(blockReset, "inline-flex items-center gap-2")}>
            <svg aria-hidden="true" viewBox="0 0 208 128" className={cn(blockReset, "h-3 w-auto fill-current opacity-70")}>
              <path d="M15 113V15h30l30 37 30-37h30v98h-30V57l-30 37-30-37v56zm187-49-45 49-45-49h30V15h30v49z" />
            </svg>
            <span className={cn(blockReset)}>Markdown supported</span>
            {showCount ? (
              <>
                <span aria-hidden="true" className={cn(blockReset)}>·</span>
                <span className={cn(blockReset, "tabular-nums")}>
                  {words} {words === 1 ? "word" : "words"}
                </span>
              </>
            ) : null}
          </span>
          {footer ? <span className={cn(blockReset, "inline-flex items-center gap-2")}>{footer}</span> : null}
        </div>
      ) : null}
    </div>
  );
});
