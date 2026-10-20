import { NumberTicker, type NumberTickerProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  value: number;
  from: number;
  decimals: number;
  duration: number;
};

const defaults: DemoProps = { value: 12840, from: 0, decimals: 0, duration: 1.2 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "value", label: "Value", min: 0, max: 100000, step: 10 },
  { type: "number", prop: "from", label: "From", min: 0, max: 100000, step: 10 },
  { type: "number", prop: "decimals", label: "Decimals", min: 0, max: 3, step: 1 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 4, step: 0.1 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <NumberTicker {...props} className="text-5xl font-bold tracking-tight text-pui-foreground" />
      <span className="text-sm text-pui-muted-foreground">downloads this week</span>
    </div>
  );
}

function Mini() {
  return <NumberTicker value={4096} className="text-3xl font-bold text-pui-foreground" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  // value is required, so it is always printed.
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "NumberTicker",
      props,
      { ...defaults, value: undefined },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<NumberTickerProps>()([
    { name: "value", type: "number", description: "Target value.", required: true },
    { name: "from", type: "number", default: "0", description: "Start value." },
    { name: "decimals", type: "number", default: "0", description: "Fraction digits." },
    { name: "locale", type: "string", default: '"en-US"', description: "Fixed by default so server and client agree." },
    { name: "formatOptions", type: "Intl.NumberFormatOptions", description: "Spread after the decimals options." },
    { name: "duration", type: "number", default: "1.2", description: "Seconds (spring without bounce)." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When counting starts." },
    { name: "once", type: "boolean", default: "true", description: "Count only the first time it enters the viewport." },
    { name: "delay", type: "number", default: "0", description: "Seconds before counting." },
    { name: "onComplete", type: "() => void", description: "Called when the count settles." },
  ]),
  a11y: ["Screen readers read the final value from an sr-only copy; the counting digits are aria-hidden."],
  reducedMotion: "The final value renders immediately.",
};

export default item;
