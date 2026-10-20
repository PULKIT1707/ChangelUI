import { Badge, Button, ProximityGlow, ProximityGlowItem, type ProximityGlowProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { BellIcon, ChartIcon, CheckGlyph, CodeIcon, GlobeIcon, LockIcon, ShieldIcon, ZapIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type Glow = "primary" | "gradient" | "success" | "foreground";

type DemoProps = {
  radius: number;
  borderWidth: number;
  fill: boolean;
  glow: Glow;
  disabled: boolean;
};

const defaults: DemoProps = { radius: 240, borderWidth: 1, fill: true, glow: "primary", disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "radius", label: "Radius (px)", min: 80, max: 600, step: 10 },
  { type: "number", prop: "borderWidth", label: "Border (px)", min: 1, max: 4, step: 0.5 },
  { type: "boolean", prop: "fill", label: "Inner wash" },
  { type: "select", prop: "glow", label: "Color", options: ["primary", "gradient", "success", "foreground"] },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const COLORS: Record<Glow, string> = {
  primary: "var(--pui-primary)",
  gradient: "var(--pui-gradient-2)",
  success: "var(--pui-success)",
  foreground: "var(--pui-foreground)",
};

const features = [
  { icon: ZapIcon, title: "Instant deploys", body: "Push to main and it's live in seconds." },
  { icon: ShieldIcon, title: "Secure by default", body: "Private networking and audit logs." },
  { icon: ChartIcon, title: "Live analytics", body: "Every request, charted as it happens." },
  { icon: GlobeIcon, title: "Edge network", body: "Served from 40 regions worldwide." },
  { icon: CodeIcon, title: "Typed SDKs", body: "First-class clients for every runtime." },
  { icon: BellIcon, title: "Smart alerts", body: "Only the pages that matter wake you." },
];

function Preview({ props }: { props: DemoProps }) {
  const { glow, ...rest } = props;
  return (
    <ProximityGlow {...rest} color={COLORS[glow]} className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ icon: Icon, title, body }) => (
        <ProximityGlowItem key={title} className="p-5">
          <span className="mb-3 flex size-9 items-center justify-center rounded-pui-md bg-pui-muted text-pui-foreground">
            <Icon className="size-4" />
          </span>
          <p className="m-0 font-semibold">{title}</p>
          <p className="m-0 mt-1 text-sm text-pui-muted-foreground">{body}</p>
        </ProximityGlowItem>
      ))}
    </ProximityGlow>
  );
}

const plans = [
  { name: "Hobby", price: "$0", items: ["1 project", "Community support"], cta: "Start free" },
  { name: "Pro", price: "$20", items: ["Unlimited projects", "Preview deploys", "Email support"], cta: "Go Pro", featured: true },
  { name: "Team", price: "$80", items: ["SSO + roles", "Audit logs", "Priority support"], cta: "Contact sales" },
];

function PricingDemo() {
  return (
    <ProximityGlow radius={300} borderWidth={1.5} className="grid gap-3 sm:grid-cols-3">
      {plans.map((plan) => (
        <ProximityGlowItem key={plan.name} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="m-0 font-semibold">{plan.name}</p>
            {plan.featured ? (
              <Badge size="sm" tone="primary" variant="soft">
                Popular
              </Badge>
            ) : null}
          </div>
          <p className="m-0 text-3xl font-bold tracking-tight">
            {plan.price}
            <span className="text-sm font-normal text-pui-muted-foreground">/mo</span>
          </p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm text-pui-muted-foreground">
            {plan.items.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <CheckGlyph className="size-3.5 text-pui-success-text" />
                {line}
              </li>
            ))}
          </ul>
          <Button variant={plan.featured ? "solid" : "outline"} tone={plan.featured ? "primary" : "neutral"} size="sm" className="mt-auto">
            {plan.cta}
          </Button>
        </ProximityGlowItem>
      ))}
    </ProximityGlow>
  );
}

const integrations = ["Slack", "GitHub", "Linear", "Figma", "Stripe", "Notion", "Vercel", "Discord"];

function IntegrationsDemo() {
  return (
    <div className="dark rounded-pui-xl bg-pui-background p-4">
      <ProximityGlow radius={160} color="var(--pui-chart-2)" className="grid grid-cols-4 gap-2">
        {integrations.map((name) => (
          <ProximityGlowItem key={name} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-pui-md bg-pui-surface/60">
            <span className="flex size-8 items-center justify-center rounded-pui-sm bg-pui-muted text-sm font-bold text-pui-foreground">{name[0]}</span>
            <span className="text-[11px] text-pui-muted-foreground">{name}</span>
          </ProximityGlowItem>
        ))}
      </ProximityGlow>
    </div>
  );
}

function FocusDemo() {
  return (
    <ProximityGlow className="grid gap-3 sm:grid-cols-2">
      {[
        { icon: LockIcon, title: "Passkeys", body: "Tab here: focus lights the card for keyboard users." },
        { icon: ShieldIcon, title: "2FA", body: "One glow, shared by every card in the group." },
      ].map(({ icon: Icon, title, body }) => (
        <ProximityGlowItem key={title} className="flex items-start gap-3 p-4">
          <Icon className="mt-0.5 size-5 text-pui-primary-text" />
          <div className="flex-1">
            <p className="m-0 font-semibold">{title}</p>
            <p className="m-0 mt-1 text-sm text-pui-muted-foreground">{body}</p>
          </div>
          <Button size="sm" variant="soft">
            Set up
          </Button>
        </ProximityGlowItem>
      ))}
    </ProximityGlow>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement | null>(null);
  useAutoPointer(ref);
  return (
    <ProximityGlow ref={ref} radius={120} borderWidth={1.5} className="grid h-28 w-full grid-cols-3 gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <ProximityGlowItem key={i} className="rounded-pui-md" />
      ))}
    </ProximityGlow>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const { glow, ...rest } = props;
    const base: Omit<DemoProps, "glow"> = { radius: defaults.radius, borderWidth: defaults.borderWidth, fill: defaults.fill, disabled: defaults.disabled };
    const code = toJsx("ProximityGlow", rest, base, '<ProximityGlowItem className="p-5">…</ProximityGlowItem>\n<ProximityGlowItem className="p-5">…</ProximityGlowItem>');
    return glow === "primary" ? code : code.replace("<ProximityGlow", `<ProximityGlow color="${COLORS[glow]}"`);
  },
  propsTable: propDocs<ProximityGlowProps>()([
    { name: "radius", type: "number", default: "240", description: "Glow radius in px around the pointer." },
    { name: "color", type: "string", default: '"var(--pui-primary)"', description: "Glow color (any CSS color or token)." },
    { name: "borderWidth", type: "number", default: "1", description: "Width of the lit border ring in px." },
    { name: "fill", type: "boolean", default: "true", description: "Adds a soft wash inside cards under the pointer." },
    { name: "disabled", type: "boolean", default: "false", description: "Static borders, no listeners." },
  ]),
  a11y: [
    "Purely decorative layers (aria-hidden, pointer-events: none) on top of ordinary cards.",
    "Focus inside a card lights its whole border, so keyboard users get the same cue.",
  ],
  reducedMotion: "Static borders; the glow layers are not rendered.",
  examples: [
    { title: "Pricing tiers", Demo: PricingDemo, wide: true },
    { title: "Integrations", description: "Tighter radius on a dark island.", Demo: IntegrationsDemo },
    { title: "Keyboard focus", Demo: FocusDemo },
  ],
};

export default item;
