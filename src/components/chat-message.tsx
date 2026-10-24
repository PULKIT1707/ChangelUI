"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, RotateCcwIcon, ThumbsDownIcon, ThumbsUpIcon, TriangleAlertIcon } from "../lib/icons";
import { durations, springs } from "../lib/motion";
import { Markdown, renderInline } from "../lib/markdown";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Avatar } from "./avatar";

export type ChatMessageFrom = "user" | "assistant" | "system";
export type ChatFeedback = "up" | "down" | null;

export interface ChatMessageAuthor {
  name: string;
  avatarUrl?: string;
}

export interface ChatMessageProps extends Omit<React.HTMLAttributes<HTMLElement>, "content" | "onCopy"> {
  /** Who sent it. Default "assistant". */
  from?: ChatMessageFrom;
  /** Message text with light markdown: paragraphs, **bold**, *italic*, `code`, fences, lists, quotes, headings and links. */
  content?: string;
  /** Custom body; replaces the rendered content. */
  children?: React.ReactNode;
  /** Shows a caret at the end and hides the actions until the reply is done. */
  streaming?: boolean;
  author?: ChatMessageAuthor;
  /** Custom avatar, or false for none. Default: the author's Avatar for assistant messages. */
  avatar?: React.ReactNode | false;
  timestamp?: number | string | Date;
  /** "bubble" puts assistant replies in a bubble too. Default "default" (user bubble, assistant plain). */
  variant?: "default" | "bubble";
  /** Text the Copy action writes. Default: content. Pass false to hide Copy. */
  copyText?: string | false;
  onCopy?: (text: string) => void;
  /** Shows Regenerate. */
  onRetry?: () => void;
  feedback?: ChatFeedback;
  defaultFeedback?: ChatFeedback;
  /** Shows thumbs up / down when set. */
  onFeedbackChange?: (feedback: ChatFeedback) => void;
  /** Current alternative reply, 0-based. */
  branch?: number;
  /** Number of alternatives; the switcher appears above 1. */
  branchCount?: number;
  onBranchChange?: (branch: number) => void;
  /** Extra action buttons after the built-in ones. */
  actions?: React.ReactNode;
  /** Default "hover" (always shown on touch screens and while focused). */
  showActions?: "hover" | "always";
  /** Error text under the message, with Retry when onRetry is set. */
  error?: React.ReactNode;
}

// Light markdown lives in ../lib/markdown (shared with MarkdownEditor).
export { parseChatMarkdown, type ChatMarkdownBlock } from "../lib/markdown";


const actionButton = cn(
  controlReset,
  focusRing,
  "relative inline-flex size-7 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5",
);

const toTime = (t: NonNullable<ChatMessageProps["timestamp"]>) => (t instanceof Date ? t.getTime() : typeof t === "string" ? Date.parse(t) : t);

/**
 * One chat message for the whole AI reply lifecycle: a streaming caret that rides the end of the
 * text (even inside an unfinished code fence), light markdown rendered without HTML injection,
 * code blocks with their own Copy, and an action bar (Copy, Regenerate, thumbs up/down, extras)
 * that appears on hover or focus once streaming ends. Alternative replies get a ‹ 2 / 3 › switcher
 * that cross-fades between them. User messages sit in a bubble on the right; system notes center.
 */
