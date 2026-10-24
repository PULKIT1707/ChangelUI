import { SubagentList, type Subagent, type SubagentListProps } from "changelui";
import { useEffect, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  stallAfter: number;
  actions: boolean;
  title: string;
};

const defaults: DemoProps = { stallAfter: 8, actions: true, title: "Research fan-out" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "stallAfter", label: "Flag quiet after (s)", min: 0, max: 60, step: 1 },
  { type: "boolean", prop: "actions", label: "Retry / Stop" },
  { type: "text", prop: "title", label: "Title", maxLength: 40 },
];

type Script = { id: string; name: string; task: string; steps: string[]; tokensPerStep: number; fail?: number; hang?: number; result: string };

const SCRIPTS: Script[] = [
  {
    id: "pricing",
    name: "Pricing scout",
    task: "Collect public pricing for the 5 closest competitors",
    steps: ["Searching “team plan pricing”", "Reading 4 pricing pages", "Normalizing to per-seat monthly", "Writing the comparison table"],
    tokensPerStep: 3100,
    result: "Median team plan: $12 per seat. Two competitors charge for guests; none charge for viewers.",
  },
  {
    id: "reviews",
    name: "Review miner",
    task: "Summarize the top complaints in 200 app store reviews",
    steps: ["Fetching reviews", "Clustering by theme", "Ranking themes by frequency"],
    tokensPerStep: 4800,
    result: "Top themes: slow sync on mobile (31%), confusing permissions (18%), missing dark mode (9%).",
  },
  {
    id: "changelog",
    name: "Changelog reader",
    task: "List features competitors shipped this quarter",
    steps: ["Opening changelogs", "Extracting entries since July"],
    tokensPerStep: 2200,
    fail: 1,
    result: "",
  },
  {
    id: "forum",
    name: "Forum lurker",
    task: "Find unanswered feature requests in the community forum",
    steps: ["Crawling the Ideas board", "Waiting on the forum API"],
    tokensPerStep: 1700,
    hang: 1,
    result: "",
  },
  {
    id: "brief",
    name: "Brief writer",
    task: "Turn the findings into a one-page brief",
    steps: ["Waiting for findings", "Drafting", "Tightening"],
    tokensPerStep: 2600,
    result: "",
  },
];

const STEP_MS = 2200;

/** A scripted run: every agent advances one step per tick, one fails, one goes quiet, the writer waits. */
function useRun() {
  const [t0, setT0] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [retried, setRetried] = useState<Record<string, number>>({});
  const [stopped, setStopped] = useState<Record<string, number>>({});
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const agents: Subagent[] = SCRIPTS.map((s, index) => {
    const start = s.id === "brief" ? t0 + STEP_MS * 3 : t0 + index * 350;
    const retryAt = retried[s.id];
    const begin = retryAt ?? start;
    const elapsed = now - begin;
    const stopAt = stopped[s.id];
    const fails = s.fail !== undefined && retryAt === undefined;
    const hangs = s.hang !== undefined && retryAt === undefined;
    const lastStep = s.steps.length - 1;
    const stepIndex = Math.min(lastStep, Math.floor(Math.max(0, elapsed) / STEP_MS));
    const stopIndex = hangs ? s.hang! : fails ? s.fail! : lastStep;
    const shown = Math.min(stepIndex, stopIndex);
    const doneAt = begin + (lastStep + 1) * STEP_MS;
    const log = s.steps.slice(0, shown + 1).map((text, i) => ({ id: `${s.id}-${i}`, at: begin + i * STEP_MS, kind: i % 2 ? ("tool" as const) : ("info" as const), text }));
    const base = { id: s.id, name: s.name, task: s.task, startedAt: begin, log };
    if (stopAt !== undefined) return { ...base, status: "cancelled" as const, endedAt: stopAt, tokens: (shown + 1) * s.tokensPerStep, step: "Stopped by you" };
    if (elapsed < 0) return { ...base, status: "queued" as const, startedAt: undefined, log: [] };
    if (fails && elapsed >= (s.fail! + 1) * STEP_MS)
      return { ...base, status: "failed" as const, endedAt: begin + (s.fail! + 1) * STEP_MS, tokens: (s.fail! + 1) * s.tokensPerStep, step: "429 from the changelog site", error: "Rate limited by changelog.example.com (429). Retry backs off for 30 s." };
    if (!fails && !hangs && now >= doneAt)
      return { ...base, status: "done" as const, endedAt: doneAt, tokens: s.steps.length * s.tokensPerStep, step: s.result, result: s.result || "Brief ready: 412 words, 3 recommendations." };
    return {
      ...base,
      status: "running" as const,
      step: s.steps[shown],
      tokens: (shown + 1) * s.tokensPerStep,
      lastActivityAt: begin + shown * STEP_MS,
      progress: (shown + 0.5) / s.steps.length,
    };
  });
  const restart = () => {
    const at = Date.now();
    setT0(at);
    setNow(at);
    setRetried({});
    setStopped({});
  };
  return {
    agents,
    now,
    restart,
    retry: (id: string) => setRetried((r) => ({ ...r, [id]: Date.now() })),
    stop: (id: string) => setStopped((s) => ({ ...s, [id]: Date.now() })),
  };
}

