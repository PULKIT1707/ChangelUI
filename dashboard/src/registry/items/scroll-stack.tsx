import { ScrollStack, ScrollStackItem, type ScrollStackProps } from "changelui";
import type { ReactNode } from "react";
import { LockIcon, SparkIcon, UsersIcon, ZapIcon } from "../../lib/demo-icons";
import { ScrollStage } from "../../lib/scroll-stage";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { offset: number; scaleStep: number; rotateStep: number; dim: number; distance: number };
const defaults: DemoProps = { offset: 24, scaleStep: 0.05, rotateStep: 0, dim: 0.5, distance: 200 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "offset", label: "Offset (px)", min: 0, max: 48, step: 4 },
  { type: "number", prop: "scaleStep", label: "Scale step", min: 0, max: 0.12, step: 0.01 },
  { type: "number", prop: "rotateStep", label: "Rotate step (°)", min: 0, max: 6, step: 0.5 },
  { type: "number", prop: "dim", label: "Dim", min: 0, max: 1, step: 0.1 },
  { type: "number", prop: "distance", label: "Distance (px)", min: 80, max: 400, step: 20 },
];

const FEATURES: { title: string; body: string; icon: ReactNode; tint: string; stat: string }[] = [
  { title: "Instant everything", body: "Local-first sync means every click lands in under 50ms, even on hotel Wi-Fi.", icon: <ZapIcon className="size-5" />, tint: "var(--pui-chart-1)", stat: "48ms p95" },
  { title: "Built for teams", body: "Live cursors, comments and presence. Hand off work without a meeting.", icon: <UsersIcon className="size-5" />, tint: "var(--pui-chart-2)", stat: "12 seats" },
  { title: "Private by default", body: "End-to-end encryption for every doc, with keys that never leave your devices.", icon: <LockIcon className="size-5" />, tint: "var(--pui-chart-3)", stat: "AES-256" },
  { title: "An assistant that knows your work", body: "Ask anything about your projects and get answers with sources you can open.", icon: <SparkIcon className="size-5" />, tint: "var(--pui-chart-4)", stat: "Beta" },
];

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[number]; index: number }) {
  return (
    <div className="grid h-60 gap-4 p-6 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-3">
        <span className="grid size-10 place-items-center rounded-pui-lg text-pui-primary-foreground shadow-pui-sm" style={{ background: feature.tint }}>
          {feature.icon}
        </span>
        <h3 className="m-0 text-xl font-semibold tracking-tight text-pui-surface-foreground">{feature.title}</h3>
        <p className="m-0 max-w-md text-sm leading-relaxed text-pui-muted-foreground">{feature.body}</p>
      </div>
      <div className="hidden flex-col items-end justify-between sm:flex">
        <span className="font-pui-mono text-xs text-pui-muted-foreground">0{index + 1} / 0{FEATURES.length}</span>
        <span className="rounded-full border border-pui-border bg-pui-background px-3 py-1 text-xs font-semibold text-pui-foreground">{feature.stat}</span>
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <ScrollStage height="h-[26rem]" hint="Scroll to stack the cards" lead="h-28" tail="h-64">
      {(ref) => (
        <ScrollStack {...props} container={ref} className="mx-4 sm:mx-8">
          {FEATURES.map((feature, i) => (
            <ScrollStackItem
              key={feature.title}
              className="rounded-pui-xl border border-pui-border bg-pui-surface shadow-pui-xl"
              style={{ backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklch, ${feature.tint} 22%, transparent), transparent 60%)` }}
            >
              <FeatureCard feature={feature} index={i} />
            </ScrollStackItem>
          ))}
        </ScrollStack>
      )}
    </ScrollStage>
  );
}

const PLANS = [
  { name: "Starter", price: "$0", note: "For side projects" },
  { name: "Pro", price: "$12", note: "For growing teams" },
  { name: "Scale", price: "$49", note: "For whole companies" },
];

function DeckDemo() {
  return (
    <ScrollStage hint="Tilted deck" lead="h-20" tail="h-56">
      {(ref) => (
        <ScrollStack container={ref} offset={10} rotateStep={2.5} scaleStep={0.04} distance={140} className="mx-auto w-64">
          {PLANS.map((plan) => (
            <ScrollStackItem key={plan.name} className="rounded-pui-xl border border-pui-border bg-pui-surface p-5 shadow-pui-lg">
              <p className="m-0 text-sm font-medium text-pui-muted-foreground">{plan.name}</p>
              <p className="m-0 mt-1 font-pui-display text-4xl font-bold text-pui-surface-foreground">
                {plan.price}
                <span className="text-sm font-normal text-pui-muted-foreground"> /mo</span>
              </p>
              <p className="m-0 mt-6 text-sm text-pui-muted-foreground">{plan.note}</p>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      )}
    </ScrollStage>
  );
}

function PhotoStackDemo() {
  const tints = ["var(--pui-chart-5)", "var(--pui-chart-1)", "var(--pui-chart-3)", "var(--pui-primary)"];
  return (
    <ScrollStage hint="Full-bleed panels, no dim" lead="h-20" tail="h-56">
      {(ref) => (
        <ScrollStack container={ref} stickyTop={12} offset={0} dim={0} scaleStep={0.07} distance={160} className="mx-4">
          {tints.map((tint, i) => (
            <ScrollStackItem key={tint} className="grid h-48 place-items-center rounded-pui-xl shadow-pui-lg" style={{ background: `linear-gradient(135deg, ${tint}, color-mix(in oklch, ${tint} 45%, var(--pui-surface)))` }}>
              <span className="rounded-full bg-pui-surface/85 px-3 py-1 text-sm font-semibold text-pui-surface-foreground backdrop-blur-sm">Chapter {i + 1}</span>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <div className="relative h-24 w-40">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-x-0 h-14 rounded-pui-md border border-pui-border bg-pui-surface shadow-pui-md"
          style={{ top: i * 10, transform: `scale(${1 - (2 - i) * 0.06})`, transformOrigin: "top", opacity: 1 - (2 - i) * 0.2 }}
        >
          <span className="m-2 block h-2 w-12 rounded-full" style={{ background: `var(--pui-chart-${i + 1})` }} />
        </div>
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx(
      "ScrollStack",
      props,
      defaults,
      `{features.map((f) => (\n  <ScrollStackItem key={f.id} className="rounded-pui-xl border border-pui-border bg-pui-surface shadow-pui-xl">\n    <FeatureCard {...f} />\n  </ScrollStackItem>\n))}`,
      controls,
    ),
  propsTable: propDocs<ScrollStackProps>()([
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box the stack lives in; default the window." },
    { name: "stickyTop", type: "number", default: "24", description: "Px from the top where the first card sticks." },
    { name: "offset", type: "number", default: "24", description: "Px each later card sits below the previous one." },
    { name: "scaleStep", type: "number", default: "0.05", description: "Scale lost per card stacked on top." },
    { name: "rotateStep", type: "number", default: "0", description: "Degrees buried cards tilt, alternating sides." },
    { name: "dim", type: "number", default: "0.5", description: "How much buried cards fade toward the background." },
    { name: "distance", type: "number", default: "200", description: "Scroll px between cards." },
  ]),
  a11y: [
    "The stack is a list (role=list/listitem) in reading order; covered cards stay in the DOM.",
    "Only transforms and an overlay change, so text inside cards remains selectable and focusable.",
  ],
  reducedMotion: "A plain vertical list: no pinning, scaling or dimming.",
  examples: [
    { title: "Tilted deck", description: "rotateStep and a small offset for a pricing deck.", Demo: DeckDemo },
    { title: "Chapters", description: "dim={0}, offset={0} for stacked full-bleed panels.", Demo: PhotoStackDemo },
  ],
};
export default item;
