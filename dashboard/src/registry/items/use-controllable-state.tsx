import { useControllableState, type UseControllableStateParams } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { controlled: boolean };

function Counter({ value, onChange }: { value?: number; onChange?: (value: number) => void }) {
  const [count, setCount] = useControllableState({ value, defaultValue: 0, onChange, name: "count" });
  return (
    <button
      type="button"
      onClick={() => setCount((n) => n + 1)}
      className="rounded-pui-md bg-pui-primary px-4 py-2 text-sm font-medium text-pui-primary-foreground outline-pui-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Count: <span className="tabular-nums">{count}</span>
    </button>
  );
}

function ControlledCounter() {
  const [value, setValue] = useState(10);
  return (
    <div className="flex flex-col items-center gap-2">
      <Counter value={value} onChange={setValue} />
      <span className="text-xs text-pui-muted-foreground">Parent state: {value}</span>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return props.controlled ? <ControlledCounter /> : <Counter />;
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">value ⇄ defaultValue</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults: { controlled: false },
  controls: [{ type: "boolean", prop: "controlled", label: "Controlled by parent" }],
  snippet: () =>
    "const [value, setValue] = useControllableState({\n  value: props.value,\n  defaultValue: 0,\n  onChange: props.onValueChange,\n});",
  propsTable: propDocs<UseControllableStateParams<unknown>>()([
    { name: "value", type: "T", description: "Controlled value; controlled when not undefined (null is a value)." },
    { name: "defaultValue", type: "T | (() => T)", description: "Initial uncontrolled value.", required: true },
    { name: "onChange", type: "(value: T) => void", description: "Called by the setter only, and only when the value changes." },
    { name: "name", type: "string", default: '"value"', description: "Used in the development warning on a mode switch." },
  ]),
};

export default item;
