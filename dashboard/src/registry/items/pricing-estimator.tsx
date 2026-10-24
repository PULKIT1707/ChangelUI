import { Button, PricingEstimator, type PricingEstimatorProps, type PricingTier } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  mode: NonNullable<PricingEstimatorProps["mode"]>;
  scale: NonNullable<PricingEstimatorProps["scale"]>;
  tone: NonNullable<PricingEstimatorProps["tone"]>;
  yearlyDiscount: number;
  basePrice: number;
  showBreakdown: boolean;
};

const defaults: DemoProps = { mode: "graduated", scale: "tiers", tone: "primary", yearlyDiscount: 0.2, basePrice: 0, showBreakdown: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["graduated", "volume"] },
  { type: "select", prop: "scale", label: "Track scale", options: ["tiers", "linear"] },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "success", "info", "neutral"] },
  { type: "number", prop: "yearlyDiscount", label: "Yearly discount", min: 0, max: 0.4, step: 0.05 },
  { type: "number", prop: "basePrice", label: "Platform fee", min: 0, max: 100, step: 5 },
  { type: "boolean", prop: "showBreakdown", label: "Breakdown" },
];

const EVENT_TIERS: PricingTier[] = [
  { upTo: 10_000, unitPrice: 0 },
  { upTo: 100_000, unitPrice: 0.002 },
  { upTo: 1_000_000, unitPrice: 0.0012 },
  { upTo: null, unitPrice: 0.0006 },
];

function Preview({ props }: { props: DemoProps }) {
  const [events, setEvents] = useState(240_000);
  return (
    <div className="w-full max-w-lg">
      <PricingEstimator
        {...props}
        tiers={EVENT_TIERS}
        value={events}
        onValueChange={setEvents}
        max={5_000_000}
        step={1000}
        unitLabel="events"
        quantityLabel="Events per month"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-pui-muted-foreground">First 10K events are always free.</span>
            <Button size="sm" tone={props.tone}>
              Start free
            </Button>
          </div>
        }
      />
    </div>
  );
}

const SEAT_TIERS: PricingTier[] = [
  { upTo: 5, unitPrice: 12, label: "Team" },
  { upTo: 25, unitPrice: 10, label: "Business" },
  { upTo: null, unitPrice: 8, label: "Scale" },
];

function SeatsDemo() {
  return (
    <PricingEstimator
      tiers={SEAT_TIERS}
      mode="volume"
      defaultValue={12}
      min={1}
      max={60}
      unitLabel="seats"
      quantityLabel="Team size"
      title="Price per seat drops as you grow"
      scale="linear"
      tone="success"
      formatQuantity={(n) => String(n)}
    />
  );
}

const STORAGE_TIERS: PricingTier[] = [
  { upTo: 50, unitPrice: 0, label: "Included" },
  { upTo: 500, unitPrice: 0.08 },
  { upTo: null, unitPrice: 0.05 },
];

function StorageDemo() {
  return (
    <PricingEstimator
      tiers={STORAGE_TIERS}
      defaultValue={180}
      max={2000}
      step={10}
      unitLabel="GB"
      unitSingular="GB"
      quantityLabel="Stored data"
      title="Storage add-on"
      basePrice={29}
      yearlyDiscount={0.15}
      tone="info"
      formatQuantity={(n) => (n >= 1000 ? `${n / 1000} TB` : `${n} GB`)}
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64 origin-center scale-[0.8]">
      <PricingEstimator tiers={EVENT_TIERS} defaultValue={240_000} max={5_000_000} step={1000} unitLabel="events" showBreakdown={false} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const tiers = [\n  { upTo: 10_000, unitPrice: 0, label: "Free" },\n  { upTo: 100_000, unitPrice: 0.002 },\n  { upTo: null, unitPrice: 0.0006 },\n];\n\n` +
    toJsx<Record<string, unknown>>(
      "PricingEstimator",
      { tiers: "{tiers}", ...props, unitLabel: "events" },
      { ...defaults, yearlyDiscount: 0 },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('tiers="{tiers}"', "tiers={tiers}"),
  propsTable: propDocs<PricingEstimatorProps>()([
    { name: "tiers", type: "{ upTo: number | null; unitPrice: number; flatFee?: number; label?: string }[]", description: "Ascending tiers; the last is usually open-ended.", required: true },
    { name: "mode", type: '"graduated" | "volume"', default: '"graduated"', description: "Per-tier pricing, or every unit at the reached tier's rate." },
    { name: "value", type: "number", description: "Quantity (controlled)." },
    { name: "defaultValue", type: "number", default: "min", description: "Initial quantity." },
    { name: "onValueChange", type: "(quantity: number) => void", description: "Quantity changes." },
    { name: "min", type: "number", default: "0", description: "Lowest quantity." },
    { name: "max", type: "number", default: "2 × last bound", description: "Highest quantity." },
    { name: "step", type: "number", default: "1", description: "Quantity step." },
    { name: "scale", type: '"tiers" | "linear"', default: '"tiers"', description: "tiers gives each tier an equal share of the track." },
    { name: "unitLabel", type: "string", default: '"units"', description: "Plural unit name." },
    { name: "unitSingular", type: "string", description: "Singular unit for the per-unit price." },
    { name: "currency", type: "string", default: '"USD"', description: "ISO currency code." },
    { name: "locale", type: "string", default: '"en-US"', description: "Number formatting locale." },
    { name: "basePrice", type: "number", default: "0", description: "Fixed platform fee per month." },
    { name: "yearlyDiscount", type: "number", default: "0", description: "0..1; above 0 a monthly / yearly switch appears." },
    { name: "billing", type: '"monthly" | "yearly"', description: "Billing period (controlled)." },
    { name: "onBillingChange", type: "(billing) => void", description: "Billing period changes." },
    { name: "title", type: "ReactNode", default: '"Estimate your cost"', description: "Heading." },
    { name: "quantityLabel", type: "string", default: '"Monthly usage"', description: "Slider name." },
    { name: "showBreakdown", type: "boolean", default: "true", description: "Line-by-line math." },
    { name: "formatQuantity", type: "(n: number) => string", description: "Marks and lines; default compact (10K)." },
    { name: "footer", type: "ReactNode", description: "Under the price, e.g. a call to action." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Accent color." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Nudge the quantity" },
    { keys: "PageUp / PageDown", action: "Larger steps" },
    { keys: "Home / End", action: "Minimum / maximum" },
  ],
  a11y: [
    "A labelled slider whose aria-valuetext reads the real quantity, even on the tier scale.",
    "The current tier has aria-current; the billing switch is a radio group.",
    "A polite status line announces the estimate after you stop moving.",
  ],
  reducedMotion: "Digits change in place, the tier highlight jumps and breakdown rows fade without height animation.",
  examples: [
    { title: "Seats, volume pricing", description: "All seats move to the cheaper rate at each threshold.", Demo: SeatsDemo },
    { title: "Storage add-on", description: "Included allowance, a platform fee and yearly savings.", Demo: StorageDemo },
  ],
};

export default item;
