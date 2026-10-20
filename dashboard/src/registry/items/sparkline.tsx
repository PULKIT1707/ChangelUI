import { Sparkline, type SparklineProps } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { results, useSeed, walk } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: "line" | "area" | "bar" | "winloss";
  points: number;
  width: number;
  height: number;
  trendColored: boolean;
  showValue: boolean;
  showExtremes: boolean;
  reference: boolean;
  band: boolean;
  curve: "monotone" | "linear" | "step";
};
const defaults: DemoProps = {
  variant: "area",
  points: 30,
  width: 220,
  height: 48,
  trendColored: true,
  showValue: true,
  showExtremes: false,
  reference: false,
  band: false,
  curve: "monotone",
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["line", "area", "bar", "winloss"] },
  { type: "number", prop: "points", label: "Points", min: 6, max: 90, step: 1 },
  { type: "number", prop: "width", label: "Width (px)", min: 80, max: 360, step: 10 },
  { type: "number", prop: "height", label: "Height (px)", min: 20, max: 96, step: 4 },
  { type: "boolean", prop: "trendColored", label: "Color by trend" },
  { type: "boolean", prop: "showValue", label: "Show value + change" },
  { type: "boolean", prop: "showExtremes", label: "Mark min / max" },
  { type: "boolean", prop: "reference", label: "Reference line (start)" },
  { type: "boolean", prop: "band", label: "Normal band" },
  { type: "select", prop: "curve", label: "Curve", options: ["monotone", "linear", "step"] },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", maximumFractionDigits: 2 };
const DAY_LABELS = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 2, 1) + i * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const { points, reference, band, variant, ...rest } = props;
  const data = useMemo(() => (variant === "winloss" ? results(seed, points) : walk(seed, points)), [seed, points, variant]);
  const labels = useMemo(() => DAY_LABELS(points), [points]);
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover or focus and use the arrow keys to scrub.">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs font-medium text-pui-muted-foreground">{variant === "winloss" ? "Match margins" : "ACME share price"}</span>
        <Sparkline
          {...rest}
          variant={variant}
          data={data}
          labels={labels}
          label={variant === "winloss" ? "Results" : "Share price"}
          format={variant === "winloss" ? { signDisplay: "always" } : usd}
          referenceValue={reference ? data[0] : undefined}
          band={band ? [lo + (hi - lo) * 0.3, lo + (hi - lo) * 0.7] : undefined}
        />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => walk(8, 24), []);
  return <Sparkline data={data} variant="area" width={140} height={40} trendColored interactive={false} animation="never" />;
}

const TICKERS = ["ACME", "GLOBX", "INITECH", "UMBRL", "STARK", "WAYNE"];
function Watchlist() {
  const [seed, randomize] = useSeed(10);
  const rows = useMemo(() => TICKERS.map((t, i) => ({ t, data: walk(seed * 13 + i, 40, 40 + i * 25, (i % 3) * 0.003 - 0.002) })), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Inline in a table: each row is a fluid sparkline.">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-pui-muted-foreground">
            <th className="pb-2 font-medium">Ticker</th>
            <th className="pb-2 font-medium">40 days</th>
            <th className="pb-2 text-right font-medium">Last</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.t} className="border-t border-pui-border">
              <td className="py-2 font-mono text-xs font-semibold">{r.t}</td>
              <td className="w-1/2 py-2 pe-4">
                <Sparkline data={r.data} fluid height={28} trendColored label={`${r.t} price`} format={usd} />
              </td>
              <td className="py-2 text-right tabular-nums">{(r.data[r.data.length - 1] ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartDemo>
  );
}

function KpiCards() {
  const [seed, randomize] = useSeed(2);
  const kpis = useMemo(
    () => [
      { name: "Revenue", data: walk(seed, 30, 42_000, 0.006), format: { style: "currency", currency: "USD", notation: "compact" } as Intl.NumberFormatOptions, variant: "area" as const },
      { name: "Active users", data: walk(seed + 1, 30, 8_200, 0.003), format: { notation: "compact" } as Intl.NumberFormatOptions, variant: "line" as const },
      { name: "Daily orders", data: walk(seed + 2, 20, 320, -0.004), format: { maximumFractionDigits: 0 } as Intl.NumberFormatOptions, variant: "bar" as const },
    ],
    [seed],
  );
  return (
    <ChartDemo onRandomize={randomize} hint="Randomize: lines and bars morph to the new values.">
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.name} className="flex flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3">
            <span className="text-xs font-medium text-pui-muted-foreground">{k.name}</span>
            <Sparkline data={k.data} variant={k.variant} fluid height={40} trendColored showValue format={k.format} label={k.name} />
          </div>
        ))}
      </div>
    </ChartDemo>
  );
}

