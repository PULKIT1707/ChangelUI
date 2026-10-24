import { ActivityFeed, Button, type ActivityEvent, type ActivityFeedProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  collapseBursts: boolean;
  groupByDay: boolean;
  showFilter: boolean;
  order: NonNullable<ActivityFeedProps["order"]>;
};

const defaults: DemoProps = { collapseBursts: true, groupByDay: true, showFilter: true, order: "newest" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "collapseBursts", label: "Fold bursts" },
  { type: "boolean", prop: "groupByDay", label: "Group by day" },
  { type: "boolean", prop: "showFilter", label: "Filter switch" },
  { type: "select", prop: "order", label: "Order", options: ["newest", "oldest"] },
];

const MIN = 60_000;
const HOUR = 60 * MIN;
const maya = { id: "maya", name: "Maya Chen" };
const omar = { id: "omar", name: "Omar Haddad" };
const lena = { id: "lena", name: "Lena Novak" };

function issueEvents(now: number): ActivityEvent[] {
  return [
    { id: "e1", actor: lena, kind: "create", action: "created the issue", at: now - 50 * HOUR },
    { id: "e2", actor: lena, action: "added a label", changes: [{ field: "Labels", to: "billing" }], at: now - 49.5 * HOUR },
    { id: "e3", kind: "system", action: "Linked to incident INC-204 by the alert bot", at: now - 27 * HOUR },
    { id: "e4", actor: omar, kind: "comment", action: "commented", comment: "Repro’d on Safari 18: the card form loses focus after the 3DS popup closes.", at: now - 26 * HOUR },
    { id: "e5", actor: maya, action: "changed the status", changes: [{ field: "Status", from: "Triage", to: "In progress" }], at: now - 3 * HOUR - 12 * MIN },
    { id: "e6", actor: maya, action: "raised the priority", changes: [{ field: "Priority", from: "Medium", to: "Urgent" }], at: now - 3 * HOUR - 9 * MIN },
    { id: "e7", actor: maya, action: "assigned the issue", changes: [{ field: "Assignee", from: "Lena Novak", to: "Omar Haddad" }], at: now - 3 * HOUR - 6 * MIN },
    { id: "e8", actor: maya, action: "set the cycle", changes: [{ field: "Cycle", to: "Cycle 42" }, { field: "Estimate", from: "3", to: "5" }], at: now - 3 * HOUR - 4 * MIN },
    { id: "e9", actor: omar, kind: "comment", action: "commented", comment: "Fix is up for review. Restoring focus to the first invalid field after the popup resolves.", at: now - 40 * MIN },
    { id: "e10", actor: omar, action: "changed the status", changes: [{ field: "Status", from: "In progress", to: "In review" }], at: now - 38 * MIN },
  ];
}

function Preview({ props }: { props: DemoProps }) {
  const [now] = useState(() => Date.now());
  const [events] = useState(() => issueEvents(now));
  return (
    <div className="w-full max-w-lg">
      <ActivityFeed events={events} collapseBursts={props.collapseBursts} groupByDay={props.groupByDay} showFilter={props.showFilter} order={props.order} />
    </div>
  );
}

function Mini() {
  const [now] = useState(() => Date.now());
  const [events] = useState(() => issueEvents(now).slice(4, 10));
  return (
    <div aria-hidden="true" className="pointer-events-none w-72 origin-top scale-90">
      <ActivityFeed events={events} showFilter={false} hideLabel />
    </div>
  );
}

const LIVE: Omit<ActivityEvent, "id" | "at">[] = [
  { actor: lena, kind: "comment", action: "commented", comment: "Approved. Nice catch on the focus trap." },
  { actor: omar, action: "changed the status", changes: [{ field: "Status", from: "In review", to: "Done" }] },
  { kind: "system", action: "Deployed to production in release 2.14.0" },
  { actor: maya, action: "removed a label", changes: [{ field: "Labels", from: "billing" }] },
];

/** New events slide in at the top and are announced in a polite status. */
function LiveDemo() {
  const [now] = useState(() => Date.now());
  const [events, setEvents] = useState<ActivityEvent[]>(() => issueEvents(now).slice(6));
  const [step, setStep] = useState(0);
  const next = LIVE[step % LIVE.length];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          tone="neutral"
          onClick={() => {
            if (!next) return;
            setEvents((list) => [...list, { ...next, id: `live-${step}`, at: Date.now() }]);
            setStep((s) => s + 1);
          }}
        >
          Simulate an event
        </Button>
      </div>
      <ActivityFeed events={events} label="Issue PAY-311" />
    </div>
  );
}

