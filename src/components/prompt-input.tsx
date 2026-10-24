"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ArrowUpIcon, FileIcon, PaperclipIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { formatBytes } from "./file-dropzone";
import { Textarea, type TextareaProps } from "./textarea";
export type PromptInputStatus = "idle" | "submitted" | "streaming";
export interface PromptInputMessage {
  text: string;
  files: File[];
}
export interface PromptInputProps
  extends Omit<React.HTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue" | "onChange" | "children"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Enter or the send button. Return false (or resolve false) to keep the text and files. */
  onSubmit?: (message: PromptInputMessage) => void | boolean | Promise<void | boolean>;
  /** "submitted": waiting for the first token (spinner). "streaming": the send button becomes Stop. Default "idle". */
  status?: PromptInputStatus;
  /** Called by the Stop button (and Escape) while streaming. */
  onStop?: () => void;
  /** Default "Ask anything…". */
  placeholder?: string;
  /** Accessible name of the text field. Default "Message". */
  label?: string;
  /** Starter prompts shown as pills while the field is empty. */
  suggestions?: readonly string[];
  /** Default: put the suggestion in the field and focus it. */
  onSuggestionSelect?: (suggestion: string) => void;
  /** Show the attach button and accept pasted or dropped files. Default true. */
  allowAttachments?: boolean;
  /** Input accept syntax, e.g. "image/*,.pdf". */
  accept?: string;
  /** Default 10. */
  maxFiles?: number;
  /** Largest file in bytes. */
  maxFileSize?: number;
  /** Called with a short reason when files are refused. */
  onFilesRejected?: (files: File[], message: string) => void;
  /** Called whenever the attachments change. */
  onFilesChange?: (files: File[]) => void;
  /** Slot left of the send button: model picker, tool toggles, ... */
  footer?: React.ReactNode;
  /** Most rows before the field scrolls. Default 8. */
  maxRows?: number;
  /** Shows a counter near the limit. */
  maxLength?: number;
  disabled?: boolean;
  /** Props for the textarea. */
  textareaProps?: Omit<TextareaProps, "value" | "defaultValue" | "onChange" | "autoResize" | "maxRows" | "minRows">;
}
interface Attachment {
  id: string;
  file: File;
  url: string | null;
}
const tokensOf = (accept?: string) =>
  (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
function accepts(file: File, tokens: string[]) {
  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) => (t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t));
}
let seq = 0;
/**
 * AI chat composer: an auto-growing field where Enter sends and Shift+Enter adds a line (IME-safe),
 * attachment chips with image thumbnails from paste, drop or the paperclip, starter suggestion pills,
 * a footer slot for model pickers and a send button that morphs into Stop while a reply streams.
 */
