import { Button, IconButton, RollingNumber, type RollingNumberProps } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type FormatName = "number" | "currency" | "percent" | "compact";
type DemoProps = {
  format: FormatName;
  duration: number;
  stagger: number;
  bounce: number;
  direction: NonNullable<RollingNumberProps["direction"]>;
};
const defaults: DemoProps = { format: "currency", duration: 0.6, stagger: 0.03, bounce: 0.2, direction: "auto" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "format", label: "Format", options: ["number", "currency", "percent", "compact"] },
  { type: "select", prop: "direction", label: "Direction", options: ["auto", "up", "down"] },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 2, step: 0.1 },
  { type: "number", prop: "stagger", label: "Stagger (s)", min: 0, max: 0.15, step: 0.01 },
  { type: "number", prop: "bounce", label: "Bounce", min: 0, max: 0.6, step: 0.05 },
];

const formats: Record<FormatName, Intl.NumberFormatOptions> = {
  number: {},
  currency: { style: "currency", currency: "USD" },
  percent: { style: "percent", maximumFractionDigits: 1 },
  compact: { notation: "compact", maximumFractionDigits: 1 },
};
const formatCode: Record<FormatName, string> = {
  number: "",
  currency: 'format={{ style: "currency", currency: "USD" }}',
  percent: 'format={{ style: "percent", maximumFractionDigits: 1 }}',
  compact: 'format={{ notation: "compact", maximumFractionDigits: 1 }}',
};
const starting: Record<FormatName, number> = { number: 12840, currency: 249.99, percent: 0.274, compact: 18400 };
const steps: Record<FormatName, number> = { number: 137, currency: 12.5, percent: 0.031, compact: 4200 };

function Minus() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}
function Plus() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Hero demo: step the value up and down, or jump to a random one. */
function Stepper({ props }: { props: DemoProps }) {
  const [value, setValue] = useState(starting[props.format]);
  const step = steps[props.format];
  const { format, ...motionProps } = props;
  return (
    <div className="flex flex-col items-center gap-4">
      <RollingNumber
        {...motionProps}
        value={value}
        format={formats[format]}
        announce
        className="text-5xl font-bold tracking-tight text-pui-foreground sm:text-6xl"
      />
      <div className="flex items-center gap-2">
        <IconButton size="sm" variant="outline" tone="neutral" aria-label="Decrease" onClick={() => setValue((v) => Math.max(0, v - step))}>
          <Minus />
        </IconButton>
        <Button
          size="sm"
          variant="soft"
          onClick={() => setValue(Math.round(Math.random() * starting[format] * 4 * 100) / 100)}
        >
          Random
        </Button>
        <IconButton size="sm" variant="outline" tone="neutral" aria-label="Increase" onClick={() => setValue((v) => v + step)}>
          <Plus />
        </IconButton>
      </div>
    </div>
  );
}

const tickers = [
  { symbol: "PUI", base: 184.2 },
  { symbol: "MTN", base: 62.75 },
  { symbol: "SPR", base: 1290.4 },
];

/** Live board: values drift every 1.6s, digits roll in the direction of the change. */
function LiveBoard({ props }: { props: DemoProps }) {
  const [prices, setPrices] = useState(() => tickers.map((t) => t.base));
  const [deltas, setDeltas] = useState(() => tickers.map(() => 0));
  useEffect(() => {
    const id = window.setInterval(() => {
      const changes = tickers.map((t) => Math.round((Math.random() - 0.48) * t.base * 0.03 * 100) / 100);
      setDeltas(changes);
      setPrices((current) => current.map((p, i) => Math.max(1, Math.round((p + (changes[i] ?? 0)) * 100) / 100)));
    }, 1600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <ul className="m-0 grid w-full max-w-sm list-none gap-1.5 p-0" aria-label="Live prices">
      {tickers.map((t, i) => {
        const delta = deltas[i] ?? 0;
        const tone = delta > 0 ? "text-pui-success" : delta < 0 ? "text-pui-danger" : "text-pui-muted-foreground";
        return (
          <li
            key={t.symbol}
            className="flex items-center justify-between rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 text-sm"
          >
            <span className="font-mono font-semibold text-pui-foreground">{t.symbol}</span>
            <span className="flex items-center gap-3">
              <RollingNumber
                value={prices[i] ?? t.base}
                format={{ style: "currency", currency: "USD" }}
                duration={props.duration}
                stagger={props.stagger}
                bounce={props.bounce}
                className="font-semibold text-pui-foreground"
              />
              <span className={`w-14 text-right text-xs font-medium ${tone}`}>
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(2)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      {/* Remount when the format changes so the starting value matches it. */}
      <Stepper key={props.format} props={props} />
      <div className="flex w-full flex-col items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-pui-muted-foreground uppercase">Live board</span>
        <LiveBoard props={props} />
      </div>
    </div>
  );
}

function Mini() {
  const [value, setValue] = useState(4096);
  useEffect(() => {
    const id = window.setInterval(() => setValue((v) => v + Math.round(Math.random() * 180 + 7)), 2200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-1">
      <RollingNumber value={value} className="text-3xl font-bold text-pui-foreground" />
      <span className="text-xs text-pui-muted-foreground">stars</span>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ format, ...props }) => {
    const jsx = toJsx<Record<string, unknown>>(
      "RollingNumber",
      { value: "{price}", ...props },
      { value: undefined, duration: 0.6, stagger: 0.03, bounce: 0.2, direction: "auto" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('value="{price}"', "value={price}");
    const extra = formatCode[format];
    return extra ? jsx.replace("<RollingNumber", `<RollingNumber ${extra}`) : jsx;
  },
  propsTable: propDocs<RollingNumberProps>()([
    { name: "value", type: "number", description: "The number to show. Change it and each place rolls.", required: true },
    { name: "format", type: "Intl.NumberFormatOptions", description: "Currency, percent, compact, fraction digits and more." },
    { name: "locale", type: "string", default: '"en-US"', description: "Fixed by default so server and client agree." },
    { name: "duration", type: "number", default: "0.6", description: "Seconds each digit takes to settle (spring)." },
    { name: "stagger", type: "number", default: "0.03", description: "Seconds between neighbouring places, starting from the last digit." },
    { name: "direction", type: '"auto" | "up" | "down"', default: '"auto"', description: "Roll with the change, or always one way." },
    { name: "bounce", type: "number", default: "0.2", description: "Spring bounce from 0 to 1." },
    { name: "announce", type: "boolean", default: "false", description: "Announce changes politely to screen readers." },
  ]),
  a11y: [
    "Screen readers read the formatted value from an sr-only copy; the digit wheels are aria-hidden.",
    "With announce, changes are spoken through aria-live=\"polite\".",
  ],
  reducedMotion: "Digits swap instantly; no rolling, blur or layout motion.",
};
export default item;
