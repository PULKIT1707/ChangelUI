import { Button, UsageMeter, type UsageMeterProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  value: number;
  max: number;
  projected: number;
  breakdown: boolean;
  size: NonNullable<UsageMeterProps["size"]>;
};
const defaults: DemoProps = { value: 72, max: 100, projected: 91, breakdown: true, size: "md" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "value", label: "Used (GB)", min: 0, max: 130, step: 1 },
  { type: "number", prop: "max", label: "Limit (GB)", min: 10, max: 200, step: 10 },
  { type: "number", prop: "projected", label: "Projected (0 = none)", min: 0, max: 160, step: 1 },
  { type: "boolean", prop: "breakdown", label: "Breakdown" },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
];
/** Splits a total into the storage categories the demos use. */
const split = (total: number) => [
  { label: "Media", value: Math.round(total * 0.55) },
  { label: "Backups", value: Math.round(total * 0.3) },
  { label: "Documents", value: total - Math.round(total * 0.55) - Math.round(total * 0.3) },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm">
      <UsageMeter
        label="Storage"
        unit="GB"
        max={props.max}
        value={props.breakdown ? undefined : props.value}
        segments={props.breakdown ? split(props.value) : undefined}
        projected={props.projected || undefined}
        resetLabel="Resets Nov 1"
        size={props.size}
        action={
          <Button size="sm" variant="outline">
            Upgrade
          </Button>
        }
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <UsageMeter label="Storage" unit="GB" max={100} segments={split(78)} projected={94} showLegend={false} size="sm" />
    </div>
  );
}
/** Billing page: several quotas with their own units and formatters. */
function PlanDemo() {
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div className="flex items-baseline justify-between">
        <h3 className="m-0 text-base font-semibold">Pro plan</h3>
        <span className="text-xs text-pui-muted-foreground">Billing period Oct 1 – Oct 31</span>
      </div>
      <UsageMeter label="API requests" value={412_000} max={500_000} projected={538_000} formatValue={(n) => `${Math.round(n / 1000)}k`} resetLabel="Resets in 8 days" />
      <UsageMeter
        label="Seats"
        max={10}
        segments={[
          { label: "Admins", value: 2 },
          { label: "Members", value: 7 },
          { label: "Guests", value: 2 },
        ]}
        action={
          <Button size="sm" variant="soft">
            Add seats
          </Button>
        }
      />
      <UsageMeter label="AI credits spend" value={38} max={200} formatValue={(n) => currency.format(n)} resetLabel="Hard cap at $200" size="sm" />
    </div>
  );
}
/** Live: usage ticks up, the tone moves through ok → warning → critical → over. */
function LiveDemo() {
  const [used, setUsed] = useState(6.4);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <UsageMeter label="Build minutes" value={used} max={10} unit="k min" thresholds={{ warning: 0.75, critical: 0.9 }} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setUsed((u) => Math.max(0, +(u - 1).toFixed(1)))}>
          −1k
        </Button>
        <Button size="sm" onClick={() => setUsed((u) => +(u + 1).toFixed(1))}>
          Run a build (+1k)
        </Button>
      </div>
    </div>
  );
}
/** Compact rows for a sidebar footer. */
function CompactDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3 rounded-pui-lg border border-pui-border bg-pui-background p-3">
      <UsageMeter label="Projects" value={3} max={3} size="sm" />
      <UsageMeter label="Bandwidth" value={41} max={100} unit="GB" size="sm" />
      <UsageMeter label="Emails sent" value={9_300} max={10_000} size="sm" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ['label="Storage"', 'unit="GB"', `max={${props.max}}`];
    if (props.breakdown) attrs.push('segments={[{ label: "Media", value: 40 }, { label: "Backups", value: 22 }]}');
    else attrs.push(`value={${props.value}}`);
    if (props.projected) attrs.push(`projected={${props.projected}}`);
    attrs.push('resetLabel="Resets Nov 1"');
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    return `<UsageMeter\n  ${attrs.join("\n  ")}\n  action={<Button size="sm" variant="outline">Upgrade</Button>}\n/>`;
  },
  propsTable: propDocs<UsageMeterProps>()([
    { name: "label", type: "ReactNode", required: true, description: "Name of the quota; also names the meter." },
    { name: "max", type: "number", required: true, description: "The plan limit." },
    { name: "value", type: "number", default: "sum of segments", description: "Amount used." },
    { name: "segments", type: "{ label, value, color? }[]", description: "Breakdown drawn as stacked segments with a legend." },
    { name: "projected", type: "number", description: "End-of-period forecast: dashed marker and ghost fill." },
    { name: "thresholds", type: "{ warning?, critical? }", default: "{ warning: 0.8, critical: 0.95 }", description: "Fractions of max where the tone changes." },
    { name: "formatValue", type: "(n) => string", description: "Format amounts (currency, k, bytes)." },
    { name: "unit", type: "string", description: "Appended by the default formatter." },
    { name: "resetLabel", type: "ReactNode", description: "Footer text, e.g. when the quota resets." },
    { name: "action", type: "ReactNode", description: "Header slot, e.g. an Upgrade button." },
    { name: "showLegend", type: "boolean", default: "true with segments", description: "Show the segment legend." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Track height and text size." },
  ]),
  a11y: [
    'One role="meter" named by the label, with aria-valuetext like "72 GB of 100 GB (72%), projected 91 GB".',
    "Status is written out in text (\"5 over your limit\"), never color alone; the legend is a plain list.",
  ],
  reducedMotion: "The bar appears at its value without the grow, and value changes don't tween.",
  examples: [
    { title: "Billing page", description: "Requests with a projected overage, seats over the limit, currency spend.", Demo: PlanDemo, wide: true },
    { title: "Live thresholds", description: "Custom thresholds; the tone and copy follow the value.", Demo: LiveDemo },
    { title: "Sidebar footer", description: 'Compact size="sm" rows.', Demo: CompactDemo },
  ],
};
export default item;