function InText() {
  const data = useMemo(() => walk(21, 16, 60, 0.01), []);
  const wl = useMemo(() => results(5, 14), []);
  return (
    <p className="max-w-prose text-sm leading-7">
      Signups climbed all month <Sparkline data={data} width={72} height={18} showDot trendColored label="Signups" /> while the team&apos;s recent results{" "}
      <Sparkline data={wl} variant="winloss" width={84} height={16} label="Results" /> show a strong finish. Sparklines sit on the text baseline and
      stay one tab stop each.
    </p>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ points, reference, band, ...props }) => {
    const lib: Record<string, unknown> = { variant: "line", width: 120, height: 32, trendColored: false, showValue: false, showExtremes: false, curve: "monotone" };
    const lines = Object.entries(props)
      .filter(([k, v]) => v !== lib[k])
      .map(([k, v]) => (v === true ? `  ${k}` : typeof v === "string" ? `  ${k}="${v}"` : `  ${k}={${String(v)}}`));
    if (reference) lines.push("  referenceValue={prices[0]}");
    if (band) lines.push("  band={[low, high]}");
    return [`<Sparkline`, `  data={prices} // ${points} points`, ...lines, `  format={{ style: "currency", currency: "USD" }}`, `/>`].join("\n");
  },
  propsTable: propDocs<SparklineProps>()([
    { name: "data", type: "readonly (number | null)[]", required: true, description: "Values, oldest first; null leaves a gap." },
    { name: "variant", type: '"line" | "area" | "bar" | "winloss"', default: '"line"', description: "Win/loss draws up and down ticks by sign." },
    { name: "width", type: "number", default: "120", description: "Width in px (the pre-measure width when fluid)." },
    { name: "fluid", type: "boolean", default: "false", description: "Fill the container's width (tables, cards)." },
    { name: "height", type: "number", default: "32", description: "Height in px." },
    { name: "trendColored", type: "boolean", default: "false", description: "Success / danger tone by last vs first value." },
    { name: "showValue", type: "boolean", default: "false", description: "Last value and the change after the chart." },
    { name: "showDot", type: "boolean", default: "true for line and area", description: "Dot on the last value (pulses once on entrance)." },
    { name: "showExtremes", type: "boolean", default: "false", description: "Mark the min and max points." },
    { name: "referenceValue", type: "number", description: "Dashed reference line." },
    { name: "band", type: "[number, number]", description: "Shaded normal range." },
    { name: "labels", type: "string[]", description: "Point labels for the scrub pill and announcements." },
    { name: "interactive", type: "boolean", default: "true", description: "Hover / keyboard scrub; false renders a static image." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", default: "compact", description: "Value format." },
    { name: "label", type: "string", default: '"Trend"', description: "Name used in the accessible description." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the sparkline (one stop)" },
    { keys: "← / →", action: "Move the scrub dot (announced)" },
    { keys: "Home / End", action: "First / last point" },
    { keys: "Escape", action: "Hide the scrub dot" },
  ],
  a11y: [
    'role="img" with a computed description: direction and change, first and last value, low and high.',
    "Scrubbing announces each point in a polite live region (debounced).",
    "Win/loss bars use position as well as color (up = win, down = loss).",
  ],
  reducedMotion: "No draw-in, pulse or morph: the final sparkline renders immediately.",
  examples: [
    { title: "Watchlist table", description: "fluid sparklines inside table cells.", Demo: Watchlist, wide: true },
    { title: "KPI cards", description: "Area, line and bar variants with value and change.", Demo: KpiCards, wide: true },
    { title: "In a sentence", description: "Word-sized charts on the text baseline.", Demo: InText },
  ],
};
export default item;
