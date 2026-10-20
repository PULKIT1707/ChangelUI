"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { hiddenInputClasses } from "../lib/form";
import { CheckIcon, CircleXIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Progress } from "./progress";

export type FileRejectionReason = "type" | "size" | "count";

export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
  message: string;
}

export type DropzoneFileStatus = "queued" | "uploading" | "done" | "error";

/** A row in the file list. Pass `file` or at least `name` and `size`. */
export interface DropzoneFile {
  id: string;
  file?: File;
  name?: string;
  size?: number;
  type?: string;
  /** 0-100; null shows an indeterminate bar. Shown while status is "uploading". */
  progress?: number | null;
  /** Default "done". */
  status?: DropzoneFileStatus;
  error?: string;
  /** Thumbnail URL; image Files get an object-URL thumbnail automatically. */
  preview?: string;
}

export interface FileDropzoneProps
  extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "onDrop" | "onChange" | "title" | "children"> {
  /** Same syntax as the input accept attribute: "image/*,.pdf,application/zip". */
  accept?: string;
  /** Files above this size are rejected. */
  maxSizeBytes?: number;
  /** Total file limit, counting the current `files`. */
  maxFiles?: number;
  /** Default true. */
  multiple?: boolean;
  disabled?: boolean;
  /** Accepted files of a drop, paste or browse. */
  onFilesChange?: (files: File[]) => void;
  /** Accepted and rejected files of each drop. */
  onDrop?: (accepted: File[], rejected: FileRejection[]) => void;
  /** File list rendered under the zone (progress, status, remove). */
  files?: DropzoneFile[];
  /** Shows a remove button per file. */
  onRemove?: (id: string) => void;
  /** Main line. Default "Drop files here". */
  title?: React.ReactNode;
  /** Second line. Default: built from accept / maxSizeBytes / maxFiles. */
  description?: React.ReactNode;
  /** Browse button text. Default "Browse files". */
  browseLabel?: string;
  /** Also accept files pasted while the zone has focus. Default true. */
  acceptPaste?: boolean;
  /** Form field name for the native input. */
  name?: string;
  /** Replace the default zone content. */
  children?: React.ReactNode;
  /** Padding and icon size. Default "md". */
  size?: "sm" | "md";
}

