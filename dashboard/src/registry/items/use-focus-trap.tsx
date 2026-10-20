import { useFocusTrap, type UseFocusTrapOptions } from "changelui";
import { useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { returnFocus: boolean };

const button =
  "rounded-pui-md border border-pui-input px-3 py-1.5 text-sm outline-pui-ring hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2";

function Preview({ props }: { props: DemoProps }) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, returnFocus: props.returnFocus });
  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" className={button} onClick={() => setActive(true)} disabled={active}>
        Activate trap
      </button>
      <div
        ref={ref}
        data-state={active ? "active" : "inactive"}
        className="flex max-w-full flex-wrap justify-center gap-2 rounded-pui-lg border border-pui-border p-3 data-[state=active]:border-pui-ring"
      >
        <input aria-label="Name" placeholder="Name" className={`${button} w-full sm:w-auto`} />
        <button type="button" className={button}>
          Save
        </button>
        <button type="button" className={button} onClick={() => setActive(false)}>
          Release
        </button>
      </div>
    </div>
  );
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">⇥ ↺ inside</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults: { returnFocus: true },
  controls: [{ type: "boolean", prop: "returnFocus", label: "Return focus" }],
  snippet: (props) =>
    `const ref = useRef<HTMLDivElement>(null);\nuseFocusTrap(ref, { active: open${props.returnFocus ? "" : ", returnFocus: false"} });`,
  propsTable: [
    { name: "containerRef", type: "RefObject<HTMLElement | null>", description: "The element that keeps focus.", required: true },
    ...propDocs<UseFocusTrapOptions>()([
      { name: "active", type: "boolean", default: "true", description: "Trap while true; deactivating returns focus." },
      {
        name: "initialFocus",
        type: 'RefObject | "first" | "container"',
        default: '"first"',
        description: "Where focus goes on activation: the ref, else [data-autofocus], else the first tabbable, else the container.",
      },
      {
        name: "returnFocus",
        type: "boolean | RefObject",
        default: "true",
        description: "Return focus to the previously focused element (or the ref) if it is still connected.",
      },
    ]),
  ],
  keyboard: [
    { keys: "Tab", action: "Moves to the next tabbable; wraps from last to first." },
    { keys: "Shift+Tab", action: "Moves to the previous tabbable; wraps from first to last." },
  ],
};

export default item;
