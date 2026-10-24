"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ArchiveIcon, BellIcon, CheckCheckIcon, CheckIcon, InboxIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Align, Tone } from "../lib/types";
import { useMinuteClock } from "../lib/use-minute-clock";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

export interface NotificationItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** When it happened: a Date, an epoch in ms or an ISO string. */
  time: Date | number | string;
  read?: boolean;
  /** Avatar or icon shown on the left. Default: a tinted bell. */
  avatar?: React.ReactNode;
  /** Tints the default icon. Default "primary". */
  tone?: Tone;
  /** Inline call to action, e.g. "Accept invite". */
  action?: { label: string; onClick: () => void };
}

export type NotificationFilter = "all" | "unread";

export interface NotificationListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  items: readonly NotificationItem[];
  /** Mark one item read (true) or unread (false). */
  onMarkRead?: (id: string, read: boolean) => void;
  onMarkAllRead?: () => void;
  /** Shows an archive action on each item. */
  onArchive?: (id: string) => void;
  /** Row click; the item is also marked read. */
  onItemClick?: (item: NotificationItem) => void;
  /** Default "Notifications". */
  title?: React.ReactNode;
  /** Controlled filter. */
  filter?: NotificationFilter;
  /** Default "all". */
  defaultFilter?: NotificationFilter;
  onFilterChange?: (filter: NotificationFilter) => void;
  /** Reference time for relative labels and day groups. Default: the client clock after hydration. */
  now?: Date | number;
  /** Default undefined (the user's locale). */
  locale?: string;
  /** Under the list, e.g. a "View all" link. */
  footer?: React.ReactNode;
  /** Shown when nothing matches the filter. */
  emptyState?: React.ReactNode;
  /** Classes for the scrolling list area (sets its max height). */
  listClassName?: string;
}

export interface NotificationCenterProps extends NotificationListProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel alignment to the bell. Default "end". */
  align?: Align;
  /** Classes for the bell button. */
  triggerClassName?: string;
}

const toTime = (value: Date | number | string) => (value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value));
const DAY = 86_400_000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today", "Yesterday", "This week" or "Earlier" for a timestamp relative to now. */
export function notificationGroup(time: number, now: number): "Today" | "Yesterday" | "This week" | "Earlier" {
  const today = startOfDay(now);
  if (time >= today) return "Today";
  if (time >= today - DAY) return "Yesterday";
  if (time >= today - 6 * DAY) return "This week";
  return "Earlier";
}

/** Compact relative time: "now", "5m", "3h", "2d", then a short date. */
export function formatNotificationTime(time: number, now: number, locale?: string): string {
  const diff = Math.max(0, now - time);
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(time);
}

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;

/**
 * Inbox panel: All / Unread filter, day groups, unread dots, per-item mark read and archive on
 * hover or focus, inline actions and mark all as read. Use it on its own (a full inbox page) or
 * through NotificationCenter (a bell with an unread badge that opens it in a popover).
 */
