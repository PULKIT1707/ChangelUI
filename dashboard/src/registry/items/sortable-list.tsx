import { SortableHandle, SortableItem, SortableList, type SortableListProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  handle: boolean;
  gap: number;
};

const defaults: DemoProps = { handle: false, gap: 8 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "handle", label: "Drag handle only" },
  { type: "number", prop: "gap", label: "Gap", min: 0, max: 24, step: 2 },
];

interface Task {
  id: string;
  title: string;
  meta: string;
  tone: string;
}

const TASKS: Task[] = [
  { id: "auth", title: "Ship passkey sign-in", meta: "Security · 3 pts", tone: "bg-pui-danger" },
  { id: "search", title: "Instant search in docs", meta: "Docs · 5 pts", tone: "bg-pui-primary" },
  { id: "billing", title: "Usage-based billing", meta: "Growth · 8 pts", tone: "bg-pui-warning" },
  { id: "export", title: "CSV export for reports", meta: "Analytics · 2 pts", tone: "bg-pui-success" },
  { id: "a11y", title: "Audit focus rings", meta: "Design · 1 pt", tone: "bg-pui-info" },
];

function Preview({ props }: { props: DemoProps }) {
  const [tasks, setTasks] = useState(TASKS);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="m-0 text-sm font-semibold">Sprint priorities</p>
        <span className="text-xs text-pui-muted-foreground" aria-live="polite">
          {saved ?? "Drag to rank, or Space + arrows"}
        </span>
      </div>
      <SortableList
        aria-label="Sprint priorities"
        values={tasks}
        onValuesChange={setTasks}
        onReorderEnd={(next) => setSaved(`Saved · ${next[0]?.title} is #1`)}
        handle={props.handle}
        gap={props.gap}
      >
        {tasks.map((task, i) => (
          <SortableItem key={task.id} value={task} label={task.title} className="flex items-center gap-3 px-3 py-2.5">
            {props.handle ? <SortableHandle /> : null}
            <span className="w-5 text-center text-xs font-semibold tabular-nums text-pui-muted-foreground">{i + 1}</span>
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${task.tone}`} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{task.title}</span>
              <span className="text-xs text-pui-muted-foreground">{task.meta}</span>
            </span>
          </SortableItem>
        ))}
      </SortableList>
    </div>
  );
}

const SONGS = [
  { id: "1", title: "Northern Lights", artist: "Saltwater", time: "3:42", hue: "var(--pui-chart-1)" },
  { id: "2", title: "Paper Planes", artist: "June Static", time: "2:58", hue: "var(--pui-chart-2)" },
  { id: "3", title: "Night Drive", artist: "Neon Harbor", time: "4:10", hue: "var(--pui-chart-3)" },
  { id: "4", title: "Glasshouse", artist: "Mira Vale", time: "3:21", hue: "var(--pui-chart-4)" },
];

function Playlist() {
  const [songs, setSongs] = useState(SONGS);
  return (
    <SortableList aria-label="Up next" values={songs} onValuesChange={setSongs} handle gap={4} className="w-full">
      {songs.map((song) => (
        <SortableItem key={song.id} value={song} label={song.title} className="flex items-center gap-3 border-transparent bg-transparent p-1.5 shadow-none hover:bg-pui-muted">
          <span aria-hidden="true" className="size-10 shrink-0 rounded-pui-md" style={{ background: `linear-gradient(135deg, ${song.hue}, var(--pui-muted))` }} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{song.title}</span>
            <span className="text-xs text-pui-muted-foreground">{song.artist}</span>
          </span>
          <span className="text-xs tabular-nums text-pui-muted-foreground">{song.time}</span>
          <SortableHandle />
        </SortableItem>
      ))}
    </SortableList>
  );
}

const TABS = ["Inbox", "Calendar", "Docs", "Figma", "Linear"];

function PinnedTabs() {
  const [tabs, setTabs] = useState(TABS);
  return (
    <div className="flex w-full flex-col gap-2">
      <SortableList aria-label="Pinned tabs" axis="x" values={tabs} onValuesChange={setTabs} gap={6}>
        {tabs.map((tab) => (
          <SortableItem key={tab} value={tab} className="rounded-full px-3 py-1.5 text-sm font-medium">
            {tab}
          </SortableItem>
        ))}
      </SortableList>
      <p className="m-0 text-xs text-pui-muted-foreground">axis="x" · order: {tabs.join(" → ")}</p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-52">
      <SortableList values={["Design", "Build", "Ship"]} onValuesChange={() => {}} gap={6}>
        {["Design", "Build", "Ship"].map((v, i) => (
          <SortableItem key={v} value={v} tabIndex={-1} className={`px-3 py-2 text-sm ${i === 1 ? "translate-x-2 rotate-1 shadow-pui-lg" : ""}`}>
            {v}
          </SortableItem>
        ))}
      </SortableList>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [items, setItems] = useState(["Design", "Build", "Ship"]);\n\n` +
    toJsx<Record<string, unknown>>(
      "SortableList",
      { values: "{items}", onValuesChange: "{setItems}", ...props },
      { handle: false, gap: 8 },
      `{items.map((item) => (\n  <SortableItem key={item} value={item}>\n    ${props.handle ? "<SortableHandle />\n    " : ""}{item}\n  </SortableItem>\n))}`,
      controls as ControlSpec<Record<string, unknown>>[],
    )
      .replace('values="{items}"', "values={items}")
      .replace('onValuesChange="{setItems}"', "onValuesChange={setItems}"),
  propsTable: propDocs<SortableListProps<unknown>>()([
    { name: "values", type: "T[]", description: "Current order; keep it in state.", required: true },
    { name: "onValuesChange", type: "(values: T[]) => void", description: "Every step of a move.", required: true },
    { name: "onReorderEnd", type: "(values: T[]) => void", description: "Once per finished move, e.g. to save." },
    { name: "axis", type: '"x" | "y"', default: '"y"', description: "Direction of the list." },
    { name: "handle", type: "boolean", default: "false", description: "Drag only from SortableHandle." },
    { name: "gap", type: "number", default: "8", description: "Gap between items in px." },
    { name: "announcements", type: "Partial<SortableAnnouncements>", description: "pickedUp / moved / dropped / cancelled texts." },
    { name: "instructionsLabel", type: "string", description: "Keyboard instructions read with each item." },
  ]),
  keyboard: [
    { keys: "Space / Enter", action: "Pick up or drop the focused item" },
    { keys: "Arrow keys", action: "Move the picked-up item" },
    { keys: "Home / End", action: "Move it to the start or end" },
    { keys: "Escape", action: "Cancel and restore the original order" },
  ],
  a11y: [
    "Items (or handles) are focusable and described by the keyboard instructions.",
    "Every pick-up, move, drop and cancel is announced with the new position.",
    "SortableItem label sets the name used in announcements.",
  ],
  reducedMotion: "No lift scale; items reflow with a short tween instead of a spring.",
  examples: [
    { title: "Playlist with handles", description: "handle: rows stay clickable, the grip drags.", Demo: Playlist },
    { title: "Pinned tabs", description: "Horizontal reordering.", Demo: PinnedTabs },
  ],
};

export default item;