export const ChatMessage = React.forwardRef<HTMLElement, ChatMessageProps>(function ChatMessage(
  {
    from = "assistant",
    content = "",
    children,
    streaming = false,
    author,
    avatar,
    timestamp,
    variant = "default",
    copyText,
    onCopy,
    onRetry,
    feedback: feedbackProp,
    defaultFeedback = null,
    onFeedbackChange,
    branch = 0,
    branchCount = 1,
    onBranchChange,
    actions,
    showActions = "hover",
    error,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const { copy, copied } = useCopyToClipboard({ timeoutMs: 1600 });
  const [feedbackState, setFeedbackState] = React.useState<ChatFeedback>(defaultFeedback);
  const feedback = feedbackProp !== undefined ? feedbackProp : feedbackState;

  const name = author?.name ?? (from === "user" ? "You" : from === "assistant" ? "Assistant" : "System");
  const time = timestamp !== undefined ? toTime(timestamp) : null;
  const timeLabel =
    time !== null && Number.isFinite(time)
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: isClient ? undefined : "UTC" }).format(time)
      : null;

  if (from === "system") {
    return (
      <article
        ref={ref}
        aria-label="System message"
        data-from="system"
        {...props}
        className={cn(blockReset, "flex w-full justify-center py-1", className)}
      >
        <p className={cn(blockReset, "max-w-[85%] rounded-pui-full border border-pui-border bg-pui-muted/60 px-3 py-1 text-center text-xs text-pui-muted-foreground")}>
          {children ?? renderInline(content, "sys")}
        </p>
      </article>
    );
  }

  const isUser = from === "user";
  const bubble = isUser || variant === "bubble";
  const textToCopy = copyText === false ? null : (copyText ?? content);

  const setFeedback = (next: ChatFeedback) => {
    const value = feedback === next ? null : next;
    if (feedbackProp === undefined) setFeedbackState(value);
    onFeedbackChange?.(value);
  };

  const caret = streaming ? (
    <motion.span
      aria-hidden="true"
      data-slot="caret"
      initial={false}
      animate={reduced ? { opacity: 0.7 } : { opacity: [1, 1, 0.15, 0.15] }}
      transition={reduced ? { duration: 0 } : { duration: 1, repeat: Infinity, times: [0, 0.45, 0.55, 1], ease: "linear" }}
      className={cn(blockReset, "ms-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] rounded-[2px] bg-pui-primary align-baseline")}
    />
  ) : null;

  const avatarNode =
    avatar === false || isUser ? null : avatar !== undefined ? avatar : (
      <Avatar size="sm" name={name} src={author?.avatarUrl} className="mt-0.5" />
    );

  const hasBranches = branchCount > 1;
  const hasFeedback = onFeedbackChange !== undefined || feedbackProp !== undefined;
  const showBar = !streaming && (textToCopy || onRetry || hasFeedback || hasBranches || actions);
  const pop = (on: boolean) => (reduced || !on ? undefined : { scale: [1, 1.35, 1] });

  return (
    <article
      ref={ref}
      aria-label={`${name}${isUser ? "" : " reply"}`}
      aria-busy={streaming || undefined}
      data-from={from}
      data-streaming={streaming ? "" : undefined}
      {...props}
      className={cn(blockReset, "group/msg flex w-full min-w-0 gap-3", isUser ? "justify-end" : "justify-start", className)}
    >
      {avatarNode}
      <div className={cn(blockReset, "flex min-w-0 flex-col gap-1", isUser ? "max-w-[85%] items-end" : "flex-1 items-start", bubble && !isUser && "max-w-[85%] flex-none")}>
        {!isUser || timeLabel ? (
          <div className={cn(blockReset, "flex items-baseline gap-2 text-xs")}>
            {!isUser ? <span className={cn(blockReset, "font-medium text-pui-foreground")}>{name}</span> : null}
            {timeLabel && time !== null ? (
              <time dateTime={new Date(time).toISOString()} className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>
                {timeLabel}
              </time>
            ) : null}
          </div>
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={branch}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={reduced ? { duration: durations.fast } : { duration: durations.base }}
            className={cn(
              blockReset,
              "flex min-w-0 max-w-full flex-col gap-3 text-sm leading-relaxed text-pui-foreground [overflow-wrap:anywhere]",
              bubble && "rounded-[1.125rem] px-3.5 py-2",
              bubble && (isUser ? "rounded-ee-md bg-pui-muted" : "rounded-es-md border border-pui-border bg-pui-surface text-pui-surface-foreground"),
              !bubble && "w-full",
            )}
          >
            {children ?? <Markdown source={content} caret={caret} />}
            {children && caret ? <span>{caret}</span> : null}
          </motion.div>
        </AnimatePresence>
        {error ? (
          <div role="alert" className={cn(blockReset, "flex items-center gap-2 text-xs text-pui-danger-text")}>
            <TriangleAlertIcon className="size-3.5" />
            <span className={cn(blockReset)}>{error}</span>
            {onRetry ? (
              <button type="button" onClick={onRetry} className={cn(controlReset, focusRing, "cursor-pointer rounded-pui-sm font-medium underline underline-offset-2")}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {showBar ? (
          <div
            role="toolbar"
            aria-label="Message actions"
            className={cn(
              blockReset,
              "-ms-1.5 flex items-center gap-0.5 transition-opacity duration-(--pui-duration-fast)",
              isUser && "-me-1.5 ms-0",
              showActions === "hover" &&
                "opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 [@media(hover:none)]:opacity-100",
            )}
          >
            {hasBranches ? (
              <div className={cn(blockReset, "me-1 flex items-center")}>
                <button
                  type="button"
                  aria-label="Previous response"
                  disabled={branch <= 0}
                  onClick={() => onBranchChange?.(branch - 1)}
                  className={actionButton}
                >
                  <ChevronLeftIcon />
                </button>
                <span className={cn(blockReset, "min-w-9 text-center text-xs tabular-nums text-pui-muted-foreground")}>
                  <span aria-hidden="true">
                    {branch + 1} / {branchCount}
                  </span>
                  <span className={cn(blockReset, "sr-only")}>
                    Response {branch + 1} of {branchCount}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Next response"
                  disabled={branch >= branchCount - 1}
                  onClick={() => onBranchChange?.(branch + 1)}
                  className={actionButton}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            ) : null}
            {textToCopy ? (
              <button
                type="button"
                aria-label={copied ? "Copied" : "Copy message"}
                onClick={() => {
                  void copy(textToCopy).then((ok) => {
                    if (ok) onCopy?.(textToCopy);
                  });
                }}
                className={actionButton}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={copied ? "done" : "copy"}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                    transition={reduced ? { duration: durations.fast } : springs.snappy}
                    className={cn(blockReset, "inline-flex", copied && "text-pui-success-text")}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </motion.span>
                </AnimatePresence>
              </button>
            ) : null}
            {onRetry && !isUser ? (
              <button type="button" aria-label="Regenerate" onClick={onRetry} className={actionButton}>
                <RotateCcwIcon />
              </button>
            ) : null}
            {hasFeedback && !isUser ? (
              <>
                <button type="button" aria-label="Good response" aria-pressed={feedback === "up"} onClick={() => setFeedback("up")} className={cn(actionButton, feedback === "up" && "text-pui-success-text")}>
                  <motion.span animate={pop(feedback === "up")} transition={{ duration: 0.3 }} className={cn(blockReset, "inline-flex")}>
                    <ThumbsUpIcon fill={feedback === "up" ? "currentColor" : "none"} fillOpacity={0.2} />
                  </motion.span>
                </button>
                <button type="button" aria-label="Bad response" aria-pressed={feedback === "down"} onClick={() => setFeedback("down")} className={cn(actionButton, feedback === "down" && "text-pui-danger-text")}>
                  <motion.span animate={pop(feedback === "down")} transition={{ duration: 0.3 }} className={cn(blockReset, "inline-flex")}>
                    <ThumbsDownIcon fill={feedback === "down" ? "currentColor" : "none"} fillOpacity={0.2} />
                  </motion.span>
                </button>
              </>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
});
