import {
  Avatar,
  Button,
  NotificationCenter,
  NotificationList,
  type NotificationCenterProps,
  type NotificationItem,
} from "changelui";
import { useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  itemActions: boolean;
  footer: boolean;
  avatars: boolean;
};
const defaults: DemoProps = { itemActions: true, footer: true, avatars: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "itemActions", label: "Read / archive actions" },
  { type: "boolean", prop: "footer", label: "Footer link" },
  { type: "boolean", prop: "avatars", label: "Avatars" },
];
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
function seed(base: number, avatars: boolean): NotificationItem[] {
  const person = (name: string) => (avatars ? <Avatar name={name} size="sm" /> : undefined);
  return [
    {
      id: "n1",
      title: "Maya Patel mentioned you in “Q4 launch plan”",
      description: "“@you can you confirm the pricing page copy by Friday?”",
      time: base - 4 * MIN,
      avatar: person("Maya Patel"),
    },
    {
      id: "n2",
      title: "Jonas invited you to the Design team",
      time: base - 52 * MIN,
      avatar: person("Jonas Weber"),
      action: { label: "Accept invite", onClick: () => {} },
    },
    { id: "n3", title: "Deploy to production finished", description: "checkout-api 1.9.0 · 4 replicas healthy", time: base - 3 * HOUR, tone: "success", read: true },
    { id: "n4", title: "Payment failed for invoice INV-2041", description: "The card ending 4242 was declined. We'll retry tomorrow.", time: base - 26 * HOUR, tone: "danger" },
    { id: "n5", title: "Aiko Tanaka shared “Brand guidelines”", time: base - 2 * DAY, avatar: person("Aiko Tanaka"), read: true },
    { id: "n6", title: "Your weekly usage report is ready", time: base - 9 * DAY, tone: "info", read: true },
  ];
}
function useInbox(avatars: boolean) {
  const [items, setItems] = useState(() => seed(Date.now(), avatars));
  const counter = useRef(0);
  return {
    items,
    setItems,
    handlers: {
      onMarkRead: (id: string, read: boolean) => setItems((list) => list.map((item) => (item.id === id ? { ...item, read } : item))),
      onMarkAllRead: () => setItems((list) => list.map((item) => ({ ...item, read: true }))),
      onArchive: (id: string) => setItems((list) => list.filter((item) => item.id !== id)),
    },
    push: () => {
      counter.current += 1;
      setItems((list) => [
        { id: `new-${counter.current}`, title: `New comment on “Roadmap” (${counter.current})`, description: "“Looks good, shipping Tuesday.”", time: Date.now(), tone: "primary" },
        ...list,
      ]);
    },
  };
}
function Preview({ props }: { props: DemoProps }) {
  const inbox = useInbox(props.avatars);
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface shadow-pui-md">
        <NotificationList
          key={String(props.avatars)}
          items={props.avatars ? inbox.items : inbox.items.map((item) => ({ ...item, avatar: undefined }))}
          onMarkRead={inbox.handlers.onMarkRead}
          onMarkAllRead={inbox.handlers.onMarkAllRead}
          onArchive={props.itemActions ? inbox.handlers.onArchive : undefined}
          footer={
            props.footer ? (
              <Button size="sm" variant="ghost" tone="neutral" fullWidth>
                View all notifications
              </Button>
            ) : undefined
          }
          listClassName="max-h-[26rem]"
        />
      </div>
      <Button size="sm" variant="outline" tone="neutral" className="self-start" onClick={inbox.push}>
        Simulate a new notification
      </Button>
    </div>
  );
}
function Mini() {
  const base = 1_761_000_000_000;
  return (
    <div aria-hidden="true" className="pointer-events-none w-64 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface shadow-pui-sm">
      <NotificationList
        now={base}
        items={[
          { id: "a", title: "Maya mentioned you", time: base - 4 * MIN },
          { id: "b", title: "Deploy finished", time: base - 3 * HOUR, tone: "success", read: true },
        ]}
        listClassName="max-h-40"
      />
    </div>
  );
}
/** The bell in an app header: badge, ring on new items, popover inbox. */
function HeaderDemo() {
  const inbox = useInbox(true);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2 shadow-pui-xs">
        <span className="text-sm font-semibold">Acme Workspace</span>
        <span className="flex items-center gap-2">
          <NotificationCenter items={inbox.items} {...inbox.handlers} />
          <Avatar name="Sam Rivera" size="sm" />
        </span>
      </div>
      <Button size="sm" variant="outline" tone="neutral" className="self-start" onClick={inbox.push}>
        Simulate a new notification
      </Button>
    </div>
  );
}
/** Everything read: the Unread tab shows the caught-up state. */
function CaughtUpDemo() {
  const [items, setItems] = useState(() => seed(Date.now(), false).map((item) => ({ ...item, read: true })));
  return (
    <div className="overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface shadow-pui-xs">
      <NotificationList
        items={items}
        defaultFilter="unread"
        onMarkRead={(id, read) => setItems((list) => list.map((item) => (item.id === id ? { ...item, read } : item)))}
        listClassName="max-h-72"
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["items={notifications}", "onMarkRead={markRead}", "onMarkAllRead={markAllRead}"];
    if (props.itemActions) attrs.push("onArchive={archive}");
    if (props.footer) attrs.push('footer={<Button variant="ghost" fullWidth>View all</Button>}');
    return `// Bell + popover\n<NotificationCenter\n  ${attrs.join("\n  ")}\n/>\n\n// Or the panel on its own (inbox page)\n<NotificationList items={notifications} onMarkRead={markRead} />`;
  },
  propsTable: propDocs<NotificationCenterProps>()([
    { name: "items", type: "NotificationItem[]", required: true, description: "{ id, title, description?, time, read?, avatar?, tone?, action? }." },
    { name: "onMarkRead", type: "(id, read: boolean) => void", description: "Row click marks read; the hover action toggles read / unread." },
    { name: "onMarkAllRead", type: "() => void", description: "Shows “Mark all as read” in the header." },
    { name: "onArchive", type: "(id) => void", description: "Shows an archive action on each row." },
    { name: "onItemClick", type: "(item) => void", description: "Row click, e.g. navigate to the thread." },
    { name: "filter", type: '"all" | "unread"', description: "Controlled filter." },
    { name: "defaultFilter", type: '"all" | "unread"', default: '"all"', description: "Initial filter." },
    { name: "now", type: "Date | number", description: "Reference time for “5m” labels and day groups (default: client clock after hydration)." },
    { name: "title", type: "ReactNode", default: '"Notifications"', description: "Panel heading." },
    { name: "footer", type: "ReactNode", description: "Under the list, e.g. “View all”." },
    { name: "emptyState", type: "ReactNode", description: "Replaces the built-in empty and caught-up states." },
    { name: "listClassName", type: "string", description: "Classes for the scrolling list (max height)." },
    { name: "open", type: "boolean", description: "NotificationCenter only: controlled popover state." },
    { name: "align", type: '"start" | "center" | "end"', default: '"end"', description: "NotificationCenter only: panel alignment to the bell." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Open the bell; open a notification (marks it read)" },
    { keys: "Tab", action: "Each row reveals its Mark read and Archive buttons on focus" },
    { keys: "← / →", action: "Switch All / Unread" },
    { keys: "Escape", action: "Close the popover and return to the bell" },
  ],
  a11y: [
    "The bell is named with the unread count (“Notifications, 3 unread”).",
    "Unread rows start with hidden “Unread:” text; the dot is decorative.",
    "Day groups are labeled sections; mark read, mark all and archive are announced politely.",
  ],
  reducedMotion: "No bell ring, badge pop or row collapse; changes apply instantly.",
  examples: [
    { title: "App header bell", description: "Badge, ring on new items and a popover inbox.", Demo: HeaderDemo },
    { title: "All caught up", description: "Unread filter with nothing left.", Demo: CaughtUpDemo },
  ],
};
export default item;