function Preview({ props }: { props: DemoProps }) {
  const run = useRun();
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <SubagentList
        title={props.title}
        agents={run.agents}
        now={run.now}
        stallAfter={props.stallAfter * 1000}
        defaultExpanded={["changelog"]}
        onRetry={props.actions ? run.retry : undefined}
        onCancel={props.actions ? run.stop : undefined}
      />
      <button type="button" onClick={run.restart} className="self-end text-xs font-medium text-pui-primary-text underline-offset-2 hover:underline">
        Restart run
      </button>
    </div>
  );
}

const MINI: Subagent[] = [
  { id: "pricing", name: "Pricing scout", status: "done", startedAt: 0, endedAt: 41_000, tokens: 12_400, step: "Median team plan: $12 per seat" },
  { id: "reviews", name: "Review miner", status: "running", startedAt: 0, lastActivityAt: 30_000, tokens: 9600, step: "Clustering by theme", progress: 0.6 },
  { id: "changelog", name: "Changelog reader", status: "failed", startedAt: 0, endedAt: 9000, tokens: 2200, step: "429 from the changelog site" },
];

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80 origin-top scale-90">
      <SubagentList agents={MINI} now={42_000} title="Subagents" />
    </div>
  );
}

const DONE: Subagent[] = [
  { id: "a", name: "Unit tests", status: "done", startedAt: 0, endedAt: 18_000, tokens: 4200, step: "212 passed" },
  { id: "b", name: "Type check", status: "done", startedAt: 0, endedAt: 9000, tokens: 1100, step: "No errors" },
  { id: "c", name: "Lint", status: "done", startedAt: 0, endedAt: 6000, tokens: 900, step: "Clean" },
  { id: "d", name: "Bundle size", status: "done", startedAt: 0, endedAt: 22_000, tokens: 2600, step: "+1.2 kB (under budget)" },
];

/** A finished fan-out reads as one line: all green, total tokens and wall time. */
function DoneDemo() {
  return (
    <div className="mx-auto w-full max-w-md">
      <SubagentList title="Pre-merge checks" agents={DONE} now={22_000} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<SubagentList\n  title="${props.title}"\n  agents={agents} // [{ id, name, task, status, step, startedAt, lastActivityAt, tokens, log }]${props.stallAfter !== 45 ? `\n  stallAfter={${props.stallAfter * 1000}}` : ""}${props.actions ? "\n  onRetry={(id) => retry(id)}\n  onCancel={(id) => stop(id)}" : ""}\n/>`,
  propsTable: propDocs<SubagentListProps>()([
    { name: "agents", type: "Subagent[]", required: true, description: "{ id, name, task?, status, step?, startedAt?, endedAt?, lastActivityAt?, tokens?, progress?, log?, result?, error? }." },
    { name: "title", type: "ReactNode", default: '"Subagents"', description: "Small heading over the summary." },
    { name: "stallAfter", type: "number", default: "45000", description: "ms of silence before a running agent is flagged; 0 turns it off." },
    { name: "onRetry", type: "(id) => void", description: "Retry on failed and stopped agents." },
    { name: "onCancel", type: "(id) => void", description: "Stop on running and queued agents." },
    { name: "expanded", type: "string[]", description: "Open rows (controlled; defaultExpanded, onExpandedChange)." },
    { name: "now", type: "number", description: "Reference time. Default: the client clock, ticking each second while anything runs." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Rows, then Retry / Stop" },
    { keys: "Enter / Space", action: "Open or close a row's transcript" },
  ],
  a11y: [
    "The summary line is a polite status, so finished and failed agents are announced.",
    "Each row is a button with aria-expanded; its status and any stall are in the accessible name.",
    "The segmented bar is an image labelled with the counts.",
    "Retry and Stop name the agent they act on.",
  ],
  reducedMotion: "Spinners and the bar sweep stop; steps swap with a fade; rows open without height animation.",
  examples: [{ title: "Finished fan-out", description: "All done: totals in the header, results one tap away.", Demo: DoneDemo }],
};

export default item;
