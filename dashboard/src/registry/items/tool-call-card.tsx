import { Button, ToolCallCard, type ToolCallCardProps, type ToolCallStatus } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  status: ToolCallStatus;
  title: boolean;
  open: boolean;
};
const defaults: DemoProps = { status: "success", title: true, open: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "status", label: "Status", options: ["pending", "awaiting-approval", "running", "success", "error", "denied"] },
  { type: "boolean", prop: "title", label: "Friendly title" },
  { type: "boolean", prop: "open", label: "Details open" },
];
const flightInput = { from: "SFO", to: "JFK", date: "2026-11-14", cabin: "economy", maxStops: 0 };
const flightOutput = {
  results: [
    { flight: "UA 512", departs: "07:05", arrives: "15:38", price: 289 },
    { flight: "DL 1984", departs: "09:30", arrives: "18:02", price: 312 },
  ],
  total: 2,
};
function Preview({ props }: { props: DemoProps }) {
  const [log, setLog] = useState("");
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <ToolCallCard
        key={`${props.status}-${props.open}`}
        name="search_flights"
        title={props.title ? "Search flights" : undefined}
        status={props.status}
        input={flightInput}
        output={flightOutput}
        error="Upstream timeout after 30s (airline API)"
        durationMs={props.status === "error" ? 30_000 : 842}
        defaultOpen={props.open}
        approvalMessage="Searching uses 1 of your 20 daily airline lookups."
        onApprove={() => setLog("Approved: the agent would run the tool now.")}
        onDeny={() => setLog("Denied: the agent is told the tool was refused.")}
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {log}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-64 flex-col gap-2">
      <ToolCallCard name="read_file" status="success" durationMs={120} />
      <ToolCallCard name="run_tests" status="running" />
    </div>
  );
}
/** Human in the loop: Run and Deny drive the status through running to done or denied. */
function ApprovalDemo() {
  const [status, setStatus] = useState<ToolCallStatus>("awaiting-approval");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = () =>
    new Promise<void>((resolve) => {
      setStatus("running");
      resolve();
      timer.current = window.setTimeout(() => setStatus("success"), 1800);
    });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <ToolCallCard
        name="send_email"
        title="Send email"
        status={status}
        input={{ to: "finance@example.com", subject: "March invoice", body: "Hi team, the duplicate charge was refunded on March 5." }}
        output={{ messageId: "msg_7f3a", deliveredAt: "2026-10-23T16:02:11Z" }}
        durationMs={1800}
        approvalMessage="Emails are sent from your address and can't be unsent."
        approveLabel="Send"
        onApprove={run}
        onDeny={() => setStatus("denied")}
      />
      <Button size="sm" variant="outline" tone="neutral" className="self-start" onClick={() => setStatus("awaiting-approval")}>
        Reset
      </Button>
    </div>
  );
}
/** Agent timeline: several calls stacked as a run log. */
function TimelineDemo() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
      <ToolCallCard name="list_files" title="List files" status="success" input={{ path: "src/billing" }} output={["invoice.ts", "refund.ts", "tax.ts"]} durationMs={64} />
      <ToolCallCard name="read_file" title="Read file" status="success" input={{ path: "src/billing/refund.ts" }} output="export function refund(id: string) { … }" durationMs={38} />
      <ToolCallCard
        name="run_tests"
        title="Run tests"
        status="error"
        input={{ pattern: "billing" }}
        error="2 failing: refund › rounds to cents, refund › rejects negative amounts"
        durationMs={4210}
      />
      <ToolCallCard name="apply_patch" title="Apply patch" status="pending" />
    </div>
  );
}
/** Rich output: pass an element instead of JSON. */
function RichOutputDemo() {
  return (
    <div className="mx-auto w-full max-w-md">
      <ToolCallCard
        name="get_weather"
        title="Weather"
        status="success"
        input={{ city: "Lisbon" }}
        durationMs={310}
        defaultOpen
        output={
          <div className="flex items-center justify-between rounded-pui-md border border-pui-border bg-pui-background px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Lisbon</span>
              <span className="text-xs text-pui-muted-foreground">Sunny, light breeze</span>
            </div>
            <span className="text-2xl font-semibold tabular-nums">22°</span>
          </div>
        }
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
    const attrs = ['name="search_flights"'];
    if (props.title) attrs.push('title="Search flights"');
    attrs.push(`status="${props.status}"`, "input={args}", "output={result}");
    if (props.status === "error") attrs.push("error={error.message}");
    if (props.status === "awaiting-approval") attrs.push("onApprove={approve}", "onDeny={deny}");
    return `<ToolCallCard\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<ToolCallCardProps>()([
    { name: "name", type: "string", required: true, description: "Tool identifier, shown in monospace and used in labels." },
    { name: "title", type: "ReactNode", description: "Friendly title before the name." },
    { name: "status", type: '"pending" | "awaiting-approval" | "running" | "success" | "error" | "denied"', default: '"pending"', description: "Drives the pill, border and progress sweep." },
    { name: "input", type: "unknown", description: "Arguments; objects are pretty-printed JSON." },
    { name: "output", type: "unknown", description: "Result (shown on success); JSON or a React element." },
    { name: "error", type: "ReactNode", description: 'Shown when status is "error".' },
    { name: "durationMs", type: "number", description: "Run time shown after the call finishes." },
    { name: "approvalMessage", type: "ReactNode", description: "Why the tool needs consent." },
    { name: "onApprove", type: "() => void | Promise<void>", description: "Run button; shows loading until the status changes." },
    { name: "onDeny", type: "() => void | Promise<void>", description: "Deny button." },
    { name: "approveLabel", type: "string", default: '"Run"', description: "Approve button text." },
    { name: "denyLabel", type: "string", default: '"Deny"', description: "Deny button text." },
    { name: "open", type: "boolean", description: "Controlled details state." },
    { name: "defaultOpen", type: "boolean", default: "approval or error", description: "Initial details state." },
    { name: "onOpenChange", type: "(open) => void", description: "Called when details open or close." },
    { name: "icon", type: "ReactNode", description: "Replaces the wrench icon." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Show or hide details, Run or Deny" },
    { keys: "Tab", action: "Reach Copy and Show all on each pane" },
  ],
  a11y: [
    "Each call is an article named by the tool; the status pill is text, never color alone.",
    'Status changes are announced politely ("send_email: Running").',
    'Run and Deny are named with the tool ("Run send_email"); the details button has aria-expanded.',
  ],
  reducedMotion: "No progress sweep, pill slide or height animation; the running spinner turns slowly.",
  examples: [
    { title: "Approval flow", description: "Send drives running → done; Deny marks it denied.", Demo: ApprovalDemo, wide: true },
    { title: "Agent run log", description: "Success, failure and a queued call.", Demo: TimelineDemo },
    { title: "Rich output", description: "Render a React element as the result.", Demo: RichOutputDemo },
  ],
};
export default item;
