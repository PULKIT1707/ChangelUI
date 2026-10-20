import { Rating, type RatingProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  max: number;
  allowHalf: boolean;
  readOnly: boolean;
  clearable: boolean;
  size: NonNullable<RatingProps["size"]>;
  tone: NonNullable<RatingProps["tone"]>;
};

const defaults: DemoProps = { max: 5, allowHalf: true, readOnly: false, clearable: true, size: "lg", tone: "warning" };

function Preview({ props }: { props: DemoProps }) {
  return <Rating defaultValue={3.5} {...props} aria-label="Your rating" />;
}

function Mini() {
  return <Rating value={4} readOnly size="sm" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "number", prop: "max", label: "Max", min: 3, max: 10, step: 1 },
    { type: "boolean", prop: "allowHalf", label: "Half steps" },
    { type: "boolean", prop: "readOnly", label: "Read-only" },
    { type: "boolean", prop: "clearable", label: "Clearable" },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Rating",
      { defaultValue: 3.5, ...props },
      { max: 5, allowHalf: false, readOnly: false, clearable: true, size: "md", tone: "warning" },
    ),
  propsTable: propDocs<RatingProps>()([
    { name: "value", type: "number", description: "Controlled value." },
    { name: "defaultValue", type: "number", default: "0", description: "Uncontrolled initial value." },
    { name: "onValueChange", type: "(value: number) => void", description: "Called on change." },
    { name: "max", type: "number", default: "5", description: "Number of icons." },
    { name: "allowHalf", type: "boolean", default: "false", description: "0.5 steps (pointer x and arrow keys)." },
    { name: "readOnly", type: "boolean", default: "false", description: 'Display only: role="img".' },
    { name: "clearable", type: "boolean", default: "true", description: "Clicking the current value clears it." },
    { name: "icon", type: "ReactNode", default: "star", description: "Replaces the star." },
    { name: "name", type: "string", description: "Renders a hidden input for forms." },
    { name: "getLabel", type: "(value, max) => string", default: "`${v} of ${m} stars`", description: "aria-valuetext or read-only label." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "±1 (±0.5 with allowHalf)" },
    { keys: "Home / End", action: "0 / max" },
    { keys: "0-9", action: "Set the value directly" },
  ],
  a11y: ['Interactive: one role="slider" (default name "Rating").', 'Read-only: role="img" labelled by getLabel.'],
  reducedMotion: "Filled icons do not pop.",
};

export default item;
