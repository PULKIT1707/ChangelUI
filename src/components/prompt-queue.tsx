"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ArrowUpIcon, ChevronDownIcon, PaperclipIcon, PencilIcon, PlayIcon, XIcon } from "../lib/icons";
import { durations, easings } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { SortableHandle, SortableItem, SortableList } from "./sortable-list";

export interface QueuedPrompt {
  id: string;
  text: string;
  /** File names shown as chips. */
  attachments?: readonly string[];
}

export interface PromptQueueProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  items: readonly QueuedPrompt[];
  /** Called with the new list after a reorder, edit or remove. */
  onItemsChange: (items: QueuedPrompt[]) => void;
  /** The agent is busy; queued prompts wait for it. */
  running?: boolean;
  /** Hold the queue: nothing drains until resumed. Controlled with onPausedChange. */
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** Shows "Send now" on each prompt (interrupt the current run with it). */
  onSendNow?: (item: QueuedPrompt) => void;
  /** Rows shown before "N more". Default 3. */
  maxVisible?: number;
  /** Default "Queued". */
  title?: React.ReactNode;
}

const iconAction = cn(
  controlReset,
  focusRing,
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground [&_svg]:size-3.5",
);

const textAction = cn(
  controlReset,
  focusRing,
  "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-pui-md px-1.5 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground [&_svg]:size-3",
);

const preview = (text: string, max = 40) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

function PauseGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props} className={cn(blockReset, "block shrink-0", props.className)}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function EditBox({ initial, onSave, onCancel }: { initial: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = React.useState(initial);
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const save = () => (draft.trim() ? onSave(draft.trim()) : onCancel());
  return (
    <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1.5")}>
      <textarea
        ref={ref}
        aria-label="Edit queued prompt"
        rows={Math.min(5, Math.max(2, draft.split("\n").length))}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        className={cn(
          controlReset,
          focusRing,
          "w-full min-w-0 resize-none rounded-pui-md border border-pui-ring bg-pui-background px-2 py-1.5 text-sm leading-5 text-pui-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_20%,transparent)] outline-hidden",
        )}
      />
      <div className={cn(blockReset, "flex items-center justify-end gap-1 text-[0.6875rem] text-pui-muted-foreground")}>
        <span className={cn(blockReset, "me-auto")}>Enter to save · Esc to cancel</span>
        <button type="button" onClick={onCancel} className={textAction}>
          Cancel
        </button>
        <button type="button" onClick={save} className={cn(textAction, "bg-pui-primary text-pui-primary-foreground hover:bg-pui-primary/90 hover:text-pui-primary-foreground")}>
          Save
        </button>
      </div>
    </div>
  );
}

/**
 * Follow-ups you type while an agent is busy, as a visible queue instead of a blocked input:
 * prompts stack above the composer as cards you can drag or keyboard-reorder, edit in place,
 * remove or "send now" to interrupt. The header says what happens next (waits for the run,
 * sends next, or paused) and a Pause / Resume switch holds the queue. Extra rows fold into
 * "N more". The ref goes to the section.
 */
export const PromptQueue = React.forwardRef<HTMLElement, PromptQueueProps>(function PromptQueue(
  {
    items,
    onItemsChange,
    running = false,
    paused: pausedProp,
    defaultPaused = false,
    onPausedChange,
    onSendNow,
    maxVisible = 3,
    title = "Queued",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [pausedState, setPausedState] = React.useState(defaultPaused);
  const paused = pausedProp ?? pausedState;
  const [showAll, setShowAll] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const editTriggers = React.useRef(new Map<string, HTMLButtonElement | null>());

  const setPaused = (next: boolean) => {
    if (pausedProp === undefined) setPausedState(next);
    onPausedChange?.(next);
  };

  const byId = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const limit = showAll ? items.length : Math.max(1, maxVisible);
  const visibleIds = items.slice(0, limit).map((item) => item.id);
  const hiddenCount = items.length - visibleIds.length;

  const reorder = (ids: string[]) => {
    const rest = items.slice(ids.length);
    onItemsChange([...ids.map((x) => byId.get(x)).filter((x): x is QueuedPrompt => x !== undefined), ...rest]);
  };
  const remove = (itemId: string) => onItemsChange(items.filter((item) => item.id !== itemId));
  const update = (itemId: string, text: string) => onItemsChange(items.map((item) => (item.id === itemId ? { ...item, text } : item)));
  const finishEdit = (itemId: string) => {
    setEditing(null);
    requestAnimationFrame(() => editTriggers.current.get(itemId)?.focus());
  };

  const state = paused ? "paused" : running ? "waiting" : "sending";
  const stateLabel = paused ? "Paused" : running ? "Sends when the agent finishes" : "Sending next…";
  const headingId = `${id}-title`;
  const empty = items.length === 0;

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      data-state={state}
      hidden={empty}
      {...props}
      className={cn(blockReset, "w-full min-w-0 rounded-pui-xl border border-pui-border bg-pui-muted/40 p-1.5 text-pui-foreground", className)}
    >
      <header className={cn(blockReset, "flex items-center gap-2 px-2 pt-1 pb-1.5")}>
        <h3 id={headingId} className={cn(blockReset, "inline-flex items-center gap-1.5 text-xs font-semibold text-pui-foreground")}>
          {title}
          <span className={cn(blockReset, "inline-flex h-4 min-w-4 items-center justify-center overflow-hidden rounded-pui-full bg-pui-foreground/10 px-1 text-[0.625rem] tabular-nums")}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={items.length}
                initial={reduced ? { opacity: 0 } : { y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: -8, opacity: 0 }}
                transition={{ duration: durations.base, ease: easings.out }}
                className={cn(blockReset, "inline-block")}
              >
                {items.length}
              </motion.span>
            </AnimatePresence>
          </span>
        </h3>
        <p role="status" className={cn(blockReset, "inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-pui-muted-foreground")}>
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "relative inline-flex size-1.5 shrink-0 rounded-pui-full",
              paused ? "bg-pui-muted-foreground/60" : running ? "bg-pui-warning" : "bg-pui-success",
            )}
          >
            {!paused && !reduced ? <span className={cn(blockReset, "absolute inset-0 rounded-pui-full bg-inherit motion-safe:animate-ping")} /> : null}
          </span>
          <span className={cn(blockReset, "truncate")}>{stateLabel}</span>
        </p>
        <div className={cn(blockReset, "ms-auto flex shrink-0 items-center gap-0.5")}>
          <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} className={textAction}>
            {paused ? <PlayIcon /> : <PauseGlyph className="size-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => onItemsChange([])} className={textAction}>
            Clear
          </button>
        </div>
      </header>
      <SortableList
        values={visibleIds}
        onValuesChange={reorder}
        handle
        gap={4}
        aria-label="Queued prompts"
        announcements={{
          pickedUp: (label, p, t) => `Picked up “${label}”, position ${p} of ${t}.`,
          moved: (label, p, t) => `Moved “${label}” to position ${p} of ${t}.`,
          dropped: (label, p, t) => `Dropped “${label}” at position ${p} of ${t}.`,
        }}
      >
        <AnimatePresence initial={false}>
          {visibleIds.map((itemId, index) => {
            const item = byId.get(itemId);
            if (!item) return null;
            const isEditing = editing === item.id;
            const label = preview(item.text);
            return (
              <SortableItem
                key={item.id}
                value={item.id}
                label={label}
                disabled={isEditing}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: durations.fast } }}
                className={cn(blockReset, "group/item border-pui-border bg-pui-surface", isEditing && "border-pui-ring/60")}
              >
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: durations.base, ease: easings.out }}
                  className={cn(blockReset, "flex min-w-0 items-start gap-1.5 py-1.5 ps-1 pe-1.5")}
                >
                  <SortableHandle
                    disabled={isEditing}
                    className={cn("mt-0.5 h-7 w-5 shrink-0 text-pui-muted-foreground/70 hover:text-pui-foreground disabled:opacity-30")}
                  />
                  <span
                    className={cn(
                      blockReset,
                      "mt-1 inline-flex h-5 shrink-0 items-center rounded-pui-sm px-1.5 text-[0.625rem] font-semibold tracking-wide uppercase tabular-nums",
                      index === 0 ? "bg-pui-primary/12 text-pui-primary-text" : "bg-pui-muted text-pui-muted-foreground",
                    )}
                  >
                    {index === 0 ? "Next" : index + 1}
                  </span>
                  {isEditing ? (
                    <EditBox
                      initial={item.text}
                      onCancel={() => finishEdit(item.id)}
                      onSave={(text) => {
                        update(item.id, text);
                        finishEdit(item.id);
                      }}
                    />
                  ) : (
                    <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1 py-1")}>
                      <p className={cn(blockReset, "line-clamp-2 text-sm leading-5 whitespace-pre-line text-pui-foreground [overflow-wrap:anywhere]")}>{item.text}</p>
                      {item.attachments && item.attachments.length > 0 ? (
                        <ul aria-label="Attachments" className={cn(listReset, "flex flex-wrap gap-1")}>
                          {item.attachments.map((file) => (
                            <li key={file} className={cn(blockReset, "inline-flex max-w-40 items-center gap-1 rounded-pui-sm bg-pui-muted px-1.5 py-0.5 text-[0.6875rem] text-pui-muted-foreground")}>
                              <PaperclipIcon className="size-3" />
                              <span className={cn(blockReset, "truncate")}>{file}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )}
                  {isEditing ? null : (
                    <div className={cn(blockReset, "flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-60 sm:group-focus-within/item:opacity-100 sm:group-hover/item:opacity-100")}>
                      {onSendNow ? (
                        <button type="button" aria-label={`Send now: ${label}`} title="Send now (interrupts the current run)" onClick={() => onSendNow(item)} className={cn(iconAction, "hover:text-pui-primary-text")}>
                          <ArrowUpIcon />
                        </button>
                      ) : null}
                      <button
                        ref={(el) => {
                          editTriggers.current.set(item.id, el);
                        }}
                        type="button"
                        aria-label={`Edit: ${label}`}
                        title="Edit"
                        onClick={() => setEditing(item.id)}
                        className={iconAction}
                      >
                        <PencilIcon />
                      </button>
                      <button type="button" aria-label={`Remove: ${label}`} title="Remove" onClick={() => remove(item.id)} className={cn(iconAction, "hover:text-pui-danger-text")}>
                        <XIcon />
                      </button>
                    </div>
                  )}
                </motion.div>
              </SortableItem>
            );
          })}
        </AnimatePresence>
      </SortableList>
      {hiddenCount > 0 || (showAll && items.length > maxVisible) ? (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((s) => !s)}
          className={cn(controlReset, focusRing, "mt-1 flex w-full cursor-pointer items-center justify-center gap-1 rounded-pui-md py-1 text-xs font-medium text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground")}
        >
          <ChevronDownIcon className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
          {showAll ? "Show less" : `${hiddenCount} more queued`}
        </button>
      ) : null}
    </section>
  );
});
