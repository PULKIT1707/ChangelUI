import { Button, Reasoning, type ReasoningProps, type ReasoningStep } from "changelui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  streaming: boolean;
  steps: boolean;
  autoClose: boolean;
  size: NonNullable<ReasoningProps["size"]>;
};
const defaults: DemoProps = { streaming: true, steps: true, autoClose: true, size: "md" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "streaming", label: "Streaming" },
  { type: "boolean", prop: "steps", label: "Steps" },
  { type: "boolean", prop: "autoClose", label: "Auto close" },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
];
const THOUGHT =
  "The user wants to know whether the March invoice was paid twice. I should look up both charges, compare amounts and dates, then check whether one of them was refunded before answering.";
const ANSWER = "Yes, you were charged twice on March 3. The second charge of $49.00 was refunded on March 5, so you're all settled.";
const planSteps = (phase: number): ReasoningStep[] => [
  { id: "read", title: "Read the question", status: phase > 0 ? "done" : "active" },
  { id: "lookup", title: "Look up March charges", description: "2 charges found", status: phase > 1 ? "done" : phase === 1 ? "active" : "pending" },
  { id: "refunds", title: "Check refunds", status: phase > 2 ? "done" : phase === 2 ? "active" : "pending" },
];
/** Reveals `full` a few words at a time while `active`. */
function useStreamedText(full: string, active: boolean, wordsPerTick = 2, tickMs = 140) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setCount((c) => c + wordsPerTick), tickMs);
    return () => {
      clearInterval(timer);
      setCount(0);
    };
  }, [active, full, wordsPerTick, tickMs]);
  const words = full.split(" ");
  return { text: active ? words.slice(0, count).join(" ") : full };
}
function Bubble({ children }: { children: ReactNode }) {
  return <div className="self-end rounded-pui-xl rounded-br-pui-sm bg-pui-primary px-3.5 py-2 text-sm text-pui-primary-foreground">{children}</div>;
}
function Preview({ props }: { props: DemoProps }) {
  const { text } = useStreamedText(THOUGHT, props.streaming);
  const phase = props.streaming ? Math.min(2, Math.floor(text.split(" ").length / 10)) : 3;
  return (
    <div className="flex w-full max-w-lg flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm">
      <Bubble>Was I charged twice for March?</Bubble>
      <div className="flex flex-col gap-2">
        <Reasoning streaming={props.streaming} autoClose={props.autoClose} size={props.size} steps={props.steps ? planSteps(phase) : undefined}>
          {text}
        </Reasoning>
        {!props.streaming ? <p className="m-0 text-sm leading-relaxed text-pui-foreground">{ANSWER}</p> : null}
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <Reasoning size="sm" duration={8} defaultOpen>
        Compare both charges, then check for a refund before answering.
      </Reasoning>
    </div>
  );
}
/** A full turn: Ask starts streaming, steps advance, the disclosure collapses and the answer lands. */
function TurnDemo() {
  const [phase, setPhase] = useState<"idle" | "thinking" | "answered">("idle");
  const timers = useRef<number[]>([]);
  const [step, setStep] = useState(0);
  const { text } = useStreamedText(THOUGHT, phase === "thinking", 2, 160);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  const ask = () => {
    timers.current.forEach((t) => clearTimeout(t));
    setPhase("thinking");
    setStep(0);
    timers.current = [
      window.setTimeout(() => setStep(1), 1200),
      window.setTimeout(() => setStep(2), 2600),
      window.setTimeout(() => {
        setStep(3);
        setPhase("answered");
      }, 4200),
    ];
  };
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Billing assistant</span>
        <Button size="sm" onClick={ask} disabled={phase === "thinking"}>
          {phase === "idle" ? "Ask" : "Ask again"}
        </Button>
      </div>
      {phase !== "idle" ? (
        <>
          <Bubble>Was I charged twice for March?</Bubble>
          <Reasoning streaming={phase === "thinking"} steps={planSteps(step)}>
            {text}
          </Reasoning>
          {phase === "answered" ? <p className="m-0 text-sm leading-relaxed">{ANSWER}</p> : null}
        </>
      ) : (
        <p className="m-0 text-sm text-pui-muted-foreground">Press Ask to watch a reply think, collapse and answer.</p>
      )}
    </div>
  );
}
/** Chat history: durations come from the server. */
function HistoryDemo() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-background p-5">
      <div className="flex flex-col gap-1.5">
        <Reasoning duration={12}>Checked the three cheapest regions, then filtered by latency under 80ms.</Reasoning>
        <p className="m-0 text-sm text-pui-foreground">Frankfurt is the best fit: $0.021/hr and 34ms from your users.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Reasoning duration={75}>Walked the dependency graph, found two versions of the date library and traced which package pulls the old one.</Reasoning>
        <p className="m-0 text-sm text-pui-foreground">The old version comes from the charts package. Upgrading it removes the duplicate.</p>
      </div>
    </div>
  );
}
/** Agent plan: steps only, no free text. */
function PlanDemo() {
  return (
    <div className="mx-auto w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <Reasoning
        defaultOpen
        label={() => "Plan"}
        steps={[
          { id: "a", title: "Read the failing test", description: "checkout.spec.ts, line 42" },
          { id: "b", title: "Reproduce locally", description: "Fails on Node 24 only", status: "done" },
          { id: "c", title: "Patch the date parser", status: "active" },
          { id: "d", title: "Run the suite", status: "pending" },
        ]}
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
    const attrs = ["streaming={isThinking}"];
    if (!props.autoClose) attrs.push("autoClose={false}");
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.steps) attrs.push("steps={steps}");
    const steps = props.steps ? 'const steps = [\n  { title: "Look up charges" },\n  { title: "Check refunds", status: "active" },\n];\n\n' : "";
    return `${steps}<Reasoning\n  ${attrs.join("\n  ")}\n>\n  {reasoningText}\n</Reasoning>`;
  },
  propsTable: propDocs<ReasoningProps>()([
    { name: "streaming", type: "boolean", default: "false", description: "Shimmering label, live timer and auto-open while true." },
    { name: "duration", type: "number", default: "measured", description: "Seconds of thinking; measured from the streaming flag when omitted." },
    { name: "open", type: "boolean", description: "Controlled open state." },
    { name: "defaultOpen", type: "boolean", default: "streaming", description: "Initial open state." },
    { name: "onOpenChange", type: "(open) => void", description: "Called when the disclosure opens or closes." },
    { name: "autoOpen", type: "boolean", default: "true", description: "Open when streaming starts." },
    { name: "autoClose", type: "boolean", default: "true", description: "Collapse when streaming ends." },
    { name: "steps", type: "{ title, description?, status? }[]", description: 'Progress list; status is "done" | "active" | "pending".' },
    { name: "thinkingLabel", type: "string", default: '"Thinking"', description: "Label while streaming." },
    { name: "label", type: "(seconds?) => ReactNode", default: '"Thought for 12 seconds"', description: "Label once done." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Text size." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Open or close the reasoning" }],
  a11y: [
    "The trigger is a button with aria-expanded and aria-controls; the content is a labelled region.",
    'A polite status announces "Thinking" and then "Thought for 12 seconds"; the ticking timer is hidden from screen readers.',
    "Steps are an ordered list; the active one has aria-current=\"step\" and each status is written out.",
  ],
  reducedMotion: "No shimmer, pulse or caret; the content opens and closes without the height animation.",
  examples: [
    { title: "Full turn", description: "Streams, advances steps, collapses and shows the answer.", Demo: TurnDemo, wide: true },
    { title: "Chat history", description: "Durations from the server; collapsed by default.", Demo: HistoryDemo },
    { title: "Agent plan", description: "Steps only with a custom label.", Demo: PlanDemo },
  ],
};
export default item;
