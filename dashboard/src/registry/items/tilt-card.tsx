import { TiltCard, type TiltCardProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  maxTilt: number;
  perspective: number;
  scale: number;
  glare: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { maxTilt: 10, perspective: 1000, scale: 1.02, glare: true, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "maxTilt", label: "Max tilt (deg)", min: 2, max: 30, step: 1 },
  { type: "number", prop: "perspective", label: "Perspective (px)", min: 300, max: 2000, step: 100 },
  { type: "number", prop: "scale", label: "Hover scale", min: 1, max: 1.1, step: 0.01 },
  { type: "boolean", prop: "glare", label: "Glare" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <TiltCard
      {...props}
      className="flex h-44 w-72 flex-col justify-end rounded-pui-xl border border-pui-border bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 p-5 text-pui-primary-foreground shadow-pui-lg"
    >
      <span className="text-lg font-semibold">Tilt card</span>
      <span className="text-sm opacity-80">Follows your pointer in 3D.</span>
    </TiltCard>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoPointer(ref);
  return (
    <TiltCard
      ref={ref}
      maxTilt={14}
      className="h-20 w-32 rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 shadow-pui-md"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("TiltCard", props, defaults, "...", controls),
  propsTable: propDocs<TiltCardProps>()([
    { name: "maxTilt", type: "number", default: "10", description: "Maximum rotation in degrees." },
    { name: "perspective", type: "number", default: "1000", description: "Perspective in px." },
    { name: "scale", type: "number", default: "1.02", description: "Scale while hovered." },
    { name: "glare", type: "boolean", default: "true", description: "Glare highlight following the pointer." },
    { name: "disabled", type: "boolean", default: "false", description: "Turns the effect off." },
  ]),
  a11y: ["Purely visual; content and focus order are unchanged."],
  reducedMotion: "Disabled (also for touch pointers).",
};

export default item;
