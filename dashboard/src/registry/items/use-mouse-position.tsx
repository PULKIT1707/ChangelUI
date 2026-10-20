import { useMousePosition, type UseMousePositionOptions } from "changelui";
import { useRef } from "react";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { enabled: boolean };

function Preview({ props }: { props: DemoProps }) {
  const ref = useRef<HTMLDivElement>(null);
  const { elementX, elementY, isInside } = useMousePosition({ target: ref, enabled: props.enabled });
  return (
    <div
      ref={ref}
      className="relative flex h-40 w-full max-w-sm items-center justify-center overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm"
    >
      <span className="text-pui-muted-foreground tabular-nums">
        {isInside ? `${Math.round(elementX)}, ${Math.round(elementY)}` : "Move the pointer here"}
      </span>
      {isInside ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-3 -translate-1/2 rounded-pui-full bg-pui-primary"
          style={{ left: elementX, top: elementY }}
        />
      ) : null}
    </div>
  );
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">x, y</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults: { enabled: true },
  controls: [{ type: "boolean", prop: "enabled", label: "Enabled" }],
  snippet: () => "const ref = useRef<HTMLDivElement>(null);\nconst { elementX, elementY, isInside } = useMousePosition({ target: ref });",
  propsTable: propDocs<UseMousePositionOptions>()([
    { name: "target", type: "RefObject<HTMLElement | null>", description: "Element for elementX, elementY and isInside." },
    { name: "enabled", type: "boolean", default: "true", description: "Attach the pointermove listener." },
  ]),
  reducedMotion: "Position tracking is unaffected; effects built on it decide what to animate.",
};

export default item;
