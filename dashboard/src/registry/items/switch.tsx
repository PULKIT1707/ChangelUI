import { Switch, type SwitchProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<SwitchProps["size"]>;
  tone: NonNullable<SwitchProps["tone"]>;
  disabled: boolean;
};

const defaults: DemoProps = { size: "md", tone: "primary", disabled: false };

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center justify-between gap-6">
        Airplane mode
        <Switch {...props} />
      </label>
      <label className="flex items-center justify-between gap-6">
        Notifications
        <Switch {...props} defaultChecked />
      </label>
    </div>
  );
}

function Mini() {
  return <Switch aria-label="Demo switch" defaultChecked />;
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
  snippet: (props) => `<label>\n  Airplane mode\n  ${toJsx<Record<string, unknown>>("Switch", props, defaults)}\n</label>`,
  propsTable: propDocs<SwitchProps>()([
    { name: "checked", type: "boolean", description: "Controlled state." },
    { name: "defaultChecked", type: "boolean", default: "false", description: "Uncontrolled initial state." },
    { name: "onCheckedChange", type: "(checked: boolean) => void", description: "Called on toggle." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Track size." },
    { name: "tone", type: "Tone", default: '"primary"', description: "On color." },
    { name: "name", type: "string", description: "Renders a hidden checkbox input for forms." },
    { name: "value", type: "string", default: '"on"', description: "Submitted value when on." },
    { name: "thumbIcon", type: "ReactNode", description: "Content inside the thumb." },
  ]),
  keyboard: [{ keys: "Space / Enter", action: "Toggle" }],
  a11y: ['role="switch" with aria-checked.', "Label it with a wrapping <label>, htmlFor, aria-label or aria-labelledby."],
  reducedMotion: "The thumb moves without the spring.",
};

export default item;
