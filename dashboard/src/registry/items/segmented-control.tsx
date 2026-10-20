import { SegmentedControl, SegmentedControlItem, type SegmentedControlProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { size: NonNullable<SegmentedControlProps["size"]>; fullWidth: boolean; disabled: boolean };

const defaults: DemoProps = { size: "md", fullWidth: false, disabled: false };
const views = ["Day", "Week", "Month", "Year"];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-md justify-center">
      <SegmentedControl aria-label="Calendar view" defaultValue="Week" {...props}>
        {views.map((view) => (
          <SegmentedControlItem key={view} value={view}>
            {view}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}

function Mini() {
  return (
    <SegmentedControl aria-label="View" defaultValue="list" size="sm">
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
    </SegmentedControl>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "boolean", prop: "fullWidth", label: "Full width" },
    { type: "boolean", prop: "disabled", label: "Disabled" },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "SegmentedControl",
      { "aria-label": "Calendar view", defaultValue: "Week", ...props },
      defaults,
      views.map((view) => `<SegmentedControlItem value="${view}">${view}</SegmentedControlItem>`).join("\n"),
    ),
  propsTable: propDocs<SegmentedControlProps>()([
    { name: "value", type: "string", description: "Controlled selection." },
    { name: "defaultValue", type: "string", description: "Uncontrolled initial selection; none selects nothing." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called on selection." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "32 / 36 / 44 px high." },
    { name: "fullWidth", type: "boolean", default: "false", description: "Items share the container width." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every item." },
    { name: "loop", type: "boolean", default: "true", description: "Wrap arrow navigation." },
  ]),
  keyboard: [
    { keys: "Left / Right", action: "Move focus and select" },
    { keys: "Home / End", action: "First / last item" },
  ],
  a11y: ["Radiogroup semantics with one tab stop.", "Name it with aria-label or aria-labelledby."],
  reducedMotion: "The indicator jumps instead of sliding.",
};

export default item;
