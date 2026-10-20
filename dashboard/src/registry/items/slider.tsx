import { RangeSlider, Slider, type RangeSliderProps, type SliderMark, type SliderProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  min: number;
  max: number;
  step: number;
  size: NonNullable<SliderProps["size"]>;
  tone: NonNullable<SliderProps["tone"]>;
  showValue: NonNullable<SliderProps["showValue"]>;
  disabled: boolean;
  range: boolean;
  marks: "none" | "ticks" | "labels";
};

const defaults: DemoProps = {
  min: 0,
  max: 100,
  step: 1,
  size: "md",
  tone: "primary",
  showValue: "active",
  disabled: false,
  range: false,
  marks: "none",
};

/** Five evenly spaced marks between min and max, optionally labelled. */
function demoMarks(min: number, max: number, kind: DemoProps["marks"]): SliderMark[] | undefined {
  if (kind === "none") return undefined;
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const value = Math.round(min + t * (max - min));
    return kind === "labels" ? { value, label: `${value}%` } : value;
  });
}

function Preview({ props }: { props: DemoProps }) {
  const { range, marks: markKind, ...rest } = props;
  const [committed, setCommitted] = useState<string | null>(null);
  const marks = demoMarks(props.min, props.max, markKind);
  const format = (v: number) => `${v}%`;
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 pt-6 text-sm">
      {range ? (
        <RangeSlider
          key="range"
          aria-label="Price range"
          defaultValue={[25, 75]}
          {...rest}
          marks={marks}
          onValueCommit={([a, b]) => setCommitted(`${a}–${b}`)}
          formatValue={format}
        />
      ) : (
        <Slider
          key="single"
          aria-label="Volume"
          defaultValue={40}
          {...rest}
          marks={marks}
          onValueCommit={(v) => setCommitted(String(v))}
          formatValue={format}
        />
      )}
      <span className="text-xs text-pui-muted-foreground">Last committed: {committed ?? "none"}</span>
    </div>
  );
}

function Mini() {
  return (
    <RangeSlider
      aria-label="Price range"
      defaultValue={[30, 70]}
      className="w-40"
      showValue="never"
      marks={[0, 25, 50, 75, 100]}
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "number", prop: "min", label: "Min", min: 0, max: 50, step: 5 },
    { type: "number", prop: "max", label: "Max", min: 60, max: 200, step: 10 },
    { type: "number", prop: "step", label: "Step", min: 1, max: 20, step: 1 },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "showValue", label: "Show value", options: ["never", "active", "always"] },
    { type: "boolean", prop: "disabled", label: "Disabled" },
    { type: "boolean", prop: "range", label: "Range" },
    { type: "select", prop: "marks", label: "Marks", options: ["none", "ticks", "labels"] },
  ],
  snippet: ({ range, marks, ...props }) => {
    const markProp =
      marks === "none"
        ? undefined
        : marks === "ticks"
          ? [0, 25, 50, 75, 100]
          : [{ value: 0, label: "0%" }, { value: 50, label: "50%" }, { value: 100, label: "100%" }];
    const base = { min: 0, max: 100, step: 1, size: "md", tone: "primary", showValue: "active", disabled: false };
    return range
      ? toJsx<Record<string, unknown>>(
          "RangeSlider",
          { "aria-label": "Price range", defaultValue: [25, 75], ...props, marks: markProp },
          base,
        )
      : toJsx<Record<string, unknown>>("Slider", { "aria-label": "Volume", defaultValue: 40, ...props, marks: markProp }, base);
  },
  propsTable: propDocs<SliderProps & Pick<RangeSliderProps, "minStepsBetweenThumbs" | "thumbLabels">>()([
    { name: "value", type: "number | [number, number]", description: "Controlled value (a pair for RangeSlider)." },
    { name: "defaultValue", type: "number | [number, number]", default: "min / [min, max]", description: "Uncontrolled initial value." },
    { name: "onValueChange", type: "(value) => void", description: "Called on every change." },
    { name: "onValueCommit", type: "(value) => void", description: "Pointer up, or a keydown that changes the value." },
    { name: "min", type: "number", default: "0", description: "Lower bound." },
    { name: "max", type: "number", default: "100", description: "Upper bound." },
    { name: "step", type: "number", default: "1", description: "Arrow-key step (<= 0 becomes 1)." },
    { name: "largeStep", type: "number", default: "10 * step", description: "PageUp / PageDown step." },
    { name: "showValue", type: '"never" | "active" | "always"', default: '"active"', description: "Value bubble." },
    { name: "formatValue", type: "(value: number) => string", description: "Bubble text and aria-valuetext." },
    { name: "name", type: "string", description: "Renders a hidden input for forms (two for RangeSlider)." },
    {
      name: "marks",
      type: "Array<number | { value: number; label?: ReactNode }>",
      description: "Decorative tick dots on the track; labelled marks also show their label below it.",
    },
    { name: "snapToMarks", type: "boolean", default: "false", description: "Pointer and keys move between marks only." },
    { name: "minStepsBetweenThumbs", type: "number", default: "0", description: "RangeSlider: minimum gap, in steps." },
    { name: "thumbLabels", type: "[string, string]", default: '["Minimum", "Maximum"]', description: "RangeSlider: thumb names." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "± step (next / previous mark with snapToMarks)" },
    { keys: "PageUp / PageDown", action: "± largeStep" },
    { keys: "Home / End", action: "min / max (a range thumb stops at the other thumb)" },
  ],
  a11y: [
    'The thumb is role="slider" and receives aria-label / aria-labelledby / aria-describedby.',
    'RangeSlider is a role="group" with two named thumbs; each thumb\'s aria-valuemin/max stop at the other thumb.',
    "Marks are aria-hidden decoration; the value is always announced by the thumb.",
  ],
  reducedMotion: "The value bubble appears without movement.",
};

export default item;
