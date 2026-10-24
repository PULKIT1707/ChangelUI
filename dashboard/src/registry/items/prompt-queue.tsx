import { PromptInput, PromptQueue, type PromptQueueProps, type QueuedPrompt } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  maxVisible: number;
  sendNow: boolean;
  runSeconds: number;
};

const defaults: DemoProps = { maxVisible: 3, sendNow: true, runSeconds: 8 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "maxVisible", label: "Rows before fold", min: 1, max: 6, step: 1 },
  { type: "boolean", prop: "sendNow", label: "Send now" },
  { type: "number", prop: "runSeconds", label: "Agent run (s)", min: 3, max: 30, step: 1 },
];

const SEED: QueuedPrompt[] = [
  { id: "q1", text: "Also update the README with the new env vars" },
  { id: "q2", text: "Then run the migration against staging and paste the output", attachments: ["schema.sql"] },
  { id: "q3", text: "Keep the old endpoint for one release and log a deprecation warning" },
  { id: "q4", text: "Open a draft PR when it's green" },
];

let seq = 0;
const nextId = () => `p${++seq}`;

/** Agent loop: a run takes runSeconds; when it ends and the queue isn't paused, the first prompt starts the next run. */
function useAgent(runSeconds: number, initial: QueuedPrompt[]) {
  const [queue, setQueue] = useState<QueuedPrompt[]>(initial);
  const [current, setCurrent] = useState<string>("Add rate limiting to the public API");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<string[]>([]);
  const running = current !== "" && now - startedAt < runSeconds * 1000;
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);
  const finished = useRef<string>("");
  useEffect(() => {
    if (running || current === "" || finished.current === `${current}:${startedAt}`) return;
    finished.current = `${current}:${startedAt}`;
    setDone((d) => [current, ...d].slice(0, 3));
    setCurrent("");
  }, [running, current, startedAt]);
  useEffect(() => {
    if (current !== "" || paused || queue.length === 0) return;
    const t = window.setTimeout(() => {
      const [first, ...rest] = queue;
      if (!first) return;
      setQueue(rest);
      setCurrent(first.text);
      setStartedAt(Date.now());
    }, 900);
    return () => window.clearTimeout(t);
  }, [current, paused, queue]);
  const sendNow = (item: QueuedPrompt) => {
    if (current) setDone((d) => [`${current} (interrupted)`, ...d].slice(0, 3));
    setQueue((q) => q.filter((x) => x.id !== item.id));
    setCurrent(item.text);
    setStartedAt(Date.now());
  };
  const progress = current ? Math.min(1, (now - startedAt) / (runSeconds * 1000)) : 0;
  return { queue, setQueue, current, running: current !== "", paused, setPaused, sendNow, progress, done };
}

function Preview({ props }: { props: DemoProps }) {
  const agent = useAgent(props.runSeconds, SEED);
  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-pui-xl border border-pui-border bg-pui-background p-3 shadow-pui-sm">
      <div className="flex flex-col gap-1.5 px-1 pb-1">
        {agent.done.map((d, i) => (
          <p key={`${d}-${i}`} className="truncate text-xs text-pui-muted-foreground">
            ✓ {d}
          </p>
        ))}
        <div className="flex items-center gap-2 text-sm">
          {agent.current ? (
            <>
              <span className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-pui-full bg-pui-muted">
                <span className="absolute inset-y-0 start-0 rounded-pui-full bg-pui-primary" style={{ width: `${agent.progress * 100}%` }} />
              </span>
              <span className="truncate text-pui-foreground">Working on: {agent.current}</span>
            </>
          ) : (
            <span className="text-pui-muted-foreground">{agent.queue.length ? (agent.paused ? "Idle, queue paused" : "Starting the next prompt…") : "Idle. Type a prompt below."}</span>
          )}
        </div>
      </div>
      <PromptQueue
        items={agent.queue}
        onItemsChange={agent.setQueue}
        running={agent.running}
        paused={agent.paused}
        onPausedChange={agent.setPaused}
        onSendNow={props.sendNow ? agent.sendNow : undefined}
        maxVisible={props.maxVisible}
      />
      <PromptInput
        placeholder={agent.running ? "Queue a follow-up…" : "Ask the agent…"}
        onSubmit={({ text }) => {
          if (!text.trim()) return false;
          agent.setQueue((q) => [...q, { id: nextId(), text: text.trim() }]);
        }}
      />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80 origin-top scale-90">
      <PromptQueue items={SEED.slice(0, 2)} onItemsChange={() => {}} running />
    </div>
  );
}

/** Starts paused: the person stacks a plan, reorders it, then lets it drain. */
function PausedDemo() {
  const [items, setItems] = useState<QueuedPrompt[]>([
    { id: "a", text: "Draft the launch email" },
    { id: "b", text: "Make a shorter version for social" },
    { id: "c", text: "Translate both into Spanish and German" },
  ]);
  const [paused, setPaused] = useState(true);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <PromptQueue items={items} onItemsChange={setItems} paused={paused} onPausedChange={setPaused} running title="Plan" />
      <p className="text-xs text-pui-muted-foreground">Drag the grip, or focus it and press Space, then ↑ / ↓.</p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [queue, setQueue] = useState<QueuedPrompt[]>([]);\n\n<PromptQueue\n  items={queue}\n  onItemsChange={setQueue}\n  running={agent.busy}\n  paused={paused}\n  onPausedChange={setPaused}${props.sendNow ? "\n  onSendNow={(item) => agent.interruptWith(item)}" : ""}${props.maxVisible !== 3 ? `\n  maxVisible={${props.maxVisible}}` : ""}\n/>\n<PromptInput onSubmit={({ text }) => setQueue((q) => [...q, { id: crypto.randomUUID(), text }])} />\n\n// When a run ends and !paused, send queue[0] and drop it from the list.`,
  propsTable: propDocs<PromptQueueProps>()([
    { name: "items", type: "QueuedPrompt[]", required: true, description: "{ id, text, attachments? }, next first." },
    { name: "onItemsChange", type: "(items) => void", required: true, description: "New list after reorder, edit, remove or Clear." },
    { name: "running", type: "boolean", default: "false", description: "The agent is busy; the header says prompts wait for it." },
    { name: "paused", type: "boolean", description: "Hold the queue (defaultPaused, onPausedChange)." },
    { name: "onSendNow", type: "(item) => void", description: "Shows Send now on each prompt, to interrupt the run." },
    { name: "maxVisible", type: "number", default: "3", description: 'Rows before "N more queued".' },
    { name: "title", type: "ReactNode", default: '"Queued"', description: "Header label next to the count." },
  ]),
  keyboard: [
    { keys: "Space (on the grip)", action: "Pick up a prompt; ↑ / ↓ move it, Space drops, Escape cancels" },
    { keys: "Enter (editing)", action: "Save; Shift+Enter adds a line, Escape cancels" },
    { keys: "Tab", action: "Send now, Edit and Remove on each prompt" },
  ],
  a11y: [
    "The header state (waiting, sending next, paused) is a polite status.",
    "Reordering uses the SortableList pattern with announcements that quote the prompt.",
    "Every action names the prompt it acts on; focus returns to Edit after saving.",
    "Pause is a toggle button with aria-pressed.",
  ],
  reducedMotion: "Rows appear and leave with a fade; the count swaps without sliding and the status dot doesn't pulse.",
  examples: [{ title: "Paused plan", description: "Stack and reorder steps before letting them run.", Demo: PausedDemo }],
};

export default item;
