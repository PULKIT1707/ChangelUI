"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon, CircleCheckIcon, RotateCcwIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useMinuteClock } from "../lib/use-minute-clock";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Avatar } from "./avatar";
import { Button } from "./button";
export interface CommentAuthor {
  id: string;
  name: string;
  /** Used for @mentions. Default: the name without spaces, lowercased. */
  handle?: string;
  avatarUrl?: string;
}
export interface CommentReaction {
  emoji: string;
  count: number;
  /** The current user reacted. */
  reacted?: boolean;
}
export interface ThreadComment {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: number | string | Date;
  reactions?: CommentReaction[];
  edited?: boolean;
}
export interface CommentsThreadProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Oldest first; the first comment opens the thread. */
  comments: ThreadComment[];
  currentUser: CommentAuthor;
  /** People the composer suggests after "@". Default: everyone in the thread. */
  mentionable?: CommentAuthor[];
  /** Return a promise to show a posting state; a rejection keeps the draft and shows the error. */
  onReply?: (body: string) => void | Promise<void>;
  onReact?: (commentId: string, emoji: string) => void;
  resolved?: boolean;
  defaultResolved?: boolean;
  onResolvedChange?: (resolved: boolean) => void;
  /** Who resolved it, shown in the collapsed summary. */
  resolvedBy?: CommentAuthor;
  /** What the thread is about: a quoted line, a text selection or a design note. */
  anchor?: React.ReactNode;
  /** Quick reactions offered on every comment. Default 👍 🎉 👀 ❤️. */
  reactionChoices?: string[];
  /** Reference time for relative labels. Default: the client clock after hydration. */
  now?: number;
  /** Default "Reply…". */
  placeholder?: string;
}
const handleOf = (a: CommentAuthor) => a.handle ?? a.name.replace(/\s+/g, "").toLowerCase();
const toTime = (t: ThreadComment["createdAt"]) => (t instanceof Date ? t.getTime() : typeof t === "string" ? Date.parse(t) : t);
/** "now", "5m", "3h", "2d", then a short date. */
function relative(time: number, now: number): string {
  const diff = Math.max(0, now - time);
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(time);
}
/** Body text with @mentions styled; a mention of the current user is stronger. */
function Body({ text, me }: { text: string; me: string }) {
  const parts = text.split(/(@[\w.-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") && part.length > 1 ? (
          <span
            key={i}
            className={cn(
              blockReset,
              "rounded-pui-sm px-0.5 font-medium",
              part.slice(1).toLowerCase() === me ? "bg-pui-warning/18 text-pui-warning-text" : "bg-pui-primary/10 text-pui-primary-text",
            )}
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
const iconButton = cn(
  controlReset,
  focusRing,
  "inline-flex h-7 cursor-pointer items-center gap-1 rounded-pui-md px-2 text-xs font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
);
/**
 * Review comment thread anchored to what it is about: replies with @mention suggestions and
 * Cmd/Ctrl+Enter to send, emoji reactions, and Resolve, which folds the thread into a one-line
 * summary (who resolved it, how many comments, the last word) that reopens in place.
 */
export const CommentsThread = React.forwardRef<HTMLElement, CommentsThreadProps>(function CommentsThread(
  {
    comments,
    currentUser,
    mentionable,
    onReply,
    onReact,
    resolved: resolvedProp,
    defaultResolved = false,
    onResolvedChange,
    resolvedBy,
    anchor,
    reactionChoices = ["👍", "🎉", "👀", "❤️"],
    now: nowProp,
    placeholder = "Reply…",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const clock = useMinuteClock();
  const now = nowProp ?? clock;
  const [resolvedState, setResolvedState] = React.useState(defaultResolved);
  const resolved = resolvedProp ?? resolvedState;
  const [peek, setPeek] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mention, setMention] = React.useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = React.useState(0);
  const [overlay, setOverlay] = React.useState<Record<string, boolean>>({});
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const me = handleOf(currentUser);
  const setResolved = (next: boolean) => {
    if (resolvedProp === undefined) setResolvedState(next);
    setPeek(false);
    onResolvedChange?.(next);
  };
  const people = React.useMemo(() => {
    const list = mentionable ?? comments.map((c) => c.author);
    const seen = new Set<string>();
    return list.filter((p) => p.id !== currentUser.id && !seen.has(p.id) && (seen.add(p.id), true));
  }, [mentionable, comments, currentUser.id]);
  const suggestions = mention
    ? people.filter((p) => p.name.toLowerCase().includes(mention.query.toLowerCase()) || handleOf(p).includes(mention.query.toLowerCase())).slice(0, 5)
    : [];
  const listOpen = suggestions.length > 0;
  const trackMention = (value: string, caret: number) => {
    const match = /(^|\s)@([\w.-]*)$/.exec(value.slice(0, caret));
    if (match) {
      setMention({ start: caret - (match[2]?.length ?? 0) - 1, query: match[2] ?? "" });
      setActive(0);
    } else setMention(null);
  };
  const insertMention = (person: CommentAuthor) => {
    if (!mention) return;
    const el = inputRef.current;
    const caret = el?.selectionStart ?? draft.length;
    const text = `@${handleOf(person)} `;
    const next = draft.slice(0, mention.start) + text + draft.slice(caret);
    setDraft(next);
    setMention(null);
    requestAnimationFrame(() => {
      el?.focus();
      const at = mention.start + text.length;
      el?.setSelectionRange(at, at);
    });
  };
  const send = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setError(null);
    setMention(null);
    try {
      const result = onReply?.(body);
      if (result) {
        setPosting(true);
        await result;
      }
      setDraft("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn’t post your reply. Try again.");
    } finally {
      setPosting(false);
    }
  };
  const reactionsOf = (comment: ThreadComment): CommentReaction[] => {
    const base = new Map((comment.reactions ?? []).map((r) => [r.emoji, { ...r }]));
    for (const [key, on] of Object.entries(overlay)) {
      const [cid, emoji] = key.split("\u0000");
      if (cid !== comment.id || !emoji) continue;
      const r = base.get(emoji) ?? { emoji, count: 0, reacted: false };
      if (!!r.reacted !== on) {
        r.count += on ? 1 : -1;
        r.reacted = on;
      }
      if (r.count > 0) base.set(emoji, r);
      else base.delete(emoji);
    }
    return [...base.values()];
  };
  const react = (comment: ThreadComment, emoji: string) => {
    const current = reactionsOf(comment).find((r) => r.emoji === emoji)?.reacted ?? false;
    setOverlay((o) => ({ ...o, [`${comment.id}\u0000${emoji}`]: !current }));
    onReact?.(comment.id, emoji);
  };
  const last = comments[comments.length - 1];
  const expanded = !resolved || peek;
  const transition = reduced ? { duration: 0 } : { duration: 0.28, ease: easings.out };
  return (
    <section
      ref={ref}
      aria-label={`Comment thread${resolved ? ", resolved" : ""}`}
      data-state={resolved ? "resolved" : "open"}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col overflow-hidden rounded-pui-lg border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-xs transition-colors duration-(--pui-duration-base)",
        resolved ? "border-pui-success/35" : "border-pui-border",
        className,
      )}
    >
      {resolved ? (
        <div className={cn(blockReset, "flex items-center gap-2 px-3 py-2", peek && "border-b border-pui-border")}>
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0 text-pui-success-text" />
          <button
            type="button"
            aria-expanded={peek}
            aria-controls={`${id}-body`}
            onClick={() => setPeek((p) => !p)}
            className={cn(controlReset, focusRing, "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-pui-sm text-start text-xs")}
          >
            <span className={cn(blockReset, "shrink-0 font-medium text-pui-foreground")}>Resolved{resolvedBy ? ` by ${resolvedBy.name}` : ""}</span>{" "}
            <span className={cn(blockReset, "shrink-0 text-pui-muted-foreground tabular-nums")}>
              · {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
            {last && !peek ? " " : null}
            {last && !peek ? <span className={cn(blockReset, "min-w-0 truncate text-pui-muted-foreground")}>· “{last.body}”</span> : null}
            <ChevronDownIcon aria-hidden="true" className={cn("ms-auto size-3.5 shrink-0 text-pui-muted-foreground transition-transform motion-reduce:transition-none", peek && "rotate-180")} />
          </button>
          <button type="button" onClick={() => setResolved(false)} className={iconButton}>
            <RotateCcwIcon aria-hidden="true" className="size-3.5" />
            Reopen
          </button>
        </div>
      ) : null}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="body"
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className={cn(blockReset, "overflow-hidden")}
          >
            {anchor ? (
              <div className={cn(blockReset, "mx-3 mt-3 rounded-pui-md border-s-2 border-pui-warning bg-pui-warning/8 px-3 py-2 text-xs text-pui-foreground")}>{anchor}</div>
            ) : null}
            <ol aria-label="Comments" className={cn(listReset, "flex flex-col px-3 pt-2")}>
              <AnimatePresence initial={false}>
                {comments.map((comment, i) => {
                  const time = toTime(comment.createdAt);
                  const reactions = reactionsOf(comment);
                  return (
                    <motion.li
                      key={comment.id}
                      layout={reduced ? false : "position"}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduced ? { duration: 0 } : springs.smooth}
                      className={cn(blockReset, "group relative flex gap-2.5 py-2")}
                    >
                      {i < comments.length - 1 ? <span aria-hidden="true" className={cn(blockReset, "absolute top-10 bottom-0 start-[0.9375rem] w-px bg-pui-border")} /> : null}
                      <Avatar size="sm" name={comment.author.name} src={comment.author.avatarUrl} alt="" aria-hidden="true" className="shrink-0" />
                      <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1")}>
                        <div className={cn(blockReset, "flex items-baseline gap-2")}>
                          <span className={cn(blockReset, "truncate text-[0.8125rem] font-semibold text-pui-foreground")}>{comment.author.name}</span>
                          {comment.author.id === currentUser.id ? <span className={cn(blockReset, "text-[0.6875rem] text-pui-muted-foreground")}>you</span> : null}
                          <time
                            dateTime={Number.isFinite(time) ? new Date(time).toISOString() : undefined}
                            className={cn(blockReset, "min-w-6 text-xs tabular-nums text-pui-muted-foreground")}
                          >
                            {now !== null && Number.isFinite(time) ? relative(time, now) : ""}
                          </time>
                          {comment.edited ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>(edited)</span> : null}
                        </div>
                        <p className={cn(blockReset, "leading-relaxed break-words whitespace-pre-wrap text-pui-foreground")}>
                          <Body text={comment.body} me={me} />
                        </p>
                        <div className={cn(blockReset, "flex flex-wrap items-center gap-1")}>
                          {reactions.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              aria-pressed={!!r.reacted}
                              aria-label={`${r.emoji} ${r.count}${r.reacted ? ", you reacted" : ""}`}
                              onClick={() => react(comment, r.emoji)}
                              className={cn(
                                controlReset,
                                focusRing,
                                "inline-flex h-6 cursor-pointer items-center gap-1 rounded-pui-full border px-2 text-xs tabular-nums transition-colors",
                                r.reacted ? "border-pui-primary/50 bg-pui-primary/10 text-pui-primary-text" : "border-pui-border text-pui-muted-foreground hover:bg-pui-muted",
                              )}
                            >
                              <span aria-hidden="true">{r.emoji}</span>
                              <span aria-hidden="true">{r.count}</span>
                            </button>
                          ))}
                          <span
                            role="group"
                            aria-label={`React to ${comment.author.name}`}
                            className={cn(
                              blockReset,
                              "flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100",
                            )}
                          >
                            {reactionChoices
                              .filter((emoji) => !reactions.some((r) => r.emoji === emoji))
                              .map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  aria-label={`React with ${emoji}`}
                                  onClick={() => react(comment, emoji)}
                                  className={cn(controlReset, focusRing, "inline-flex size-6 cursor-pointer items-center justify-center rounded-pui-full text-xs grayscale transition-[filter,background-color] hover:bg-pui-muted hover:grayscale-0")}
                                >
                                  {emoji}
                                </button>
                              ))}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className={cn(blockReset, "relative flex flex-col gap-2 border-t border-pui-border px-3 py-3")}
            >
              <div className={cn(blockReset, "flex gap-2.5")}>
                <Avatar size="sm" name={currentUser.name} src={currentUser.avatarUrl} alt="" aria-hidden="true" className="shrink-0" />
                <div className={cn(blockReset, "relative min-w-0 flex-1")}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    disabled={posting}
                    aria-label="Reply"
                    placeholder={placeholder}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : `${id}-hint`}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={listOpen}
                    aria-controls={listOpen ? `${id}-mentions` : undefined}
                    aria-activedescendant={listOpen ? `${id}-m-${active}` : undefined}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setError(null);
                      trackMention(e.target.value, e.target.selectionStart);
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (listOpen) {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
                          return;
                        }
                        if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
                          const person = suggestions[active];
                          if (person) {
                            e.preventDefault();
                            insertMention(person);
                            return;
                          }
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setMention(null);
                          return;
                        }
                      }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    onBlur={() => setMention(null)}
                    className={cn(
                      controlReset,
                      "block max-h-40 min-h-9 w-full resize-none rounded-pui-md border border-pui-input bg-transparent px-3 py-2 text-sm leading-5 text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground focus-visible:border-pui-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)] disabled:opacity-60 aria-invalid:border-pui-danger",
                    )}
                  />
                  <AnimatePresence>
                    {listOpen ? (
                      <motion.ul
                        key="mentions"
                        id={`${id}-mentions`}
                        role="listbox"
                        aria-label="People to mention"
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.14, ease: easings.out }}
                        className={cn(listReset, "absolute bottom-full start-0 z-20 mb-1 w-56 overflow-hidden rounded-pui-md border border-pui-border bg-pui-surface p-1 shadow-pui-lg")}
                      >
                        {suggestions.map((person, i) => (
                          <li
                            key={person.id}
                            id={`${id}-m-${i}`}
                            role="option"
                            aria-selected={i === active}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(person);
                            }}
                            onMouseEnter={() => setActive(i)}
                            className={cn(blockReset, "flex cursor-pointer items-center gap-2 rounded-pui-sm px-2 py-1.5 text-xs", i === active ? "bg-pui-muted text-pui-foreground" : "text-pui-foreground")}
                          >
                            <Avatar size="xs" name={person.name} src={person.avatarUrl} alt="" aria-hidden="true" />
                            <span className={cn(blockReset, "truncate font-medium")}>{person.name}</span>
                            <span className={cn(blockReset, "ms-auto text-pui-muted-foreground")}>@{handleOf(person)}</span>
                          </li>
                        ))}
                      </motion.ul>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
              <div className={cn(blockReset, "flex items-center gap-2 ps-[2.625rem]")}>
                {error ? (
                  <span id={`${id}-error`} role="alert" className={cn(blockReset, "min-w-0 flex-1 text-xs text-pui-danger-text")}>
                    {error}
                  </span>
                ) : (
                  <span id={`${id}-hint`} className={cn(blockReset, "min-w-0 flex-1 truncate text-xs text-pui-muted-foreground")}>
                    @ to mention · ⌘/Ctrl + Enter to send
                  </span>
                )}
                {!resolved ? (
                  <button type="button" onClick={() => setResolved(true)} className={iconButton}>
                    <CheckIcon aria-hidden="true" className="size-3.5" />
                    Resolve
                  </button>
                ) : null}
                <Button type="submit" size="sm" loading={posting} disabled={!draft.trim()}>
                  Reply
                </Button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
});
