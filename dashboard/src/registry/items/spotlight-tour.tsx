import { Badge, Button, SpotlightTour, type SpotlightTourProps, type SpotlightTourStep } from "changelui";
import { useMemo, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = { padding: number; radius: number; closeOnOverlayClick: boolean };
const defaults: DemoProps = { padding: 8, radius: 12, closeOnOverlayClick: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "padding", label: "Padding (px)", min: 0, max: 24, step: 2 },
  { type: "number", prop: "radius", label: "Radius (px)", min: 0, max: 28, step: 2 },
  { type: "boolean", prop: "closeOnOverlayClick", label: "Click outside skips" },
];
/** A small fake product screen with refs for every tour stop. */
function useAppScreen() {
  const search = useRef<HTMLDivElement>(null);
  const create = useRef<HTMLButtonElement>(null);
  const filters = useRef<HTMLDivElement>(null);
  const share = useRef<HTMLButtonElement>(null);
  const screen = (
    <div className="w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm">
      <div className="flex items-center gap-3 border-b border-pui-border px-4 py-3">
        <span className="size-6 rounded-pui-md bg-pui-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">Projects</span>
        <div ref={search} className="ms-auto hidden h-8 w-48 items-center rounded-pui-md border border-pui-input px-2.5 text-xs text-pui-muted-foreground sm:flex">
          Search projects… <kbd className="ms-auto font-mono">⌘K</kbd>
        </div>
        <Button ref={share} size="sm" variant="outline" tone="neutral" className="ms-auto sm:ms-0">
          Share
        </Button>
        <Button ref={create} size="sm">
          New project
        </Button>
      </div>
      <div ref={filters} className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <Badge tone="primary">All</Badge>
        <Badge>Active</Badge>
        <Badge>Archived</Badge>
        <Badge>Shared with me</Badge>
      </div>
      <ul className="m-0 grid list-none gap-2 p-4 sm:grid-cols-3">
        {["Website relaunch", "Mobile onboarding", "Q3 pricing"].map((name, i) => (
          <li key={name} className="rounded-pui-lg border border-pui-border p-3">
            <p className="m-0 text-sm font-medium">{name}</p>
            <p className="m-0 mt-1 text-xs text-pui-muted-foreground">{[12, 5, 8][i]} tasks · updated today</p>
          </li>
        ))}
      </ul>
    </div>
  );
  const steps: SpotlightTourStep[] = [
    { target: search, title: "Find anything fast", content: "Search every project, or press ⌘K from anywhere." },
    { target: filters, title: "Filter the list", content: "Switch between active, archived and shared projects." },
    { target: create, title: "Start a project", content: "Templates set up tasks, owners and due dates for you.", side: "bottom" },
    { target: share, title: "Invite your team", content: "Share a project with a link or by email. You choose who can edit." },
  ];
  return { screen, steps };
}
function Preview({ props }: { props: DemoProps }) {
  const { screen, steps } = useAppScreen();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {screen}
      <div className="flex items-center gap-3">
        <Button onClick={() => setOpen(true)}>Start the tour</Button>
        <span className="text-sm text-pui-muted-foreground" role="status">
          {done}
        </span>
      </div>
      <SpotlightTour
        {...props}
        steps={steps}
        open={open}
        onOpenChange={setOpen}
        onFinish={() => setDone("Tour finished. Nice!")}
        onSkip={(step) => setDone(`Skipped at step ${step + 1}.`)}
      />
    </div>
  );
}
/** Controlled step with a resumable "What's new" tour and a step counter outside. */
function WhatsNewDemo() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const steps = useMemo<SpotlightTourStep[]>(
    () => [
      { target: a, title: "New: saved views", content: "Save any filter combination and pin it to the sidebar.", side: "right" },
      { target: b, title: "New: bulk edit", content: "Select rows with Shift and change owner, status or due date at once.", side: "right" },
      { target: c, title: "Improved: exports", content: "CSV exports now keep your column order and filters.", side: "right" },
    ],
    [],
  );
  const tile = "rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-sm text-pui-surface-foreground";
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid gap-2">
        <div ref={a} className={tile}>Saved views</div>
        <div ref={b} className={tile}>Bulk edit</div>
        <div ref={c} className={tile}>Exports</div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setOpen(true)}>
          {step > 0 ? `Resume (${step + 1}/3)` : "What’s new"}
        </Button>
        <span className="text-xs text-pui-muted-foreground">Closing keeps your place.</span>
      </div>
      <SpotlightTour steps={steps} open={open} onOpenChange={setOpen} step={step} onStepChange={setStep} onFinish={() => setStep(0)} labels={{ skip: "Later" }} />
    </div>
  );
}
/** A step without a target centers the card: good for a welcome and a goodbye. */
function WelcomeDemo() {
  const avatar = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <Button size="sm" onClick={() => setOpen(true)}>
        Show welcome
      </Button>
      <button ref={avatar} type="button" aria-label="Account" className="grid size-9 cursor-pointer place-items-center rounded-pui-full border-0 bg-pui-primary text-sm font-semibold text-pui-primary-foreground">
        JD
      </button>
      <SpotlightTour
        open={open}
        onOpenChange={setOpen}
        radius={22}
        padding={4}
        labels={{ next: "Let’s go", done: "Got it", progress: (n, t) => `${n}/${t}` }}
        steps={[
          { title: "Welcome to Projects 👋", content: "A 20-second tour of the basics. You can skip it anytime." },
          { target: avatar, title: "Your account", content: "Profile, notifications and sign out live here.", side: "left" },
        ]}
      />
    </div>
  );
}
function Mini() {
  return (
    <div className="relative w-full max-w-60 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-3" aria-hidden="true">
      <div className="flex gap-2">
        <span className="h-5 flex-1 rounded-pui-sm bg-pui-muted" />
        <span className="relative z-10 h-5 w-14 rounded-pui-sm bg-pui-primary shadow-[0_0_0_200px_var(--color-pui-overlay)] ring-2 ring-pui-primary/60 ring-offset-2 ring-offset-pui-surface" />
      </div>
      <div className="relative z-10 ms-auto mt-3 w-36 rounded-pui-md bg-pui-surface p-2 shadow-pui-lg">
        <span className="block h-2 w-20 rounded-pui-full bg-pui-foreground/70" />
        <span className="mt-1.5 block h-1.5 w-28 rounded-pui-full bg-pui-muted-foreground/40" />
        <span className="ms-auto mt-2 block h-4 w-10 rounded-pui-sm bg-pui-primary" />
      </div>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ padding, radius, closeOnOverlayClick }) => {
    const extra = [padding !== 8 ? `padding={${padding}}` : "", radius !== 12 ? `radius={${radius}}` : "", closeOnOverlayClick ? "closeOnOverlayClick" : ""].filter(Boolean);
    return `const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Start the tour</Button>
<SpotlightTour
  open={open}
  onOpenChange={setOpen}${extra.map((e) => `\n  ${e}`).join("")}
  steps={[
    { target: "#search", title: "Find anything fast", content: "Search every project." },
    { target: shareButtonRef, title: "Invite your team", side: "left" },
  ]}
  onFinish={() => markTourSeen()}
/>`;
  },
  propsTable: propDocs<SpotlightTourProps>()([
    { name: "steps", type: "SpotlightTourStep[]", required: true, description: "{ target?, title, content?, side?, padding? }. target is a selector, ref or getter; without one the card is centered." },
    { name: "open", type: "boolean", description: "Controlled visibility. Pair with onOpenChange." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Initial visibility when uncontrolled." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Called on finish, skip and Escape." },
    { name: "step", type: "number", description: "Controlled step index. Pair with onStepChange to resume a tour." },
    { name: "defaultStep", type: "number", default: "0", description: "Initial step when uncontrolled." },
    { name: "onStepChange", type: "(step: number) => void", description: "Called on Next, Back and arrow keys." },
    { name: "onFinish", type: "() => void", description: "The last step's Done button was pressed." },
    { name: "onSkip", type: "(step: number) => void", description: "Skipped with the skip button, Escape or an outside click." },
    { name: "padding", type: "number", default: "8", description: "Space around the highlighted element in px." },
    { name: "radius", type: "number", default: "12", description: "Corner radius of the spotlight in px." },
    { name: "closeOnOverlayClick", type: "boolean", default: "false", description: "Clicking the dimmed page skips the tour." },
    { name: "labels", type: "Partial<SpotlightTourLabels>", description: "next, back, done, skip and progress(n, total)." },
    { name: "className", type: "string", description: "Class for the step card." },
    { name: "container", type: "Element | null", description: "Portal target. Default document.body." },
  ]),
  keyboard: [
    { keys: "→ / ←", action: "Next / previous step" },
    { keys: "Tab", action: "Cycle the card's buttons (focus is trapped)" },
    { keys: "Esc", action: "Skip the tour" },
  ],
  a11y: [
    "The step card is a modal dialog labelled by the step title and described by its text; focus moves into it and returns afterwards.",
    "Step changes are announced politely, with a visible 'Step n of total' counter.",
    "The page stays visible but cannot be clicked while the tour runs, so nobody loses their place by accident.",
    "Targets are scrolled into view and tracked through scroll, resize and layout shifts.",
  ],
  reducedMotion: "The spotlight and card jump between targets instead of gliding, and the pulse ring is off.",
  examples: [
    { title: "Resumable “What’s new”", description: "Controlled step: closing keeps your place.", Demo: WhatsNewDemo },
    { title: "Welcome step", description: "A step without a target centers the card.", Demo: WelcomeDemo },
  ],
};
export default item;
