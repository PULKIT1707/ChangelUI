import { Input, StatusButton, Switch, type StatusButtonProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  outcome: "success" | "error" | "random";
  delay: number;
  variant: NonNullable<StatusButtonProps["variant"]>;
  size: NonNullable<StatusButtonProps["size"]>;
  label: string;
  pendingLabel: string;
  successLabel: string;
  errorLabel: string;
  resetAfter: number;
};

const defaults: DemoProps = {
  outcome: "success",
  delay: 1200,
  variant: "solid",
  size: "md",
  label: "Save changes",
  pendingLabel: "Saving…",
  successLabel: "Saved",
  errorLabel: "Try again",
  resetAfter: 2200,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "outcome", label: "Demo outcome", options: ["success", "error", "random"] },
  { type: "number", prop: "delay", label: "Latency (ms)", min: 200, max: 4000, step: 100 },
  { type: "select", prop: "variant", label: "Variant", options: ["solid", "outline", "soft", "ghost"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "text", prop: "label", label: "Label", maxLength: 28 },
  { type: "text", prop: "successLabel", label: "Success label", maxLength: 28 },
  { type: "number", prop: "resetAfter", label: "Reset after (ms, 0 = stay)", min: 0, max: 6000, step: 200 },
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fakeRequest(outcome: DemoProps["outcome"], delay: number) {
  return wait(delay).then(() => {
    const fail = outcome === "error" || (outcome === "random" && Math.random() < 0.5);
    if (fail) throw new Error("Network error");
    return "ok";
  });
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3z" />
      <path d="M8 3v5h7V3M8 21v-7h8v7" />
    </svg>
  );
}

const PREFS = [
  { id: "mentions", label: "Mentions and replies", on: true },
  { id: "digest", label: "Weekly digest", on: false },
  { id: "billing", label: "Billing alerts", on: true },
];

function Preview({ props }: { props: DemoProps }) {
  const { outcome, delay, label, ...rest } = props;
  const [log, setLog] = useState<string[]>([]);
  const [prefs, setPrefs] = useState(() => Object.fromEntries(PREFS.map((p) => [p.id, p.on])));
  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 3));
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="rounded-pui-xl border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground shadow-pui-md">
        <div className="border-b border-pui-border p-5">
          <p className="m-0 text-base font-semibold">Email notifications</p>
          <p className="m-0 mt-1 text-pui-muted-foreground">Choose what lands in your inbox.</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {PREFS.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center justify-between gap-3">
              <span>{p.label}</span>
              <Switch size="sm" checked={prefs[p.id] ?? false} onCheckedChange={(on) => setPrefs((s) => ({ ...s, [p.id]: on }))} />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-pui-border bg-pui-muted/40 px-5 py-3">
          <span className="text-xs text-pui-muted-foreground">Changes apply to all workspaces.</span>
          <StatusButton
            {...rest}
            icon={<SaveIcon />}
            action={() => fakeRequest(outcome, delay)}
            onSuccess={() => push("Saved to server")}
            onError={() => push("Request failed, nothing saved")}
          >
            {label}
          </StatusButton>
        </div>
      </div>
      <ul className="m-0 h-14 w-full list-none space-y-1 p-0 text-center text-xs text-pui-muted-foreground" aria-label="Event log">
        {log.length === 0 ? <li>Click save. Double clicks are ignored while it works.</li> : log.map((l, i) => <li key={`${l}-${i}`}>{l}</li>)}
      </ul>
    </div>
  );
}

function ProfileDemo() {
  const [name, setName] = useState("Ada Park");
  return (
    <form className="flex flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground" onSubmit={(e) => e.preventDefault()}>
      <label className="flex flex-col gap-1.5">
        <span className="font-medium">Display name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <StatusButton variant="outline" tone="neutral" size="sm" action={() => wait(900)} successLabel="Reset" pendingLabel="Resetting…">
          Reset
        </StatusButton>
        <StatusButton size="sm" action={() => wait(1300)} successLabel="Profile saved" pendingLabel="Saving…">
          Save profile
        </StatusButton>
      </div>
    </form>
  );
}