export const NotificationList = React.forwardRef<HTMLDivElement, NotificationListProps>(function NotificationList(
  {
    items,
    onMarkRead,
    onMarkAllRead,
    onArchive,
    onItemClick,
    title = "Notifications",
    filter: filterProp,
    defaultFilter = "all",
    onFilterChange,
    now: nowProp,
    locale,
    footer,
    emptyState,
    listClassName,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const clock = useMinuteClock();
  const id = React.useId();
  const [filterState, setFilterState] = React.useState<NotificationFilter>(defaultFilter);
  const filter = filterProp ?? filterState;
  const setFilter = (next: NotificationFilter) => {
    if (filterProp === undefined) setFilterState(next);
    onFilterChange?.(next);
  };
  const [announcement, setAnnouncement] = React.useState("");
  const unread = items.filter((item) => !item.read).length;
  // No clock on the server: times and groups appear after hydration unless `now` is given.
  const now = nowProp !== undefined ? toTime(nowProp) : clock;
  const visible = filter === "unread" ? items.filter((item) => !item.read) : items;
  const sorted = [...visible].sort((a, b) => toTime(b.time) - toTime(a.time));
  const groups = new Map<string, NotificationItem[]>();
  for (const item of sorted) {
    const key = now === null ? "" : notificationGroup(toTime(item.time), now);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const orderedGroups = [...groups.entries()].sort(
    ([a], [b]) => GROUP_ORDER.indexOf(a as (typeof GROUP_ORDER)[number]) - GROUP_ORDER.indexOf(b as (typeof GROUP_ORDER)[number]),
  );

  const markAll = () => {
    onMarkAllRead?.();
    setAnnouncement("All notifications marked as read");
  };
  const toggleRead = (item: NotificationItem) => {
    onMarkRead?.(item.id, !item.read);
    setAnnouncement(item.read ? "Marked as unread" : "Marked as read");
  };
  const archive = (item: NotificationItem) => {
    onArchive?.(item.id);
    setAnnouncement("Notification archived");
  };

  const itemTransition = reduced ? { duration: 0 } : { duration: 0.22, ease: easings.out };

  return (
    <div
      ref={ref}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col text-sm text-pui-surface-foreground", className)}
    >
      <div className={cn(blockReset, "flex items-center justify-between gap-3 px-4 pt-3.5 pb-2")}>
        <h2 id={`${id}-title`} className={cn(blockReset, "text-[0.95rem] font-semibold text-pui-foreground")}>
          {title}
        </h2>
        {onMarkAllRead ? (
          <Button
            size="sm"
            variant="ghost"
            tone="neutral"
            disabled={unread === 0}
            leadingIcon={<CheckCheckIcon className="size-3.5" />}
            onClick={markAll}
            className="-me-2"
          >
            Mark all as read
          </Button>
        ) : null}
      </div>
      <div className={cn(blockReset, "px-4 pb-2")}>
        <SegmentedControl size="sm" fullWidth aria-label="Show" value={filter} onValueChange={(next) => setFilter(next as NotificationFilter)}>
          <SegmentedControlItem value="all">All</SegmentedControlItem>
          <SegmentedControlItem value="unread">
            Unread
            {unread > 0 ? (
              <span className={cn(blockReset, "ms-1 rounded-pui-full bg-pui-primary/15 px-1.5 text-[0.7rem] font-semibold tabular-nums text-pui-primary-text")}>
                {unread}
              </span>
            ) : null}
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <div
        role="region"
        aria-labelledby={`${id}-title`}
        className={cn(blockReset, focusRing, "max-h-96 overflow-y-auto overscroll-contain border-t border-pui-border focus-visible:-outline-offset-2", listClassName)}
      >
        {sorted.length === 0 ? (
          (emptyState ?? (
            <div className={cn(blockReset, "flex flex-col items-center gap-2 px-6 py-10 text-center")}>
              <span className={cn(blockReset, "flex size-11 items-center justify-center rounded-pui-full bg-pui-muted text-pui-muted-foreground")}>
                <InboxIcon className="size-5" />
              </span>
              <p className={cn(blockReset, "font-medium text-pui-foreground")}>{filter === "unread" && items.length > 0 ? "You're all caught up" : "No notifications yet"}</p>
              <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                {filter === "unread" && items.length > 0 ? "New activity will show up here." : "When something happens, you'll see it here."}
              </p>
            </div>
          ))
        ) : (
          orderedGroups.map(([group, groupItems]) => (
            <section key={group || "all"} aria-label={group || undefined}>
              {group ? (
                <h3 className={cn(blockReset, "sticky top-0 z-10 bg-pui-surface/95 px-4 pt-2.5 pb-1 text-[0.7rem] font-medium tracking-wide text-pui-muted-foreground uppercase backdrop-blur-sm")}>
                  {group}
                </h3>
              ) : null}
              <ul className={listReset}>
                <AnimatePresence initial={false}>
                  {groupItems.map((item) => (
                    <motion.li
                      key={item.id}
                      layout={reduced ? false : "position"}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={itemTransition}
                      className={cn(blockReset, "overflow-hidden")}
                    >
                      <Row
                        item={item}
                        now={now}
                        locale={locale}
                        reduced={reduced}
                        onOpen={() => {
                          if (!item.read) onMarkRead?.(item.id, true);
                          onItemClick?.(item);
                        }}
                        onToggleRead={onMarkRead ? () => toggleRead(item) : undefined}
                        onArchive={onArchive ? () => archive(item) : undefined}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </div>
      {footer ? <div className={cn(blockReset, "border-t border-pui-border px-2 py-1.5")}>{footer}</div> : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});

interface RowProps {
  item: NotificationItem;
  now: number | null;
  locale: string | undefined;
  reduced: boolean;
  onOpen: () => void;
  onToggleRead?: () => void;
  onArchive?: () => void;
}

const actionButton = cn(
  controlReset,
  focusRing,
  "relative z-10 flex size-7 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
);

function Row({ item, now, locale, reduced, onOpen, onToggleRead, onArchive }: RowProps) {
  const time = toTime(item.time);
  const unread = !item.read;
  const iso = Number.isFinite(time) ? new Date(time).toISOString() : undefined;
  return (
    <div
      data-unread={unread || undefined}
      className={cn(
        blockReset,
        "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-pui-muted/60 focus-within:bg-pui-muted/60",
        unread && "bg-pui-primary/[0.045]",
      )}
    >
      <span aria-hidden="true" className={cn(blockReset, "relative mt-0.5 shrink-0")}>
        {item.avatar ?? (
          <span
            className={cn(
              blockReset,
              toneClasses[item.tone ?? "primary"],
              "flex size-8 items-center justify-center rounded-pui-full bg-(--pui-tone)/12 text-(--pui-tone-text)",
            )}
          >
            <BellIcon className="size-4" />
          </span>
        )}
      </span>
      <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            controlReset,
            "cursor-pointer text-left outline-hidden after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-pui-md focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-pui-ring",
          )}
        >
          <span className={cn(blockReset, "block pe-14 leading-snug", unread ? "font-medium text-pui-foreground" : "text-pui-foreground/85")}>
            {unread ? <span className={cn(blockReset, "sr-only")}>Unread: </span> : null}
            {item.title}
          </span>
          {item.description ? (
            <span className={cn(blockReset, "mt-0.5 block text-xs leading-relaxed text-pui-muted-foreground")}>{item.description}</span>
          ) : null}
        </button>
        {item.action ? (
          <span className={cn(blockReset, "relative z-10 mt-1.5")}>
            <Button size="sm" variant="outline" tone="neutral" onClick={item.action.onClick}>
              {item.action.label}
            </Button>
          </span>
        ) : null}
      </span>
      <span className={cn(blockReset, "absolute top-3 right-4 flex items-center gap-2")}>
        <time
          dateTime={iso}
          className={cn(
            blockReset,
            "text-xs tabular-nums text-pui-muted-foreground transition-opacity group-hover:opacity-0 group-focus-within:opacity-0",
            !(onToggleRead || onArchive) && "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          {now === null ? "" : formatNotificationTime(time, now, locale)}
        </time>
        <AnimatePresence initial={false}>
          {unread ? (
            <motion.span
              key="dot"
              aria-hidden="true"
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0 }}
              transition={springs.snappy}
              className={cn(blockReset, "block size-2 rounded-pui-full bg-pui-primary")}
            />
          ) : null}
        </AnimatePresence>
      </span>
      {onToggleRead || onArchive ? (
        <span
          className={cn(
            blockReset,
            "absolute top-2 right-3 z-10 flex gap-0.5 rounded-pui-md border border-pui-border bg-pui-surface p-0.5 opacity-0 shadow-pui-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          {onToggleRead ? (
            <button type="button" aria-label={unread ? "Mark as read" : "Mark as unread"} title={unread ? "Mark as read" : "Mark as unread"} onClick={onToggleRead} className={actionButton}>
              {unread ? <CheckIcon className="size-3.5" /> : <span className={cn(blockReset, "block size-2 rounded-pui-full border-[1.5px] border-current")} />}
            </button>
          ) : null}
          {onArchive ? (
            <button type="button" aria-label="Archive" title="Archive" onClick={onArchive} className={actionButton}>
              <ArchiveIcon className="size-3.5" />
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Bell button with an animated unread badge that opens a NotificationList in a popover. The bell
 * rings when the unread count goes up.
 */
export const NotificationCenter = React.forwardRef<HTMLDivElement, NotificationCenterProps>(function NotificationCenter(
  { open, defaultOpen, onOpenChange, align = "end", triggerClassName, className, items, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const unread = items.filter((item) => !item.read).length;
  const [ring, setRing] = React.useState(0);
  const [prevUnread, setPrevUnread] = React.useState(unread);
  if (prevUnread !== unread) {
    setPrevUnread(unread);
    if (unread > prevUnread) setRing((n) => n + 1);
  }
  const badge = unread > 9 ? "9+" : String(unread);
  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          focusRing,
          "relative inline-flex size-9 cursor-pointer items-center justify-center rounded-pui-md text-pui-foreground transition-colors hover:bg-pui-muted data-[state=open]:bg-pui-muted",
          triggerClassName,
        )}
      >
        <motion.span
          key={ring}
          aria-hidden="true"
          initial={false}
          animate={reduced || ring === 0 ? { rotate: 0 } : { rotate: [0, 16, -14, 10, -6, 0] }}
          transition={{ duration: 0.6, ease: easings.out }}
          style={{ transformOrigin: "50% 10%" }}
          className={cn(blockReset, "flex")}
        >
          <BellIcon className="size-[1.15rem]" />
        </motion.span>
        <AnimatePresence initial={false}>
          {unread > 0 ? (
            <motion.span
              key="badge"
              aria-hidden="true"
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0 }}
              transition={springs.bouncy}
              className={cn(
                blockReset,
                "absolute -top-0.5 -right-0.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center overflow-hidden rounded-pui-full bg-pui-danger px-1 text-[0.625rem] leading-none font-semibold tabular-nums text-pui-danger-foreground ring-2 ring-pui-background",
              )}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={badge}
                  initial={reduced ? false : { y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: -8, opacity: 0 }}
                  transition={springs.snappy}
                  className={cn(blockReset, "block")}
                >
                  {badge}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </PopoverTrigger>
      <PopoverContent align={align} aria-label="Notifications" className="w-[min(24rem,calc(100vw-1rem))] overflow-hidden p-0">
        <NotificationList ref={ref} items={items} className={className} {...props} />
      </PopoverContent>
    </Popover>
  );
});
