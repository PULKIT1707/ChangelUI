import { Button, Magnetic, type MagneticProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  strength: number;
  distance: number;
  disabled: boolean;
};

const defaults: DemoProps = { strength: 0.3, distance: 100, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "strength", label: "Strength", min: 0.1, max: 1, step: 0.05 },
  { type: "number", prop: "distance", label: "Distance (px)", min: 20, max: 300, step: 10 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex h-48 items-center justify-center">
      <Magnetic {...props}>
        <Button>Hover near me</Button>
      </Magnetic>
    </div>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoPointer(ref, "window");
  return (
    <div ref={ref} className="flex h-20 w-36 items-center justify-center">
      <Magnetic strength={0.4}>
        <Button size="sm">Magnetic</Button>
      </Magnetic>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Magnetic", props, defaults, "<Button>Hover near me</Button>", controls),
  propsTable: propDocs<MagneticProps>()([
    { name: "children", type: "ReactNode", description: "Content to pull (inline-block wrapper)." },
    { name: "strength", type: "number", default: "0.3", description: "Fraction of the pointer offset to follow." },
    { name: "distance", type: "number", default: "100", description: "Activation distance in px from the element's edge." },
    { name: "disabled", type: "boolean", default: "false", description: "Turns the effect off." },
  ]),
  a11y: ["Purely visual; the child keeps its own semantics and focus behavior."],
  reducedMotion: "Disabled (also for coarse pointers).",
};

export default item;
