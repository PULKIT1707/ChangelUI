import { RadioGroup, RadioGroupItem, type RadioGroupProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  orientation: NonNullable<RadioGroupProps["orientation"]>;
  size: NonNullable<RadioGroupProps["size"]>;
  tone: NonNullable<RadioGroupProps["tone"]>;
  disabled: boolean;
};

const defaults: DemoProps = { orientation: "vertical", size: "md", tone: "primary", disabled: false };
const plans = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team (soon)", disabled: true },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span id="plan-label" className="font-medium">
        Plan
      </span>
      <RadioGroup aria-labelledby="plan-label" defaultValue="pro" {...props}>
        {plans.map((plan) => (
          <label key={plan.value} className="flex items-center gap-2">
            <RadioGroupItem value={plan.value} disabled={plan.disabled} />
            {plan.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function Mini() {
  return (
    <RadioGroup aria-label="Plan" defaultValue="a" orientation="horizontal">
      <RadioGroupItem value="a" aria-label="A" />
      <RadioGroupItem value="b" aria-label="B" />
      <RadioGroupItem value="c" aria-label="C" />
    </RadioGroup>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "orientation", label: "Orientation", options: ["vertical", "horizontal"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "boolean", prop: "disabled", label: "Disabled" },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "RadioGroup",
      { "aria-label": "Plan", defaultValue: "pro", ...props },
      defaults,
      [
        "<label>",
        '  <RadioGroupItem value="free" /> Free',
        "</label>",
        "<label>",
        '  <RadioGroupItem value="pro" /> Pro',
        "</label>",
      ].join("\n"),
    ),
  propsTable: propDocs<RadioGroupProps>()([
    { name: "value", type: "string", description: "Controlled selection." },
    { name: "defaultValue", type: "string", description: "Uncontrolled initial selection." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called on selection." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"vertical"', description: "Layout and arrow keys." },
    { name: "loop", type: "boolean", default: "true", description: "Wrap arrow navigation." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every item." },
    { name: "required", type: "boolean", description: "aria-required." },
    { name: "name", type: "string", description: "Renders a hidden input for forms." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Item size." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Selected color." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Move focus and select, skipping disabled items" },
    { keys: "Home / End", action: "First / last item" },
    { keys: "Space", action: "Select the focused item" },
    { keys: "Tab", action: "Leave the group (one tab stop)" },
  ],
  a11y: ['role="radiogroup" with role="radio" items and a single tab stop.', "Name the group with aria-label or aria-labelledby."],
  reducedMotion: "The dot appears without the spring.",
};

export default item;
