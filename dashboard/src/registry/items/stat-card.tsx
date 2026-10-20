import { Button, StatCard, type StatCardProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { kpi, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  label: string;
  trendVariant: "line" | "area" | "bar";
  deltaType: "percent" | "absolute";
  invertDelta: boolean;
  deltaCaption: string;
  periods: boolean;
  target: boolean;
  icon: boolean;
  loading: boolean;
};
const defaults: DemoProps = {
  label: "Monthly recurring revenue",
  trendVariant: "area",
  deltaType: "percent",
  invertDelta: false,
  deltaCaption: "vs previous period",
  periods: true,
  target: true,
  icon: true,
  loading: false,
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "label", label: "Label", maxLength: 40 },
  { type: "select", prop: "trendVariant", label: "Trend", options: ["area", "line", "bar"] },
  { type: "select", prop: "deltaType", label: "Delta", options: ["percent", "absolute"] },
  { type: "boolean", prop: "invertDelta", label: "Lower is better" },
  { type: "text", prop: "deltaCaption", label: "Delta caption", maxLength: 40 },
  { type: "boolean", prop: "periods", label: "Period switch" },
  { type: "boolean", prop: "target", label: "Target meter" },
  { type: "boolean", prop: "icon", label: "Icon" },
  { type: "boolean", prop: "loading", label: "Loading" },
];

const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
const PERIOD_DAYS: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90 };

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.3 2.1-3 2.1-1.4 0-2.6-.6-3.1-1.6M12 6.5v11" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const [period, setPeriod] = useState("30D");
  const days = PERIOD_DAYS[period] ?? 30;
  const k = useMemo(() => kpi(seed + days, 48_000, days, 0.004, 0.05), [seed, days]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover or arrow through the trend: the headline rolls to that day.">
      <StatCard
        label={props.label}
        value={k.value}
        previousValue={k.previous}
        format={usd}
        deltaType={props.deltaType}
        invertDelta={props.invertDelta}
        deltaCaption={props.deltaCaption}
        trend={k.trend}
        trendLabels={k.labels}
        trendVariant={props.trendVariant}
        target={props.target ? 60_000 : undefined}
        targetLabel="Q2 goal"
        periods={props.periods ? ["7D", "30D", "90D"] : undefined}
        period={period}
        onPeriodChange={setPeriod}
        icon={props.icon ? <CoinIcon /> : undefined}
        loading={props.loading}
        className="w-full max-w-sm"
      />
    </ChartDemo>
  );
}

function Mini() {
  const k = useMemo(() => kpi(3, 12_400, 14), []);
  return <StatCard label="Active users" value={k.value} previousValue={k.previous} format={{ notation: "compact", maximumFractionDigits: 1 }} trend={k.trend} animation="never" className="w-56" />;
}

function KpiRow() {
  const [seed, randomize] = useSeed(11);
  const mrr = useMemo(() => kpi(seed, 182_000, 14, 0.006), [seed]);
  const users = useMemo(() => kpi(seed + 1, 12_400, 14, 0.008, 0.1), [seed]);
  const churn = useMemo(() => kpi(seed + 2, 0.031, 14, -0.006, 0.08), [seed]);
  const latency = useMemo(() => kpi(seed + 3, 182, 14, 0.004, 0.12), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Churn and latency use invertDelta: going down is good news.">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={mrr.value} previousValue={mrr.previous} format={usd} trend={mrr.trend} trendLabels={mrr.labels} icon={<CoinIcon />} />
        <StatCard label="Active users" value={users.value} previousValue={users.previous} format={{ notation: "compact", maximumFractionDigits: 1 }} trend={users.trend} trendLabels={users.labels} icon={<UsersIcon />} />
        <StatCard label="Churn" value={churn.value} previousValue={churn.previous} format={{ style: "percent", maximumFractionDigits: 2 }} invertDelta trend={churn.trend} trendLabels={churn.labels} trendVariant="line" />
        <StatCard
          label="p95 latency"
          value={latency.value}
          previousValue={latency.previous}
          format={{ style: "unit", unit: "millisecond", unitDisplay: "short", maximumFractionDigits: 0 }}
          deltaType="absolute"
          invertDelta
          trend={latency.trend}
          trendLabels={latency.labels}
          trendVariant="bar"
        />
      </div>
    </ChartDemo>
  );
}

