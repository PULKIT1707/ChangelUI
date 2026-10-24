import { AgentPlan, Button, type AgentPlanProps, type AgentPlanStep, type AgentPlanStepStatus } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  progress: number;
  failed: boolean;
  collapseCompleted: boolean;
  steer: boolean;
};
const defaults: DemoProps = { progress: 3, failed: false, collapseCompleted: false, steer: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "progress", label: "Steps done", min: 0, max: 6, step: 1 },
  { type: "boolean", prop: "failed", label: "Active step failed" },
  { type: "boolean", prop: "collapseCompleted", label: "Fold finished steps" },
  { type: "boolean", prop: "steer", label: "Retry and skip" },
];
const PLAN: Omit<AgentPlanStep, "status">[] = [
  { id: "read", title: "Read checkout code", detail: "Scanned 14 files in src/checkout.", durationMs: 3_400 },
  { id: "reproduce", title: "Reproduce the coupon bug", detail: "Coupon applied twice when the cart updates during payment.", durationMs: 12_800 },
  {
    id: "fix",
    title: "Patch the discount calculation",
    detail: "Making applyCoupon idempotent per cart revision.",
    substeps: [
      { id: "a", title: "cart/discount.ts" },
      { id: "b", title: "cart/revision.ts" },
      { id: "c", title: "Add regression test" },
    ],
    durationMs: 41_000,
  },
  { id: "test", title: "Run the test suite", detail: "418 tests across 36 files.", durationMs: 28_500 },
  { id: "review", title: "Self-review the diff", durationMs: 6_100 },
  { id: "pr", title: "Open a pull request", durationMs: 1_900 },
];
/** Statuses for a plan where `done` steps finished and the next one is active (or failed). */
function stepsAt(done: number, failed: boolean, startedAt: number | undefined): AgentPlanStep[] {
  return PLAN.map((step, i) => {
    const status: AgentPlanStepStatus = i < done ? "done" : i === done ? (failed ? "failed" : "running") : "queued";
    return {
      ...step,
      status,
      startedAt: status === "running" ? startedAt : undefined,
      error: status === "failed" ? "3 tests failed in checkout.spec.ts: expected total 42.00, received 37.80." : undefined,
      substeps: step.substeps?.map((s, j) => ({ ...s, done: i < done || j < 2 })),
    };
  });
}
function Preview({ props }: { props: DemoProps }) {
  const [startedAt] = useState(() => Date.now() - 14_000);
  const [log, setLog] = useState("");
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <AgentPlan
        title="Fix double-applied coupons"
        steps={stepsAt(props.progress, props.failed, startedAt)}
        collapseCompleted={props.collapseCompleted}
        onRetry={props.steer ? (id) => setLog(`Retry requested for “${id}”.`) : undefined}
        onSkip={props.steer ? (id) => setLog(`“${id}” will be skipped.`) : undefined}
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {log}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <AgentPlan title="Fix coupons" steps={stepsAt(2, false, undefined).slice(0, 4)} />
    </div>
  );
}
/** A simulated run: steps advance on their own; one fails until you retry it. */
function LiveRunDemo() {
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const retried = useRef(false);
  useEffect(() => {
    if (failed || done >= PLAN.length) return;
    const timer = window.setTimeout(() => {
      if (done === 3 && !retried.current) {
        setFailed(true);
        return;
      }
      setDone((d) => d + 1);
      setStartedAt(Date.now());
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [done, failed]);
  const steps = stepsAt(done, failed, startedAt);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <AgentPlan
        title="Agent run"
        steps={steps}
        streaming={!failed && done < PLAN.length}
        collapseCompleted
        onRetry={() => {
          retried.current = true;
          setFailed(false);
          setStartedAt(Date.now());
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          retried.current = false;
          setDone(0);
          setFailed(false);
          setStartedAt(Date.now());
        }}
      >
        Restart run
      </Button>
    </div>
  );
}
/** Steering: skip queued steps before the agent reaches them. */
function SteerDemo() {
  const [skipped, setSkipped] = useState<string[]>([]);
  const steps: AgentPlanStep[] = [
    { id: "a", title: "Collect last quarter's invoices", status: "done", durationMs: 8_200 },
    { id: "b", title: "Match payments to invoices", status: "running", detail: "212 of 318 matched", substeps: [{ id: "x", title: "Stripe", done: true }, { id: "y", title: "Bank transfers" }] },
    { id: "c", title: "Email customers with overdue balances" },
    { id: "d", title: "Draft the revenue summary" },
    { id: "e", title: "Post the summary to #finance" },
  ].map((s) => (skipped.includes(s.id) ? { ...s, status: "skipped" as const } : (s as AgentPlanStep)));
  return (
    <div className="mx-auto w-full max-w-md">
      <AgentPlan title="Month-end close" steps={steps} onSkip={(id) => setSkipped((s) => [...s, id])} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<AgentPlan\n  title="Fix double-applied coupons"\n  steps={[\n    { id: "read", title: "Read checkout code", status: "done", durationMs: 3400 },\n    { id: "fix", title: "Patch the discount", status: "${props.failed ? "failed" : "running"}", startedAt },\n    { id: "test", title: "Run the test suite" },\n  ]}${props.collapseCompleted ? "\n  collapseCompleted" : ""}${props.steer ? "\n  onRetry={(id) => agent.retry(id)}\n  onSkip={(id) => agent.skip(id)}" : ""}\n/>`,
  propsTable: propDocs<AgentPlanProps>()([
    { name: "steps", type: "{ id, title, status?, detail?, error?, substeps?, startedAt?, durationMs? }[]", required: true, description: "The plan; status is queued, running, done, failed or skipped." },
    { name: "title", type: "ReactNode", default: '"Plan"', description: "Heading." },
    { name: "streaming", type: "boolean", default: "any step running", description: "Shows Working while the agent is between steps." },
    { name: "onRetry", type: "(id) => void", description: "Shows Retry on failed steps." },
    { name: "onSkip", type: "(id) => void", description: "Shows Skip on queued steps (on hover and focus; always on touch)." },
    { name: "collapseCompleted", type: "boolean", default: "false", description: "Folds finished steps before the first open one into one row." },
    { name: "now", type: "number", description: "Reference time for timers; default the client clock." },
    { name: "retryLabel", type: "string", default: '"Retry"', description: "Retry button label." },
    { name: "skipLabel", type: "string", default: '"Skip"', description: "Skip button label." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Open or close a step's details" }],
  a11y: [
    'A section with a progressbar ("3 of 6 steps finished"); the running step has aria-current="step" and every step names its status.',
    "Status changes are announced in a polite live region; Retry and Skip carry the step name.",
  ],
  reducedMotion: "The active highlight jumps instead of gliding, icons and details appear without the pop and height animation, and the spinner becomes a solid ring.",
  examples: [
    { title: "Live run", description: "Steps advance on their own, a failure waits for Retry and finished steps fold away.", Demo: LiveRunDemo },
    { title: "Steer before it gets there", description: "Skip queued steps; they stay in the plan, struck through.", Demo: SteerDemo },
  ],
};
export default item;
