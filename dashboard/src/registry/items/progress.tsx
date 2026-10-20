import { CircularProgress, Progress, type CircularProgressProps, type ProgressProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  value: number;
  indeterminate: boolean;
  tone: NonNullable<ProgressProps["tone"]>;
  size: NonNullable<ProgressProps["size"]>;
  showValue: boolean;
  striped: boolean;
};

const defaults: DemoProps = { value: 64, indeterminate: false, tone: "primary", size: "md", showValue: true, striped: false };

function Preview({ props }: { props: DemoProps }) {
  const value = props.indeterminate ? null : props.value;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <Progress value={value} tone={props.tone} size={props.size} showValue={props.showValue} striped={props.striped} label="Upload" />
      <CircularProgress value={value} tone={props.tone} size={props.size} showValue={props.showValue} label="Upload" />
    </div>
  );
}

function Mini() {
  return (
    <div className="flex w-40 items-center gap-3">
      <Progress value={64} size="sm" />
      <CircularProgress value={64} size="sm" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "number", prop: "value", label: "Value", min: 0, max: 100, step: 1 },
    { type: "boolean", prop: "indeterminate", label: "Indeterminate" },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "boolean", prop: "showValue", label: "Show value" },
    { type: "boolean", prop: "striped", label: "Striped" },
  ],
  snippet: ({ indeterminate, value, ...props }) => {
    const common = { value: indeterminate ? undefined : value, ...props };
    const base = { tone: "primary", size: "md", showValue: false, striped: false };
    const { striped, ...circular } = common;
    return [
      toJsx<Record<string, unknown>>("Progress", { ...common, striped }, base),
      toJsx<Record<string, unknown>>("CircularProgress", circular, base),
    ].join("\n");
  },
  propsTable: propDocs<ProgressProps & CircularProgressProps>()([
    { name: "value", type: "number | null", description: "null / undefined is indeterminate; clamped to [0, max]." },
    { name: "max", type: "number", default: "100", description: "Upper bound." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Track 4/8/12 px; ring 32/48/64 px." },
    { name: "showValue", type: "boolean", default: "false", description: "Show the formatted value." },
    { name: "formatValue", type: "(value, max) => string", default: "percent", description: "Display and aria-valuetext." },
    { name: "striped", type: "boolean", default: "false", description: "Progress only: animated stripes." },
    { name: "label", type: "string", default: '"Progress"', description: "Accessible name unless aria-labelledby is passed." },
    { name: "thickness", type: "number", description: "CircularProgress stroke width (sm 3, md 4, lg 5)." },
  ]),
  a11y: ['role="progressbar" with aria-valuenow/valuetext; omitted values mean indeterminate.', "Always named (label defaults to Progress)."],
  reducedMotion: "Indeterminate shows a static 40% segment; stripes stop.",
};

export default item;