function Loading() {
  const [loading, setLoading] = useState(true);
  const k = useMemo(() => kpi(21, 3_240, 14, 0.01), []);
  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setLoading((v) => !v)}>
          {loading ? "Finish loading" : "Load again"}
        </Button>
      </div>
      <StatCard label="New signups" value={k.value} previousValue={k.previous} trend={k.trend} trendLabels={k.labels} loading={loading} className="max-w-xs" />
    </div>
  );
}

function Goal() {
  const [seed, randomize] = useSeed(30);
  const k = useMemo(() => kpi(seed, 860, 21, 0.012, 0.1), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="The meter turns green once the target is reached.">
      <StatCard
        label="Deals closed this quarter"
        value={Math.round(k.value)}
        delta={Math.round(k.value - k.previous)}
        deltaType="absolute"
        deltaCaption="vs last quarter"
        trend={k.trend.map(Math.round)}
        trendLabels={k.labels}
        trendVariant="line"
        target={1000}
        footer={<a className="text-pui-primary-text underline-offset-2 hover:underline" href="#/charts">Open pipeline report</a>}
        className="max-w-xs"
      />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<StatCard",
      `  label="${p.label}"`,
      "  value={mrr}",
      "  previousValue={lastMonth}",
      '  format={{ style: "currency", currency: "USD", notation: "compact" }}',
      "  trend={daily}",
      "  trendLabels={days}",
      p.trendVariant !== "area" ? `  trendVariant="${p.trendVariant}"` : null,
      p.deltaType !== "percent" ? `  deltaType="${p.deltaType}"` : null,
      p.invertDelta ? "  invertDelta" : null,
      p.deltaCaption !== "vs previous period" ? `  deltaCaption="${p.deltaCaption}"` : null,
      p.target ? "  target={60_000}" : null,
      p.periods ? '  periods={["7D", "30D", "90D"]}\n  period={period}\n  onPeriodChange={setPeriod}' : null,
      p.icon ? "  icon={<CoinIcon />}" : null,
      p.loading ? "  loading" : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<StatCardProps>()([
    { name: "label", type: "ReactNode", required: true, description: "What the number is." },
    { name: "value", type: "number", required: true, description: "The headline value (rolls on change)." },
    { name: "format", type: "Intl.NumberFormatOptions", description: "Currency, percent, compact, unit, ..." },
    { name: "previousValue", type: "number", description: "Comparison value; gives the delta." },
    { name: "delta", type: "number", description: "Explicit change: a fraction (0.12 = +12%) or units with deltaType absolute." },
    { name: "deltaType", type: '"percent" | "absolute"', default: '"percent"', description: "How the delta badge reads." },
    { name: "invertDelta", type: "boolean", default: "false", description: "Lower is better (churn, latency): a fall turns green." },
    { name: "deltaCaption", type: "string", default: '"vs previous period"', description: "Text after the badge (also in the accessible label)." },
    { name: "trend", type: "readonly number[]", description: "Recent values for the sparkline; scrubbing drives the headline." },
    { name: "trendLabels", type: "readonly string[]", description: "Point labels shown while scrubbing." },
    { name: "trendVariant", type: '"area" | "line" | "bar"', default: '"area"', description: "Sparkline style." },
    { name: "target", type: "number", description: "Adds a progress-to-target meter (role=meter)." },
    { name: "periods", type: "readonly string[]", description: "Period radiogroup with a gliding pill (period / onPeriodChange)." },
    { name: "icon", type: "ReactNode", description: "Icon in a tinted chip." },
    { name: "footer", type: "ReactNode", description: "Bottom row (a link, a breakdown)." },
    { name: "loading", type: "boolean", default: "false", description: "Skeleton with the same footprint (aria-busy)." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Period switch, then the sparkline" },
    { keys: "← / →", action: "Change period; on the sparkline, move between days (the headline follows)" },
    { keys: "Home / End", action: "First / last period or day" },
  ],
  a11y: [
    'role="group" named by the label and described by a sentence like "up 12% vs previous period".',
    "The period switch is a radiogroup with roving focus; the target bar is a role=meter with a value text.",
    "Color is never the only cue: the badge has an arrow and a sign.",
  ],
  reducedMotion: "Values and the target bar jump to their final state; the period pill moves instantly.",
  examples: [
    { title: "KPI row", description: "Four cards: currency, compact, percent with invertDelta, and a unit with an absolute delta.", Demo: KpiRow, wide: true },
    { title: "Loading skeleton", description: "Same footprint while data loads, so the layout never jumps.", Demo: Loading },
    { title: "Goal tracking", description: "Absolute delta, a target meter and a footer link.", Demo: Goal },
  ],
};
export default item;
