import { AnimatedList, Button, IconButton, Spinner, type AnimatedListProps } from "changelui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BellIcon, CheckGlyph, CreditCardIcon, GiftIcon, MailIcon, SearchIcon, UserIcon, ZapIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { direction: NonNullable<AnimatedListProps["direction"]>; max: number; interval: number; running: boolean; announce: boolean };
const defaults: DemoProps = { direction: "top", max: 5, interval: 1.8, running: true, announce: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "direction", label: "Direction", options: ["top", "bottom"] },
  { type: "number", prop: "max", label: "Max items", min: 2, max: 8, step: 1 },
  { type: "number", prop: "interval", label: "Every (s)", min: 0.6, max: 4, step: 0.2 },
  { type: "boolean", prop: "running", label: "Running" },
  { type: "boolean", prop: "announce", label: "Announce (live region)" },
];

interface Note {
  id: number;
  title: string;
  body: string;
  icon: ReactNode;
  tint: string;
}

const TEMPLATES: Omit<Note, "id">[] = [
  { title: "Payment received", body: "$1,240.00 from Northwind", icon: <CreditCardIcon />, tint: "var(--pui-chart-2)" },
  { title: "New signup", body: "maya@example.com joined Pro", icon: <UserIcon />, tint: "var(--pui-chart-1)" },
  { title: "New message", body: "Leo: “Shipped the fix, take a look?”", icon: <MailIcon />, tint: "var(--pui-chart-3)" },
  { title: "Deploy finished", body: "web · production · 42s", icon: <ZapIcon />, tint: "var(--pui-chart-4)" },
  { title: "Referral bonus", body: "You earned 2 free months", icon: <GiftIcon />, tint: "var(--pui-chart-5)" },
  { title: "Reminder", body: "Design review in 10 minutes", icon: <BellIcon />, tint: "var(--pui-primary)" },
];

function makeNote(id: number): Note {
  return { id, ...(TEMPLATES[id % TEMPLATES.length] ?? TEMPLATES[0]!) };
}

function NoteRow({ note, onDismiss }: { note: Note; onDismiss?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-pui-xl border border-pui-border bg-pui-surface/90 p-3 shadow-pui-md backdrop-blur-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-pui-lg text-pui-primary-foreground shadow-pui-xs" style={{ background: note.tint }}>
        {note.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-pui-surface-foreground">
          {note.title}
          <span className="text-xs font-normal text-pui-muted-foreground">now</span>
        </p>
        <p className="m-0 truncate text-xs text-pui-muted-foreground">{note.body}</p>
      </div>
      {onDismiss ? (
        <IconButton aria-label={`Dismiss ${note.title}`} variant="ghost" size="sm" onClick={onDismiss}>
          <span aria-hidden="true">✕</span>
        </IconButton>
      ) : null}
    </div>
  );
}

function useFeed(interval: number, running: boolean, cap: number) {
  const [notes, setNotes] = useState<Note[]>(() => [makeNote(2), makeNote(1), makeNote(0)]);
  const next = useRef(3);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const note = makeNote(next.current++);
      setNotes((list) => [note, ...list].slice(0, cap));
    }, interval * 1000);
    return () => window.clearInterval(id);
  }, [interval, running, cap]);
  return notes;
}