export const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(function PromptInput(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onSubmit,
    status = "idle",
    onStop,
    placeholder = "Ask anything…",
    label = "Message",
    suggestions,
    onSuggestionSelect,
    allowAttachments = true,
    accept,
    maxFiles = 10,
    maxFileSize,
    onFilesRejected,
    onFilesChange,
    footer,
    maxRows = 8,
    maxLength,
    disabled = false,
    textareaProps,
    className,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [text, setText] = useControllableState<string>({ value: valueProp, defaultValue, onChange: onValueChange });
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);
  const noticeId = React.useId();
  const tokens = React.useMemo(() => tokensOf(accept), [accept]);
  const busy = status !== "idle";
  const canSend = !disabled && !busy && (text.trim() !== "" || files.length > 0);
  // Revoke thumbnail URLs when attachments leave or the composer unmounts.
  const filesRef = useLatestRef(files);
  React.useEffect(() => () => filesRef.current.forEach((a) => a.url && URL.revokeObjectURL(a.url)), [filesRef]);
  const updateFiles = (next: Attachment[]) => {
    setFiles(next);
    onFilesChange?.(next.map((a) => a.file));
  };
  const addFiles = (incoming: readonly File[]) => {
    if (!allowAttachments || disabled || incoming.length === 0) return;
    const ok: Attachment[] = [];
    const refused: File[] = [];
    let reason = "";
    for (const file of incoming) {
      if (!accepts(file, tokens)) {
        refused.push(file);
        reason = `${file.name} isn't a supported file type`;
      } else if (maxFileSize !== undefined && file.size > maxFileSize) {
        refused.push(file);
        reason = `${file.name} is larger than ${formatBytes(maxFileSize)}`;
      } else if (files.length + ok.length >= maxFiles) {
        refused.push(file);
        reason = `You can attach up to ${maxFiles} files`;
      } else {
        const url = file.type.startsWith("image/") && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
        ok.push({ id: `pui-att-${++seq}`, file, url });
      }
    }
    if (ok.length) updateFiles([...files, ...ok]);
    setNotice(refused.length ? reason : null);
    if (refused.length) onFilesRejected?.(refused, reason);
    setAnnouncement(
      [ok.length ? `Attached ${ok.length === 1 ? (ok[0]?.file.name ?? "1 file") : `${ok.length} files`}` : "", refused.length ? reason : ""]
        .filter(Boolean)
        .join(". "),
    );
  };
  const removeFile = (id: string) => {
    const gone = files.find((a) => a.id === id);
    if (gone?.url) URL.revokeObjectURL(gone.url);
    updateFiles(files.filter((a) => a.id !== id));
    setAnnouncement(`Removed ${gone?.file.name ?? "file"}`);
    setNotice(null);
    textareaRef.current?.focus();
  };
  const submit = async () => {
    if (!canSend) return;
    const message = { text: text.trim(), files: files.map((a) => a.file) };
    const result = await onSubmit?.(message);
    if (result === false) return;
    setText("");
    files.forEach((a) => a.url && URL.revokeObjectURL(a.url));
    updateFiles([]);
    setNotice(null);
  };
  const showSuggestions = suggestions && suggestions.length > 0 && text === "" && files.length === 0 && !busy;
  const nearLimit = maxLength !== undefined && text.length >= maxLength * 0.8;
  return (
    <form
      ref={ref}
      data-status={status}
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      onDragEnter={(event) => {
        onDragEnter?.(event);
        if (!allowAttachments || disabled || !event.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        onDragOver?.(event);
        if (allowAttachments && !disabled && event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={(event) => {
        onDragLeave?.(event);
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        onDrop?.(event);
        if (!allowAttachments || disabled) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(blockReset, "flex w-full min-w-0 flex-col gap-2.5", className)}
    >
      <AnimatePresence initial={false}>
        {showSuggestions ? (
          <motion.ul
            key="suggestions"
            aria-label="Suggestions"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4 }}
            transition={springs.smooth}
            className={cn(listReset, "flex flex-wrap gap-2")}
          >
            {suggestions.map((s) => (
              <li key={s} className={cn(blockReset, "flex")}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (onSuggestionSelect) onSuggestionSelect(s);
                    else {
                      setText(s);
                      requestAnimationFrame(() => textareaRef.current?.focus());
                    }
                  }}
                  className={cn(
                    controlReset,
                    focusRing,
                    "cursor-pointer rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1.5 text-xs text-pui-surface-foreground shadow-pui-xs transition-[background-color,transform] duration-(--pui-duration-fast) hover:bg-pui-muted active:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
      <div
        className={cn(
          blockReset,
          "relative flex flex-col rounded-pui-xl border border-pui-input bg-pui-surface text-pui-surface-foreground shadow-pui-sm transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
          "focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_22%,transparent),var(--pui-shadow-sm)]",
          dragging && "border-dashed border-pui-primary",
          disabled && "opacity-60",
        )}
      >
        {files.length > 0 ? (
          <ul aria-label="Attachments" className={cn(listReset, "flex flex-wrap gap-2 px-3 pt-3")}>
            <AnimatePresence initial={false} mode="popLayout">
              {files.map((a) => (
                <motion.li
                  key={a.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.85 }}
                  transition={springs.snappy}
                  className={cn(
                    blockReset,
                    "group/att relative flex max-w-[14rem] items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-background py-1.5 ps-1.5 pe-7",
                  )}
                >
                  {a.url ? (
                    <img src={a.url} alt="" className={cn(blockReset, "size-8 shrink-0 rounded-pui-md object-cover")} />
                  ) : (
                    <span aria-hidden="true" className={cn(blockReset, "flex size-8 shrink-0 items-center justify-center rounded-pui-md bg-pui-muted text-pui-muted-foreground")}>
                      <FileIcon className="size-4" />
                    </span>
                  )}
                  <span className={cn(blockReset, "flex min-w-0 flex-col")}>
                    <span className={cn(blockReset, "truncate text-xs font-medium text-pui-foreground")}>{a.file.name}</span>
                    <span className={cn(blockReset, "text-[0.7rem] text-pui-muted-foreground tabular-nums")}>{formatBytes(a.file.size)}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${a.file.name}`}
                    onClick={() => removeFile(a.id)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "absolute end-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-pui-full text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground",
                    )}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : null}
        <Textarea
          ref={textareaRef}
          aria-label={label}
          aria-describedby={notice ? noticeId : undefined}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          {...textareaProps}
          value={text}
          autoResize
          minRows={1}
          maxRows={maxRows}
          onChange={(event) => setText(event.target.value)}
          onPaste={(event) => {
            textareaProps?.onPaste?.(event);
            if (event.defaultPrevented || !allowAttachments) return;
            const pasted = Array.from(event.clipboardData.files);
            if (pasted.length) {
              event.preventDefault();
              addFiles(pasted);
            }
          }}
          onKeyDown={(event) => {
            textareaProps?.onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            } else if (event.key === "Escape" && status === "streaming" && onStop) {
              event.preventDefault();
              onStop();
            }
          }}
          className={cn(
            "border-0 bg-transparent px-3.5 pt-3 pb-1 text-sm leading-6 shadow-none focus-visible:border-0 focus-visible:shadow-none",
            textareaProps?.className,
          )}
        />
        <div className={cn(blockReset, "flex items-center gap-1.5 px-2 pb-2")}>
          {allowAttachments ? (
            <>
              <button
                type="button"
                aria-label="Attach files"
                title="Attach files"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  controlReset,
                  focusRing,
                  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pui-full text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground disabled:pointer-events-none",
                )}
              >
                <PaperclipIcon className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple={maxFiles > 1}
                accept={accept}
                tabIndex={-1}
                aria-hidden="true"
                className={cn(controlReset, "sr-only")}
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </>
          ) : null}
          <div className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-1.5")}>{footer}</div>
          {maxLength !== undefined && nearLimit ? (
            <span
              aria-hidden="true"
              className={cn(blockReset, "text-xs tabular-nums", text.length >= maxLength ? "text-pui-danger-text" : "text-pui-muted-foreground")}
            >
              {maxLength - text.length}
            </span>
          ) : null}
          <SendButton status={status} canSend={canSend} disabled={disabled} reduced={reduced} onStop={onStop} />
        </div>
        <AnimatePresence>
          {dragging ? (
            <motion.div
              key="drop"
              aria-hidden="true"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                blockReset,
                "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-pui-xl bg-pui-surface/90 text-sm font-medium text-pui-primary-text",
              )}
            >
              <PaperclipIcon className="size-4" />
              Drop files to attach
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {notice ? (
        <p id={noticeId} className={cn(blockReset, "px-1 text-xs text-pui-danger-text")}>
          {notice}
        </p>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement || (status === "streaming" ? "Generating a reply" : "")}
      </span>
    </form>
  );
});
function SendButton({
  status,
  canSend,
  disabled,
  reduced,
  onStop,
}: {
  status: PromptInputStatus;
  canSend: boolean;
  disabled: boolean;
  reduced: boolean;
  onStop?: () => void;
}) {
  const streaming = status === "streaming";
  const submitted = status === "submitted";
  const stoppable = streaming && onStop !== undefined;
  const icon = { initial: reduced ? false : { opacity: 0, scale: 0.5, rotate: -45 }, animate: { opacity: 1, scale: 1, rotate: 0 }, exit: reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.5, rotate: 45 }, transition: springs.snappy } as const;
  return (
    <button
      type={stoppable ? "button" : "submit"}
      aria-label={stoppable ? "Stop generating" : submitted ? "Sending" : "Send message"}
      disabled={disabled || (stoppable ? false : !canSend)}
      onClick={stoppable ? onStop : undefined}
      className={cn(
        controlReset,
        focusRing,
        "relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-pui-full bg-pui-primary text-pui-primary-foreground shadow-pui-xs transition-[background-color,opacity,transform] duration-(--pui-duration-fast) hover:bg-pui-primary/90 active:scale-95 motion-reduce:active:scale-100",
        "disabled:cursor-default disabled:bg-pui-muted disabled:text-pui-muted-foreground disabled:shadow-none",
        stoppable && "bg-pui-foreground text-pui-background hover:bg-pui-foreground/85",
      )}
    >
      {streaming || submitted ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "absolute inset-0.5 animate-spin rounded-pui-full border-2 border-transparent border-t-current opacity-60 motion-reduce:[animation-duration:1.5s]",
          )}
        />
      ) : null}
      <AnimatePresence initial={false} mode="popLayout">
        {stoppable ? (
          <motion.span key="stop" {...icon} className={cn(blockReset, "block size-2.5 rounded-[2px] bg-current")} />
        ) : (
          <motion.span key="send" {...icon} className={cn(blockReset, "flex")}>
            <ArrowUpIcon className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
