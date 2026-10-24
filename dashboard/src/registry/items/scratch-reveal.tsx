import { Badge, Button, CopyButton, ScratchReveal, type ScratchRevealProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  cover: NonNullable<ScratchRevealProps["cover"]>;
  threshold: number;
  brushSize: number;
  coverText: string;
  celebrate: boolean;
};

const defaults: DemoProps = { cover: "foil", threshold: 0.5, brushSize: 36, coverText: "Scratch to reveal", celebrate: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "cover", label: "Cover", options: ["foil", "plain"] },
  { type: "number", prop: "threshold", label: "Clear at", min: 0.2, max: 0.9, step: 0.05 },
  { type: "number", prop: "brushSize", label: "Brush (px)", min: 12, max: 72, step: 4 },
  { type: "text", prop: "coverText", label: "Cover text", maxLength: 32 },
  { type: "boolean", prop: "celebrate", label: "Celebrate" },
];

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="w-full rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-pui-lg bg-pui-primary/12 text-pui-primary-text">
            <GiftIcon />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold">Thanks for your first order</p>
            <p className="m-0 text-xs text-pui-muted-foreground">Scratch the card for a code on your next one.</p>
          </div>
        </div>
        <ScratchReveal
          {...props}
          revealed={revealed}
          onRevealedChange={setRevealed}
          onReveal={() => setCount((n) => n + 1)}
          className="h-32"
        >
          <div className="flex h-32 flex-col items-center justify-center gap-2 bg-linear-to-br from-pui-primary/10 via-pui-surface to-pui-success/10">
            <span className="text-xs font-medium tracking-wide text-pui-muted-foreground uppercase">25% off, valid 30 days</span>
            <span className="flex items-center gap-2">
              <code className="rounded-pui-md border border-dashed border-pui-border bg-pui-background px-3 py-1 font-mono text-lg font-semibold tracking-widest text-pui-foreground">
                SPRING-25
              </code>
              <CopyButton value="SPRING-25" label="Copy code" size="sm" />
            </span>
          </div>
        </ScratchReveal>
      </div>
      <div className="flex items-center gap-3 text-xs text-pui-muted-foreground">
        <span>{revealed ? `Revealed ${count} time${count === 1 ? "" : "s"}` : "Drag across the card, or use Reveal"}</span>
        <Button size="sm" variant="outline" tone="neutral" disabled={!revealed} onClick={() => setRevealed(false)}>
          Scratch again
        </Button>
      </div>
    </div>
  );
}

function SpoilerDemo() {
  return (
    <div className="space-y-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <div className="flex items-center gap-2">
        <span className="font-semibold">★★★★☆</span>
        <span className="text-xs text-pui-muted-foreground">Review by Mara, season 2 finale</span>
      </div>
      <p className="m-0 text-pui-muted-foreground">The pacing in the last two episodes is the best the show has had. And then the ending:</p>
      <ScratchReveal cover="plain" coverText="Spoiler · scratch to read" revealLabel="Show spoiler" brushSize={24} threshold={0.35} celebrate={false} className="rounded-pui-md">
        <p className="m-0 px-3 py-3 text-pui-foreground">The lighthouse keeper was the narrator all along, writing letters to herself.</p>
      </ScratchReveal>
    </div>
  );
}

const REWARDS = [
  { day: "Mon", prize: "+50 XP" },
  { day: "Tue", prize: "Streak shield" },
  { day: "Wed", prize: "+120 XP" },
];

function RewardsDemo() {
  return (
    <div className="space-y-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-center justify-between">
        <p className="m-0 text-sm font-semibold">Daily rewards</p>
        <Badge variant="soft" tone="warning">
          3-day streak
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {REWARDS.map((reward) => (
          <div key={reward.day} className="space-y-1.5">
            <ScratchReveal coverText={reward.day} brushSize={28} threshold={0.4} revealLabel={`Reveal ${reward.day}`} className="h-20 rounded-pui-lg">
              <div className="grid h-20 place-items-center bg-pui-warning/12 px-2 text-center text-sm font-semibold text-pui-warning-text">
                {reward.prize}
              </div>
            </ScratchReveal>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-44">
      <ScratchReveal coverText="Scratch me" className="h-20">
        <div className="grid h-20 place-items-center font-mono text-sm font-semibold">SPRING-25</div>
      </ScratchReveal>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "ScratchReveal",
      { ...props, onReveal: "{trackReveal}" },
      { ...defaults },
      "<PromoCode />",
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('onReveal="{trackReveal}"', "onReveal={trackReveal}"),
  propsTable: propDocs<ScratchRevealProps>()([
    { name: "children", type: "ReactNode", description: "Hidden content; inert until revealed.", required: true },
    { name: "threshold", type: "number", default: "0.5", description: "Share scratched before the cover clears itself." },
    { name: "brushSize", type: "number", default: "36", description: "Brush diameter (px)." },
    { name: "coverText", type: "string", default: '"Scratch to reveal"', description: "Printed on the cover." },
    { name: "cover", type: '"foil" | "plain"', default: '"foil"', description: "Metallic foil with grain, or a flat muted cover." },
    { name: "revealLabel", type: "string", default: '"Reveal"', description: "Button that reveals without scratching." },
    { name: "revealed", type: "boolean", description: "Controlled state; false again repaints the cover." },
    { name: "defaultRevealed", type: "boolean", default: "false", description: "Initial state when uncontrolled." },
    { name: "onRevealedChange", type: "(revealed: boolean) => void", description: "State changes." },
    { name: "onReveal", type: "() => void", description: "Fires once per reveal." },
    { name: "celebrate", type: "boolean", default: "true", description: "Star burst when it clears." },
  ]),
  keyboard: [{ keys: "Tab, Enter", action: "Focus Reveal and press it; focus moves into the revealed content" }],
  a11y: [
    "Covered content is inert and aria-hidden, so codes are not read out or tabbable early.",
    "A real Reveal button gives keyboard and screen reader users the same outcome as scratching.",
    "A status region announces \"Revealed\".",
  ],
  reducedMotion: "Scratching still works; the cover fades out quickly with no blur, scale or star burst.",
  examples: [
    { title: "Spoiler in a review", description: "A plain cover with a smaller brush.", Demo: SpoilerDemo },
    { title: "Daily rewards", description: "Several small cards, each with its own Reveal.", Demo: RewardsDemo },
  ],
};

export default item;
