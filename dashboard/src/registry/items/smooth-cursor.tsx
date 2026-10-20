import { SmoothCursor, type SmoothCursorProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  cursorSize: number;
  hideNativeCursor: boolean;
  rotate: boolean;
};

const defaults: DemoProps = { cursorSize: 20, hideNativeCursor: true, rotate: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "cursorSize", label: "Cursor size", min: 8, max: 48, step: 2 },
  { type: "boolean", prop: "hideNativeCursor", label: "Hide native cursor" },
  { type: "boolean", prop: "rotate", label: "Rotate" },
];

const targets = ["Hover", "Follow", "Glide"];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative flex h-72 w-full max-w-xl flex-col items-center justify-center gap-6 overflow-hidden rounded-pui-xl border border-dashed border-pui-input bg-pui-surface text-pui-surface-foreground">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="m-0 text-base font-semibold">Move your pointer here</p>
        <p className="m-0 text-sm text-pui-muted-foreground">The cursor follows on a spring and stays inside this box.</p>
      </div>
      <div className="flex gap-3">
        {targets.map((label) => (
          <span
            key={label}
            className="rounded-pui-lg border border-pui-border bg-pui-background px-4 py-2 text-sm font-medium shadow-pui-sm transition-colors hover:border-pui-ring hover:bg-pui-muted"
          >
            {label}
          </span>
        ))}
      </div>
      <SmoothCursor {...props} />
    </div>
  );
}

function Mini() {
  return (
    <div className="relative flex size-20 items-center justify-center">
      <span className="absolute size-5 rounded-pui-full border-2 border-pui-foreground/70" />
      <span className="size-1.5 rounded-pui-full bg-pui-foreground" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("SmoothCursor", props, defaults, undefined, controls),
  propsTable: propDocs<SmoothCursorProps>()([
    { name: "scope", type: '"parent" | "window"', default: '"parent"', description: "Area where the cursor is active." },
    { name: "hideNativeCursor", type: "boolean", default: "true", description: "Hide the system cursor in the scope (restored on unmount)." },
    { name: "cursorSize", type: "number", default: "20", description: "Cursor size in px." },
    { name: "spring", type: "SpringOptions", default: "{ stiffness: 400, damping: 40, mass: 0.6 }", description: "Follow spring." },
    { name: "rotate", type: "boolean", default: "false", description: "Rotate toward the direction of travel." },
    { name: "children", type: "ReactNode", description: "Custom cursor visual." },
    { name: "className", type: "string", description: "Classes for the cursor element." },
  ]),
  a11y: ["Decorative and aria-hidden. Only active with a fine pointer; touch and keyboard users keep the native behavior."],
  reducedMotion: "Renders nothing and keeps the native cursor.",
};

export default item;
