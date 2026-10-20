import { useClickOutside, type UseClickOutsideOptions } from "changelui";
import { useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { enabled: boolean; event: "pointerdown" | "click" };

function Preview({ props }: { props: DemoProps }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useClickOutside(ref, () => setCount((n) => n + 1), { enabled: props.enabled, event: props.event });
  return (
    <div className="flex flex-col items-center gap-3 text-sm">
      <div
        ref={ref}
        className="rounded-pui-lg border border-pui-border bg-pui-surface px-6 py-4 text-pui-surface-foreground shadow-pui-sm"
      >
        Clicks inside are ignored
      </div>
      <p aria-live="polite" className="text-pui-muted-foreground">
        Outside clicks: <span className="font-medium text-pui-foreground tabular-nums">{count}</span>
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div className="rounded-pui-md border border-dashed border-pui-input px-3 py-2 text-xs text-pui-muted-foreground">
      outside ↗
    </div>
  );
}

const defaults: DemoProps = { enabled: true, event: "pointerdown" };

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "boolean", prop: "enabled", label: "Enabled" },
    { type: "select", prop: "event", label: "Event", options: ["pointerdown", "click"] },
  ],
  snippet: (props) => {
    const opts = [
      props.enabled ? null : "enabled: false",
      props.event === "pointerdown" ? null : `event: "${props.event}"`,
    ].filter(Boolean);
    const third = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";
    return `const ref = useRef<HTMLDivElement>(null);\nuseClickOutside(ref, () => setOpen(false)${third});`;
  },
  propsTable: [
    { name: "refs", type: "RefObject<HTMLElement | null> | RefObject[]", description: "Elements that count as inside.", required: true },
    { name: "handler", type: "(event: PointerEvent) => void", description: "Called on an outside pointer event.", required: true },
    ...propDocs<UseClickOutsideOptions>()([
      { name: "enabled", type: "boolean", default: "true", description: "Attach the listener." },
      { name: "event", type: '"pointerdown" | "click"', default: '"pointerdown"', description: "Which event counts as a click." },
    ]),
  ],
  a11y: ["Pair with an Escape handler; outside clicks alone are not keyboard accessible."],
};

export default item;
