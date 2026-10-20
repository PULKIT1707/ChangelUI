import { Badge, Button, Input, Stepper, StepperItem, type StepStatus, type StepperProps } from "changelui";
import { useEffect, useState } from "react";
import { InboxIcon, SendIcon, UserIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  orientation: NonNullable<StepperProps["orientation"]>;
  size: NonNullable<StepperProps["size"]>;
  linear: boolean;
  descriptions: boolean;
  status: "auto" | "error" | "loading";
};

const defaults: DemoProps = { orientation: "horizontal", size: "md", linear: true, descriptions: true, status: "auto" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "boolean", prop: "linear", label: "Linear (steps not clickable)" },
  { type: "boolean", prop: "descriptions", label: "Descriptions" },
  { type: "select", prop: "status", label: "Current step status", options: ["auto", "error", "loading"] },
];

const checkout = [
  { title: "Cart", description: "3 items" },
  { title: "Shipping", description: "Address and speed" },
  { title: "Payment", description: "Card or wallet" },
  { title: "Review", description: "Confirm and pay" },
];

function Preview({ props }: { props: DemoProps }) {
  const [step, setStep] = useState(1);
  const done = step >= checkout.length;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-pui-surface-foreground">
      <Stepper
        value={step}
        onValueChange={setStep}
        orientation={props.orientation}
        size={props.size}
        linear={props.linear}
        aria-label="Checkout progress"
      >
        {checkout.map((s, i) => (
          <StepperItem
            key={s.title}
            title={s.title}
            description={props.descriptions ? s.description : undefined}
            status={i === step && props.status !== "auto" ? (props.status as StepStatus) : undefined}
          />
        ))}
      </Stepper>
      <div className="flex items-center justify-between gap-3 border-t border-pui-border pt-4">
        <span className="text-sm text-pui-muted-foreground" aria-live="polite">
          {done ? "Order placed. Thanks!" : `Step ${step + 1} of ${checkout.length}: ${checkout[step]?.title}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" tone="neutral" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          {done ? (
            <Button size="sm" onClick={() => setStep(0)}>
              Start over
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              {step === checkout.length - 1 ? "Place order" : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <Stepper value={2} size="sm">
        <StepperItem title="Cart" />
        <StepperItem title="Ship" />
        <StepperItem title="Pay" />
        <StepperItem title="Done" />
      </Stepper>
    </div>
  );
}

/** An onboarding wizard with real fields, vertical steps and an async "loading" step. */
function OnboardingDemo() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("Ada Lovelace");
  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => {
      setSaving(false);
      setStep((s) => s + 1);
    }, 1100);
    return () => clearTimeout(t);
  }, [saving]);
  const steps = [
    { title: "Your profile", description: "Name and avatar", icon: <UserIcon className="size-4" /> },
    { title: "Invite your team", description: "Optional, you can skip", icon: <InboxIcon className="size-4" /> },
    { title: "Launch", description: "Create your workspace", icon: <SendIcon className="size-4" /> },
  ];
  return (
    <div className="grid w-full gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
      <Stepper value={step} orientation="vertical" size="sm" aria-label="Onboarding">
        {steps.map((s, i) => (
          <StepperItem key={s.title} title={s.title} description={s.description} icon={s.icon} status={saving && i === step ? "loading" : undefined} />
        ))}
      </Stepper>
      <div className="flex min-h-40 flex-col justify-between gap-4 rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
        {step === 0 ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Display name</span>
            <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />
          </label>
        ) : step === 1 ? (
          <p className="m-0 text-pui-muted-foreground">Invite links expire after 7 days. You can add people later from Settings.</p>
        ) : step === 2 ? (
          <p className="m-0">
            Ready, <strong>{name || "friend"}</strong>. Your workspace is one click away.
          </p>
        ) : (
          <p className="m-0 font-medium text-pui-success-text">Workspace created.</p>
        )}
        <div className="flex justify-end gap-2">
          {step > 0 && step < 3 ? (
            <Button size="sm" variant="ghost" tone="neutral" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button size="sm" loading={saving} onClick={() => setSaving(true)}>
              {step === 2 ? "Create workspace" : "Next"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" tone="neutral" onClick={() => setStep(0)}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Non-linear: every step is a button, and one step flags a validation error. */
function SettingsDemo() {
  const [step, setStep] = useState(0);
  const sections = ["General", "Billing", "Members", "Danger zone"];
  return (
    <div className="flex w-full flex-col gap-4">
      <Stepper value={step} onValueChange={setStep} linear={false} size="sm" aria-label="Project setup">
        {sections.map((title, i) => (
          <StepperItem key={title} title={title} status={i === 1 && step !== 1 ? "error" : undefined} description={i === 1 ? "Card expired" : undefined} />
        ))}
      </Stepper>
      <div className="flex items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface px-4 py-3 text-sm text-pui-surface-foreground">
        <Badge tone={step === 1 ? "danger" : "neutral"}>{sections[step]}</Badge>
        <span className="text-pui-muted-foreground">Click any step to jump to it.</span>
      </div>
    </div>
  );
}

/** A deploy pipeline driven by a timer: steps complete on their own. */
function PipelineDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s >= 4 ? 0 : s + 1)), step >= 4 ? 2200 : 1300);
    return () => clearTimeout(t);
  }, [step]);
  const stages = ["Build", "Test", "Canary", "Production"];
  return (
    <div className="w-full rounded-pui-lg border border-pui-border bg-pui-surface p-4">
      <Stepper value={step} size="sm" aria-label="Deployment">
        {stages.map((title, i) => (
          <StepperItem key={title} title={title} status={i === step ? "loading" : undefined} description={i < step ? "Passed" : i === step ? "Running" : "Queued"} />
        ))}
      </Stepper>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      "value={step}",
      "onValueChange={setStep}",
      p.orientation !== "horizontal" ? `orientation="${p.orientation}"` : "",
      p.size !== "md" ? `size="${p.size}"` : "",
      !p.linear ? "linear={false}" : "",
    ].filter(Boolean);
    return `<Stepper ${attrs.join(" ")} aria-label="Checkout progress">
  <StepperItem title="Cart"${p.descriptions ? ' description="3 items"' : ""} />
  <StepperItem title="Shipping"${p.descriptions ? ' description="Address and speed"' : ""}${p.status !== "auto" ? ` status="${p.status}"` : ""} />
  <StepperItem title="Payment" />
  <StepperItem title="Review" />
</Stepper>`;
  },
  propsTable: propDocs<StepperProps & { title: unknown; description: unknown; status: unknown; icon: unknown; disabled: unknown }>()([
    { name: "value", type: "number", description: "Index of the current step; earlier steps are complete (defaultValue, onValueChange)." },
    { name: "defaultValue", type: "number", default: "0", description: "Initial step when uncontrolled." },
    { name: "onValueChange", type: "(value: number) => void", description: "Called when a step is clicked (linear={false})." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Layout of steps and connectors." },
    { name: "linear", type: "boolean", default: "true", description: "false makes every step a button that jumps to it." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Indicator 28 / 36 px." },
    { name: "statusLabels", type: "Partial<Record<StepStatus, string>>", description: "Visually hidden status words for screen readers." },
    { name: "title", type: "ReactNode", required: true, description: "StepperItem: step name." },
    { name: "description", type: "ReactNode", description: "StepperItem: secondary line." },
    { name: "status", type: '"complete" | "current" | "upcoming" | "error" | "loading"', description: "StepperItem: overrides the derived status." },
    { name: "icon", type: "ReactNode", description: "StepperItem: replaces the step number." },
    { name: "disabled", type: "boolean", description: "StepperItem: can't be selected when linear={false}." },
  ]),
  keyboard: [{ keys: "Tab / Enter / Space", action: "With linear={false}, move between steps and jump to one" }],
  a11y: [
    "An ordered list; the current step has aria-current=\"step\".",
    "Each step carries a visually hidden status (Completed, Current step, Not started, Needs attention, In progress).",
    "Steps are buttons only when linear={false}; otherwise they're plain list items.",
  ],
  reducedMotion: "Connectors fill and indicators switch instantly; the active ring jumps instead of sliding.",
  examples: [
    { title: "Onboarding wizard", description: "Vertical steps with icons and an async loading step.", Demo: OnboardingDemo, wide: true },
    { title: "Non-linear settings", description: "Every step is clickable; one flags an error.", Demo: SettingsDemo },
    { title: "Deploy pipeline", description: "A timer drives the steps; the running one spins.", Demo: PipelineDemo },
  ],
};

export default item;