function dealEvents(now: number): ActivityEvent[] {
  const sam = { id: "sam", name: "Sam Okafor" };
  const ivy = { id: "ivy", name: "Ivy Laurent" };
  return [
    { id: "d1", actor: sam, kind: "create", action: "opened the deal", at: now - 9 * 24 * HOUR },
    { id: "d2", actor: sam, action: "updated the deal", changes: [{ field: "Stage", from: "Lead", to: "Qualified" }], at: now - 6 * 24 * HOUR },
    { id: "d3", actor: sam, action: "updated the amount", changes: [{ field: "Amount", from: "$18,000", to: "$24,500" }], at: now - 6 * 24 * HOUR + 4 * MIN },
    { id: "d4", actor: ivy, kind: "comment", action: "left a note", comment: "Procurement wants annual billing and a security questionnaire.", at: now - 4 * 24 * HOUR },
    { id: "d5", kind: "system", action: "Contract sent for signature", at: now - 2 * 24 * HOUR },
    { id: "d6", actor: sam, action: "moved the deal", changes: [{ field: "Stage", from: "Proposal", to: "Negotiation" }], at: now - 26 * HOUR },
    { id: "d7", actor: sam, action: "updated the close date", changes: [{ field: "Close date", from: "Nov 30", to: "Nov 14" }], at: now - 26 * HOUR + 3 * MIN },
    { id: "d8", actor: sam, action: "updated the probability", changes: [{ field: "Probability", from: "40%", to: "70%" }], at: now - 26 * HOUR + 5 * MIN },
    { id: "d9", kind: "system", action: "Invoice INV-0192 paid", at: now - 2 * HOUR },
  ];
}

/** CRM deal history in a fixed-height pane: day headings stick while you scroll. */
function DealDemo() {
  const [now] = useState(() => Date.now());
  const [events] = useState(() => dealEvents(now));
  return (
    <div className="mx-auto h-80 w-full max-w-md overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-background px-4 pb-1 pt-3">
      <ActivityFeed events={events} label="Acme renewal" defaultFilter="history" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ActivityFeed\n  events={events}${props.collapseBursts ? "" : "\n  collapseBursts={false}"}${props.groupByDay ? "" : "\n  groupByDay={false}"}${props.showFilter ? "" : "\n  showFilter={false}"}${props.order !== "newest" ? `\n  order="${props.order}"` : ""}\n/>\n\n// events: [{ id, actor: { id, name }, kind: "change", action: "changed the status",\n//   changes: [{ field: "Status", from: "Todo", to: "Done" }], at: Date.now() }]`,
  propsTable: propDocs<ActivityFeedProps>()([
    { name: "events", type: "ActivityEvent[]", required: true, description: "{ id, actor?, kind?, at, action?, changes?, comment?, icon? } in any order." },
    { name: "order", type: '"newest" | "oldest"', default: '"newest"', description: "Sort direction." },
    { name: "collapseBursts", type: "boolean", default: "true", description: "Fold back-to-back changes by one person into one expandable row." },
    { name: "burstWindow", type: "number", default: "900000", description: "Max gap (ms) between two changes of a burst." },
    { name: "groupByDay", type: "boolean", default: "true", description: "Sticky Today / Yesterday / date headings." },
    { name: "filter", type: '"all" | "comments" | "history"', description: "Controlled filter (defaultFilter, onFilterChange)." },
    { name: "showFilter", type: "boolean", default: "true", description: "Show the All / Comments / History switch with counts." },
    { name: "now", type: "number", description: "Reference time for Today/Yesterday. Default: the client clock." },
    { name: "timeZone", type: "string", description: "IANA zone for days and times. Default: the user’s (UTC on the server)." },
    { name: "locale", type: "string", description: "Time and date formatting locale." },
    { name: "label", type: "string", default: '"Activity"', description: "Heading and accessible name (hideLabel keeps only the name)." },
    { name: "emptyMessage", type: "ReactNode", default: '"No activity yet."', description: "Shown when nothing matches the filter." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Filter buttons, then each burst toggle" },
    { keys: "Enter / Space", action: "Switch filter or expand a burst" },
  ],
  a11y: [
    "A labelled section with one group per day; each day is an ordered list.",
    "Burst toggles are buttons with aria-expanded and aria-controls.",
    "From and to values carry hidden “from” / “to” words, so chips read as sentences.",
    "Times are <time> elements with the full date in a title; new events are announced in a polite status.",
  ],
  reducedMotion: "New rows and bursts fade instead of sliding and growing; the filter pill jumps.",
  examples: [
    { title: "Live updates", description: "Push an event: it slides in and is announced.", Demo: LiveDemo },
    { title: "Deal history in a scroll pane", description: "History filter, sticky day headings and two folded bursts.", Demo: DealDemo },
  ],
};

export default item;