function Preview({ props }: { props: DemoProps }) {
  const { direction, max, interval, running, announce } = props;
  const notes = useFeed(interval, running, 12);
  const ordered = direction === "top" ? notes : [...notes].reverse();
  return (
    <div className="flex h-[22rem] w-full max-w-sm flex-col justify-start overflow-hidden" style={{ justifyContent: direction === "bottom" ? "flex-end" : "flex-start" }}>
      <AnimatedList direction={direction} max={max} announce={announce} label="Notifications">
        {ordered.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
      </AnimatedList>
    </div>
  );
}

const STEPS = ["Reading the repository", "Finding where totals are computed", "Writing a fix in cart.ts", "Running 214 tests", "Opening a pull request"];

function AgentDemo() {
  const [shown, setShown] = useState(1);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (shown >= STEPS.length + 1) return;
    const id = window.setTimeout(() => setShown((s) => s + 1), 1100);
    return () => window.clearTimeout(id);
  }, [shown, run]);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-pui-foreground">Agent run #{run + 41}</span>
        <Button size="sm" variant="outline" onClick={() => { setShown(1); setRun((r) => r + 1); }}>
          Run again
        </Button>
      </div>
      <AnimatedList key={run} direction="bottom" label="Agent steps" className="min-h-[16rem]">
        {STEPS.slice(0, Math.min(shown, STEPS.length)).map((step, i) => {
          const done = i < shown - 1;
          return (
            <div key={step} className="flex items-center gap-3 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2 text-sm text-pui-surface-foreground">
              <span className={`grid size-6 place-items-center rounded-full ${done ? "bg-pui-success text-pui-success-foreground" : "bg-pui-muted"}`}>
                {done ? <CheckGlyph className="size-3.5" /> : <Spinner size="sm" label="Working" />}
              </span>
              <span className={done ? "text-pui-muted-foreground" : "font-medium"}>{step}</span>
            </div>
          );
        })}
        {shown > STEPS.length ? (
          <div key="done" className="rounded-pui-lg border border-pui-success/40 bg-pui-success/10 px-3 py-2 text-sm font-medium text-pui-success-text">
            Done: pull request #318 is ready for review
          </div>
        ) : null}
      </AnimatedList>
    </div>
  );
}

function InboxDemo() {
  const [notes, setNotes] = useState<Note[]>(() => [0, 1, 2, 3].map(makeNote));
  const next = useRef(4);
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setNotes((list) => [makeNote(next.current++), ...list])}>
          <SearchIcon /> Fetch new
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setNotes([])} disabled={notes.length === 0}>
          Clear all
        </Button>
      </div>
      <AnimatedList label="Inbox" className="min-h-[18rem]">
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} onDismiss={() => setNotes((list) => list.filter((n) => n.id !== note.id))} />
        ))}
      </AnimatedList>
      {notes.length === 0 ? <p className="m-0 text-center text-sm text-pui-muted-foreground">All caught up.</p> : null}
    </div>
  );
}

function Mini() {
  return (
    <div className="flex w-40 flex-col gap-1.5">
      {[1, 0.75, 0.5].map((o, i) => (
        <div key={i} className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface p-1.5 shadow-pui-xs" style={{ opacity: o, transform: `scale(${1 - i * 0.03})` }}>
          <span className="size-4 rounded-pui-sm" style={{ background: `var(--pui-chart-${i + 1})` }} />
          <span className="h-1.5 w-16 rounded-full bg-pui-foreground/30" />
        </div>
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ direction, max, announce }) =>
    toJsx<Record<string, unknown>>(
      "AnimatedList",
      { direction, max, announce, label: "Notifications" },
      { direction: "top", max: undefined, announce: true, label: "" },
      `{notifications.map((n) => (\n  <Notification key={n.id} {...n} />\n))}`,
    ),
  propsTable: propDocs<AnimatedListProps>()([
    { name: "children", type: "ReactNode", description: "Keyed elements in display order; new keys animate in, removed keys animate out." },
    { name: "direction", type: '"top" | "bottom"', default: '"top"', description: "Where new items arrive from." },
    { name: "max", type: "number", description: "Keep at most this many (first for top, last for bottom)." },
    { name: "announce", type: "boolean", default: "true", description: "role=log polite live region for new items." },
    { name: "animateInitial", type: "boolean", default: "false", description: "Animate the first render's items, staggered." },
    { name: "stagger", type: "number", default: "0.06", description: "Seconds between items when animateInitial is on." },
    { name: "label", type: "string", description: "Accessible name of the list." },
    { name: "itemClassName", type: "string", description: "Class for each li wrapper." },
  ]),
  a11y: [
    "Renders a ul inside a role=log, aria-live=polite region, so new items are announced once (opt out with announce={false}).",
    "Removed items leave the accessibility tree immediately; only their visual exit is animated.",
    "Turn announce off for high-frequency decorative feeds so screen readers are not flooded.",
  ],
  reducedMotion: "Items fade in and out in 150ms without the spring, scale or layout glide.",
  examples: [
    { title: "Agent steps", description: 'direction="bottom" log with spinners that turn into checks.', Demo: AgentDemo },
    { title: "Inbox", description: "Dismiss buttons: the rest of the list reflows on a spring.", Demo: InboxDemo },
  ],
};
export default item;
