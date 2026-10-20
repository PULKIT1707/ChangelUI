import { HoldToConfirm, RollingNumber, type HoldToConfirmProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tone: NonNullable<HoldToConfirmProps["tone"]>;
  size: NonNullable<HoldToConfirmProps["size"]>;
  variant: NonNullable<HoldToConfirmProps["variant"]>;
  holdMs: number;
  label: string;
  confirmedLabel: string;
};

const defaults: DemoProps = {
  tone: "danger",
  size: "md",
  variant: "soft",
  holdMs: 1200,
  label: "Hold to delete",
  confirmedLabel: "Deleted",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "select", prop: "variant", label: "Variant", options: ["soft", "outline"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "number", prop: "holdMs", label: "Hold (ms)", min: 300, max: 4000, step: 100 },
  { type: "text", prop: "label", label: "Label", maxLength: 32 },
  { type: "text", prop: "confirmedLabel", label: "Confirmed label", maxLength: 32 },
];

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 15c-1.5 1.3-2 4-2 6 2 0 4.7-.5 6-2M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5zM9 10H5l-2 3 4 1M14 15v4l-3 2-1-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [confirmed, setConfirmed] = useState(0);
  const { label, ...rest } = props;
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <HoldToConfirm {...rest} icon={<TrashIcon />} onConfirm={() => setConfirmed((n) => n + 1)}>
          {label}
        </HoldToConfirm>
        <span className="flex items-center gap-1.5 text-xs text-pui-muted-foreground">
          Confirmed <RollingNumber value={confirmed} className="font-semibold text-pui-foreground" /> times · hold with
          the pointer, Space or Enter
        </span>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
          <div>
            <p className="m-0 text-sm font-semibold">Publish release</p>
            <p className="m-0 mt-1 text-xs text-pui-muted-foreground">Ships v2.4.0 to every user.</p>
          </div>
          <HoldToConfirm tone="primary" variant="outline" icon={<RocketIcon />} confirmedLabel="Published" onConfirm={() => {}}>
            Hold to publish
          </HoldToConfirm>
        </div>
        <div className="flex flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
          <div>
            <p className="m-0 text-sm font-semibold">API key</p>
            <p className="m-0 mt-1 font-mono text-xs text-pui-muted-foreground">pk_live_••••3f9a</p>
          </div>
          <HoldToConfirm tone="warning" size="sm" holdMs={800} icon={<KeyIcon />} confirmedLabel="Revoked" onConfirm={() => {}}>
            Hold to revoke
          </HoldToConfirm>
        </div>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <HoldToConfirm icon={<TrashIcon />} onConfirm={() => {}} tabIndex={-1}>
        Hold to delete
      </HoldToConfirm>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ label, ...props }) =>
    toJsx<Record<string, unknown>>(
      "HoldToConfirm",
      { ...props, onConfirm: "{deleteProject}" },
      { tone: "danger", size: "md", variant: "soft", holdMs: 1200, confirmedLabel: "Deleted" },
      label,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('onConfirm="{deleteProject}"', "onConfirm={deleteProject}"),
  propsTable: propDocs<HoldToConfirmProps>()([
    { name: "onConfirm", type: "() => void", description: "Called once the hold completes.", required: true },
    { name: "children", type: "ReactNode", default: '"Hold to delete"', description: "Label while idle." },
    { name: "confirmedLabel", type: "ReactNode", default: '"Deleted"', description: "Label after confirming." },
    { name: "holdMs", type: "number", default: "1200", description: "How long the press must last." },
    { name: "resetMs", type: "number", default: "1800", description: "Back to idle after confirming; 0 stays confirmed." },
    { name: "tone", type: "Tone", default: '"danger"', description: "Semantic color of the fill." },
    { name: "variant", type: '"soft" | "outline"', default: '"soft"', description: "Resting surface." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height 32 / 36 / 44 px." },
    { name: "icon", type: "ReactNode", description: "Leading icon while idle." },
    { name: "hintLabel", type: "string", default: '"Press and hold to confirm"', description: "aria-describedby hint." },
    { name: "onStateChange", type: '(state: "idle" | "holding" | "confirmed") => void', description: "Every state change." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the button." },
  ]),
  keyboard: [{ keys: "Space / Enter (hold)", action: "Fill and confirm; release early to cancel" }],
  a11y: [
    "A real button described by a 'Press and hold to confirm' hint.",
    "The label changes to the confirmed label, so the new name is read on focus.",
    "Blur and pointer cancel stop the hold, so nothing confirms by accident.",
  ],
  reducedMotion: "The fill still sweeps (it is the feedback), but labels fade and there is no press scale or pulse.",
};

export default item;
