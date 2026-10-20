import { Checkbox, type CheckboxProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<CheckboxProps["size"]>;
  tone: NonNullable<CheckboxProps["tone"]>;
  disabled: boolean;
};

const defaults: DemoProps = { size: "md", tone: "primary", disabled: false };
const toppings = ["Cheese", "Basil", "Olives"];

function Preview({ props }: { props: DemoProps }) {
  const [picked, setPicked] = useState<string[]>(["Cheese"]);
  const all = picked.length === toppings.length ? true : picked.length === 0 ? false : "indeterminate";
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <Checkbox {...props} checked={all} onCheckedChange={(on) => setPicked(on ? toppings : [])} />
        All toppings
      </label>
      <div className="flex flex-col gap-2 ps-6">
        {toppings.map((name) => (
          <label key={name} className="flex items-center gap-2">
            <Checkbox
              {...props}
              checked={picked.includes(name)}
              onCheckedChange={(on) => setPicked((list) => (on ? [...list, name] : list.filter((n) => n !== name)))}
            />
            {name}
          </label>
        ))}
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex gap-2">
      <Checkbox aria-label="Checked" defaultChecked />
      <Checkbox aria-label="Mixed" defaultChecked="indeterminate" />
      <Checkbox aria-label="Unchecked" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "boolean", prop: "disabled", label: "Disabled" },
  ],
  snippet: (props) =>
    `<label>\n  ${toJsx<Record<string, unknown>>("Checkbox", { ...props, defaultChecked: true }, defaults)}\n  Accept terms\n</label>`,
  propsTable: propDocs<CheckboxProps>()([
    { name: "checked", type: 'boolean | "indeterminate"', description: "Controlled state." },
    { name: "defaultChecked", type: 'boolean | "indeterminate"', default: "false", description: "Uncontrolled initial state." },
    { name: "onCheckedChange", type: "(checked: boolean) => void", description: "User actions always yield a boolean." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "14 / 16 / 20 px box." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Checked color." },
    { name: "name", type: "string", description: "Renders a hidden checkbox input for forms." },
    { name: "value", type: "string", default: '"on"', description: "Submitted value when checked." },
    { name: "required", type: "boolean", description: "aria-required and native required on the hidden input." },
  ]),
  keyboard: [{ keys: "Space", action: "Toggle (Enter does not toggle, like a native checkbox)" }],
  a11y: ['role="checkbox" with aria-checked true/false/"mixed".', "Label it with a wrapping <label>, htmlFor, aria-label or aria-labelledby."],
  reducedMotion: "The check mark appears without drawing.",
};

export default item;
