import { Chip, type ChipProps } from "changelui";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<ChipProps["variant"]>;
  tone: NonNullable<ChipProps["tone"]>;
  size: NonNullable<ChipProps["size"]>;
  selectable: boolean;
  removable: boolean;
};

const defaults: DemoProps = { variant: "soft", tone: "primary", size: "md", selectable: true, removable: true };
const initial = ["React", "TypeScript", "Tailwind", "Motion"];

function Preview({ props }: { props: DemoProps }) {
  const [items, setItems] = useState(initial);
  return (
    <div className="flex max-w-md flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((name) => (
            <Chip
              key={name}
              variant={props.variant}
              tone={props.tone}
              size={props.size}
              defaultSelected={props.selectable ? name === "React" : undefined}
              onRemove={props.removable ? () => setItems((list) => list.filter((n) => n !== name)) : undefined}
              removeLabel={`Remove ${name}`}
            >
              {name}
            </Chip>
          ))}
        </AnimatePresence>
      </div>
      {items.length < initial.length ? (
        <button type="button" className="text-xs text-pui-muted-foreground underline" onClick={() => setItems(initial)}>
          Reset chips
        </button>
      ) : null}
    </div>
  );
}

function Mini() {
  return (
    <div className="flex gap-2">
      <Chip tone="primary" defaultSelected>
        React
      </Chip>
      <Chip onRemove={() => {}} removeLabel="Remove Vue">
        Vue
      </Chip>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["solid", "soft", "outline"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
    { type: "boolean", prop: "selectable", label: "Selectable" },
    { type: "boolean", prop: "removable", label: "Removable" },
  ],
  snippet: ({ selectable, removable, ...props }) => {
    const jsx = toJsx<Record<string, unknown>>(
      "Chip",
      { ...props, defaultSelected: selectable ? true : undefined },
      { variant: "soft", tone: "neutral", size: "md" },
      "React",
    );
    return removable ? jsx.replace("<Chip", '<Chip onRemove={remove} removeLabel="Remove React"') : jsx;
  },
  propsTable: propDocs<ChipProps>()([
    { name: "variant", type: '"solid" | "soft" | "outline"', default: '"soft"', description: "Visual treatment when not selected." },
    { name: "tone", type: "Tone", default: '"neutral"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Height and text size." },
    { name: "icon", type: "ReactNode", description: "Leading icon." },
    { name: "selected", type: "boolean", description: "Controlled toggle state (any selected prop makes the chip a toggle)." },
    { name: "defaultSelected", type: "boolean", description: "Uncontrolled initial toggle state." },
    { name: "onSelectedChange", type: "(selected: boolean) => void", description: "Called when the toggle changes." },
    { name: "onRemove", type: "() => void", description: "Renders a remove button; Backspace/Delete also removes." },
    { name: "removeLabel", type: "string", default: '"Remove"', description: 'Remove button name, e.g. "Remove React".' },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the chip's buttons." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Toggle a selectable chip" },
    { keys: "Backspace / Delete", action: "Remove (when removable)" },
  ],
  a11y: [
    "Selectable chips are toggle buttons with aria-pressed.",
    'Selectable + removable renders role="group" with two sibling buttons, never nested buttons.',
  ],
  reducedMotion: "Layout and exit animations are instant.",
};

export default item;