function FailureDemo() {
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="flex flex-col items-start gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <p className="m-0 font-medium">Publish release v2.4.0</p>
      <p className="m-0 text-xs text-pui-muted-foreground">The first try fails (a flaky network), the retry works. The error shakes and stays until you retry.</p>
      <StatusButton
        resetAfter={0}
        successLabel="Published"
        pendingLabel="Publishing…"
        errorLabel="Failed, retry"
        errorMessage="Publishing failed. Press the button to retry."
        action={() => {
          setAttempt((a) => a + 1);
          return wait(1000).then(() => {
            if (attempt % 2 === 0) throw new Error("timeout");
          });
        }}
      >
        Publish
      </StatusButton>
    </div>
  );
}

function SizesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusButton size="sm" variant="soft" action={() => wait(800)} successLabel="Copied">
        Copy invite
      </StatusButton>
      <StatusButton size="md" variant="outline" tone="neutral" action={() => wait(1000)} successLabel="Subscribed" pendingLabel="Joining…">
        Subscribe
      </StatusButton>
      <StatusButton size="lg" action={() => wait(1200)} successLabel="Paid" pendingLabel="Processing…">
        Pay $48.00
      </StatusButton>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex flex-col items-center gap-2">
      <StatusButton size="sm" tabIndex={-1}>
        Save changes
      </StatusButton>
      <StatusButton size="sm" tabIndex={-1} defaultStatus="success" successLabel="Saved" resetAfter={0}>
        Save changes
      </StatusButton>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ variant, size, pendingLabel, successLabel, errorLabel, resetAfter, label }) =>
    toJsx<Record<string, unknown>>(
      "StatusButton",
      { variant, size, pendingLabel, successLabel, errorLabel, resetAfter },
      { variant: "solid", size: "md", pendingLabel: "Working…", successLabel: "Done", errorLabel: "Try again", resetAfter: 2200 },
      label,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace("<StatusButton", "<StatusButton action={() => save(form)}"),
  propsTable: propDocs<StatusButtonProps>()([
    { name: "action", type: "(event) => unknown", description: "Runs on click. A promise drives pending, success and error; a throw is an error." },
    { name: "status", type: '"idle" | "pending" | "success" | "error"', description: "Controlled status; pair with onStatusChange." },
    { name: "defaultStatus", type: "ActionStatus", default: '"idle"', description: "Starting status when uncontrolled." },
    { name: "onStatusChange", type: "(status) => void", description: "Called on every status change." },
    { name: "pendingLabel", type: "ReactNode", default: '"Working…"', description: "Label while pending." },
    { name: "successLabel", type: "ReactNode", default: '"Done"', description: "Label after success." },
    { name: "errorLabel", type: "ReactNode", default: '"Try again"', description: "Label after an error." },
    { name: "successMessage", type: "string", description: "Screen-reader announcement on success; defaults to the label." },
    { name: "errorMessage", type: "string", description: "Screen-reader announcement on error; defaults to the label." },
    { name: "resetAfter", type: "number", default: "2200", description: "ms before success or error settle to idle; 0 keeps them." },
    { name: "icon", type: "ReactNode", description: "Icon next to the idle label." },
    { name: "onSuccess", type: "(result) => void", description: "The resolved value." },
    { name: "onError", type: "(error) => void", description: "The thrown or rejected value." },
    { name: "variant", type: '"solid" | "outline" | "soft" | "ghost" | "link"', default: '"solid"', description: "Button variant." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Idle tone; success turns green, error red." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Button size." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Run the action (ignored while pending)" }],
  a11y: [
    "A native button: aria-busy and aria-disabled while pending, so repeat presses do nothing.",
    "Results are announced through a polite status region; the accessible name follows the visible label.",
    "Hidden state labels are aria-hidden; they only reserve width so the button never jumps.",
  ],
  reducedMotion: "Labels swap instantly without the slide, blur, pop or shake; the spinner keeps turning slowly.",
  examples: [
    { title: "Form actions", description: "Two buttons in a settings form; each owns its own lifecycle.", Demo: ProfileDemo },
    { title: "Failure and retry", description: "resetAfter={0} keeps the error until the user retries.", Demo: FailureDemo },
    { title: "Sizes and variants", description: "Width is reserved for the longest label in every size.", Demo: SizesDemo, wide: true },
  ],
};

export default item;