/** "1.4 MB" style sizes (base 1024). */
export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(digits).replace(/\.0$/, "")} ${units[unit]}`;
}

function parseAccept(accept: string | undefined): string[] {
  return (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function matchesAccept(name: string, type: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const lowerName = name.toLowerCase();
  const lowerType = type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return lowerName.endsWith(token);
    if (token.endsWith("/*")) return lowerType.startsWith(token.slice(0, -1));
    return lowerType === token;
  });
}

function describeAccept(tokens: string[]): string {
  return tokens
    .map((t) => (t.endsWith("/*") ? `${t.slice(0, -2)}s` : t.startsWith(".") ? t.slice(1).toUpperCase() : (t.split("/")[1] ?? t).toUpperCase()))
    .join(", ");
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn(blockReset, "block", className)}>
      <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 .5 7.97" />
      <path d="M12 12v8" />
      <path d="m8.5 15.5 3.5-3.5 3.5 3.5" />
    </svg>
  );
}

function FileGlyph({ type, name }: { type: string; name: string }) {
  const ext = (name.split(".").pop() ?? "").slice(0, 4).toUpperCase();
  const tone = type.startsWith("image/")
    ? "text-pui-info-text"
    : type.includes("pdf")
      ? "text-pui-danger-text"
      : type.startsWith("video/") || type.startsWith("audio/")
        ? "text-pui-warning-text"
        : "text-pui-primary-text";
  return (
    <span aria-hidden="true" className={cn(blockReset, "relative grid size-10 shrink-0 place-items-center rounded-pui-md bg-pui-muted", tone)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" className={cn(blockReset, "block size-6")}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      {ext ? (
        <span className={cn(blockReset, "absolute bottom-1 rounded-[3px] bg-current px-0.5 text-[7px] font-bold leading-[9px]")}>
          <span className="text-pui-background">{ext}</span>
        </span>
      ) : null}
    </span>
  );
}

function Thumbnail({ entry }: { entry: DropzoneFile }) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const file = entry.file;
  const isImage = (entry.type ?? file?.type ?? "").startsWith("image/");
  const objectUrl = !entry.preview && isImage && file !== undefined;
  React.useEffect(() => {
    if (!objectUrl || !file || typeof URL === "undefined" || !URL.createObjectURL) return;
    const url = URL.createObjectURL(file);
    if (imgRef.current) imgRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [objectUrl, file]);
  if (entry.preview || objectUrl) {
    return (
      <img
        ref={imgRef}
        src={entry.preview}
        alt=""
        className={cn(blockReset, "size-10 shrink-0 rounded-pui-md bg-pui-muted object-cover")}
      />
    );
  }
  return <FileGlyph type={entry.type ?? file?.type ?? ""} name={entry.name ?? file?.name ?? ""} />;
}

/** Drag-and-drop file area with a drag-over glow, validation and a file list with per-file progress. */
export const FileDropzone = React.forwardRef<HTMLDivElement, FileDropzoneProps>(function FileDropzone(
  {
    accept,
    maxSizeBytes,
    maxFiles,
    multiple = true,
    disabled = false,
    onFilesChange,
    onDrop,
    files,
    onRemove,
    title = "Drop files here",
    description,
    browseLabel = "Browse files",
    acceptPaste = true,
    name,
    children,
    size = "md",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);
  const [drag, setDrag] = React.useState<"idle" | "accept" | "reject">("idle");
  const [message, setMessage] = React.useState("");
  const tokens = React.useMemo(() => parseAccept(accept), [accept]);
  const latest = useLatestRef({ onFilesChange, onDrop, count: files?.length ?? 0 });
  const id = React.useId();
  const descriptionId = `${id}-description`;

  const hint =
    description ??
    [
      tokens.length ? describeAccept(tokens) : null,
      maxSizeBytes ? `up to ${formatBytes(maxSizeBytes)}` : null,
      maxFiles ? `max ${maxFiles} file${maxFiles === 1 ? "" : "s"}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list || disabled) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    let room = maxFiles !== undefined ? Math.max(0, maxFiles - latest.current.count) : Infinity;
    if (!multiple) room = Math.min(room, 1);
    for (const file of incoming) {
      if (!matchesAccept(file.name, file.type, tokens)) {
        rejected.push({ file, reason: "type", message: `${file.name} isn't an accepted file type.` });
      } else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
        rejected.push({ file, reason: "size", message: `${file.name} is larger than ${formatBytes(maxSizeBytes)}.` });
      } else if (accepted.length >= room) {
        rejected.push({
          file,
          reason: "count",
          message: maxFiles !== undefined ? `Only ${maxFiles} file${maxFiles === 1 ? "" : "s"} allowed.` : "Only one file allowed.",
        });
      } else {
        accepted.push(file);
      }
    }
    const parts: string[] = [];
    if (accepted.length) parts.push(`${accepted.length} file${accepted.length === 1 ? "" : "s"} added.`);
    const unique = [...new Set(rejected.map((r) => r.message))];
    parts.push(...unique.slice(0, 3));
    setMessage(parts.join(" "));
    latest.current.onDrop?.(accepted, rejected);
    if (accepted.length) latest.current.onFilesChange?.(accepted);
  };

  const dragKind = (event: React.DragEvent): "accept" | "reject" => {
    const items = Array.from(event.dataTransfer?.items ?? []).filter((item) => item.kind === "file");
    if (!items.length) return "accept";
    // Names aren't known during dragover; check MIME types only (extensions validate on drop).
    const mimeTokens = tokens.filter((t) => !t.startsWith("."));
    if (!tokens.length || mimeTokens.length < tokens.length) return "accept";
    return items.every((item) => matchesAccept("", item.type, mimeTokens)) ? "accept" : "reject";
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const active = drag !== "idle";
  const rejecting = drag === "reject";

  return (
    <div className={cn(blockReset, "flex w-full flex-col gap-3")}>
      <motion.div
        ref={ref}
        data-state={drag === "idle" ? "idle" : drag === "accept" ? "drag-accept" : "drag-reject"}
        data-disabled={disabled ? "" : undefined}
        animate={reduced ? undefined : { scale: active ? 1.01 : 1 }}
        transition={springs.smooth}
        onDragEnter={(event: React.DragEvent<HTMLDivElement>) => {
          if (disabled || !Array.from(event.dataTransfer.types).includes("Files")) return;
          event.preventDefault();
          depth.current += 1;
          setDrag(dragKind(event));
        }}
        onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
          if (disabled || !Array.from(event.dataTransfer.types).includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDrag("idle");
        }}
        onDrop={(event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          depth.current = 0;
          setDrag("idle");
          handleFiles(event.dataTransfer.files);
        }}
        onPaste={(event: React.ClipboardEvent<HTMLDivElement>) => {
          if (!acceptPaste || !event.clipboardData.files.length) return;
          event.preventDefault();
          handleFiles(event.clipboardData.files);
        }}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          if ((event.target as HTMLElement).closest("button,a,input")) return;
          openPicker();
        }}
        {...props}
        className={cn(
          blockReset,
          "group/dz relative isolate flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-lg text-center",
          "bg-pui-surface text-pui-surface-foreground transition-[background-color,box-shadow] duration-200",
          size === "sm" ? "px-4 py-6" : "px-6 py-10",
          active && !rejecting && "bg-pui-primary/6 shadow-(--pui-shadow-glow)",
          rejecting && "bg-pui-danger/6",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        {/* Dashed border drawn in SVG so the dashes can march while dragging (motion-safe). */}
        <svg
          aria-hidden="true"
          focusable="false"
          className={cn(blockReset, "pointer-events-none absolute inset-px -z-[1] size-[calc(100%-2px)] overflow-visible")}
        >
          <rect
            width="100%"
            height="100%"
            rx="11"
            fill="none"
            strokeWidth={active ? 2 : 1.5}
            strokeDasharray="8 6"
            className={cn(
              "[rx:calc(var(--pui-radius-lg)-1px)] transition-[stroke] duration-200",
              rejecting
                ? "stroke-pui-danger"
                : active
                  ? "stroke-pui-primary motion-safe:animate-pui-dash-march"
                  : "stroke-pui-border group-hover/dz:stroke-pui-primary/60",
            )}
          />
        </svg>
        {children ?? (
          <>
            <motion.span
              aria-hidden="true"
              animate={reduced ? undefined : { y: active ? -4 : 0, scale: active ? 1.08 : 1 }}
              transition={springs.bouncy}
              className={cn(
                blockReset,
                "grid place-items-center rounded-full",
                size === "sm" ? "size-10" : "size-12",
                rejecting ? "bg-pui-danger/12 text-pui-danger-text" : "bg-pui-primary/12 text-pui-primary-text",
              )}
            >
              <UploadGlyph className={size === "sm" ? "size-5" : "size-6"} />
            </motion.span>
            <span className={cn(blockReset, "flex flex-col gap-1")}>
              <span className={cn(blockReset, "text-sm font-medium text-pui-foreground")}>
                {rejecting ? "Some files aren't accepted" : active ? "Release to upload" : title}
              </span>
              {hint ? (
                <span id={descriptionId} className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                  {hint}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              aria-describedby={hint ? descriptionId : undefined}
              className={cn(
                controlReset,
                "inline-flex h-8 cursor-pointer items-center rounded-pui-md border border-pui-border bg-pui-background px-3 text-sm font-medium text-pui-foreground",
                "shadow-(--pui-shadow-xs) transition-colors hover:bg-pui-muted disabled:cursor-not-allowed",
                focusRing,
              )}
            >
              {browseLabel}
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          className={hiddenInputClasses}
        />
      </motion.div>
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
      {files && files.length > 0 ? <FileList files={files} onRemove={onRemove} reduced={reduced} /> : null}
    </div>
  );
});

function FileList({ files, onRemove, reduced }: { files: DropzoneFile[]; onRemove?: (id: string) => void; reduced: boolean }) {
  return (
    <ul aria-label="Files" className={cn(listReset, "flex flex-col gap-2")}>
      <AnimatePresence initial={false} mode="popLayout">
        {files.map((entry, index) => {
          const fileName = entry.name ?? entry.file?.name ?? "file";
          const fileSize = entry.size ?? entry.file?.size;
          const status = entry.status ?? "done";
          return (
            <motion.li
              key={entry.id}
              layout={reduced ? false : "position"}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={reduced ? { duration: 0.15 } : { ...springs.smooth, delay: Math.min(index, 6) * 0.04 }}
              data-status={status}
              className={cn(
                blockReset,
                "flex items-center gap-3 rounded-pui-lg border bg-pui-surface p-2.5 pe-2 text-pui-surface-foreground",
                status === "error" ? "border-pui-danger/50" : "border-pui-border",
              )}
            >
              <Thumbnail entry={entry} />
              <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1")}>
                <span className={cn(blockReset, "flex items-baseline justify-between gap-2")}>
                  <span className={cn(blockReset, "truncate text-sm font-medium")}>{fileName}</span>
                  <span className={cn(blockReset, "shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>
                    {status === "uploading" && typeof entry.progress === "number"
                      ? `${Math.round(entry.progress)}%`
                      : fileSize !== undefined
                        ? formatBytes(fileSize)
                        : ""}
                  </span>
                </span>
                {status === "uploading" || status === "queued" ? (
                  <Progress
                    size="sm"
                    value={status === "queued" ? 0 : entry.progress}
                    label={`Uploading ${fileName}`}
                  />
                ) : status === "error" ? (
                  <span className={cn(blockReset, "text-xs text-pui-danger-text")}>{entry.error ?? "Upload failed"}</span>
                ) : (
                  <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                    {fileSize !== undefined ? `${formatBytes(fileSize)} · ` : ""}Uploaded
                  </span>
                )}
              </span>
              <AnimatePresence initial={false} mode="popLayout">
                {status === "done" ? (
                  <motion.span
                    key="done"
                    aria-hidden="true"
                    initial={reduced ? false : { scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={springs.bouncy}
                    className={cn(blockReset, "grid size-5 shrink-0 place-items-center rounded-full bg-pui-success text-pui-success-foreground")}
                  >
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </motion.span>
                ) : status === "error" ? (
                  <motion.span key="error" aria-hidden="true" initial={false} className={cn(blockReset, "shrink-0 text-pui-danger-text")}>
                    <CircleXIcon className="size-5" />
                  </motion.span>
                ) : null}
              </AnimatePresence>
              {onRemove ? (
                <button
                  type="button"
                  aria-label={`Remove ${fileName}`}
                  onClick={() => onRemove(entry.id)}
                  className={cn(
                    controlReset,
                    "grid size-7 shrink-0 cursor-pointer place-items-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
                    focusRing,
                  )}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
