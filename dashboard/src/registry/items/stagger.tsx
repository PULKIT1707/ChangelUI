import { Stagger, StaggerItem, type StaggerProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  preset: NonNullable<StaggerProps["preset"]>;
  stagger: number;
  duration: number;
  distance: number;
};

const defaults: DemoProps = { preset: "fade-up", stagger: 0.06, duration: 0.45, distance: 16 };

const controls: ControlSpec<DemoProps>[] = [
  {
    type: "select",
    prop: "preset",
    label: "Preset",
    options: ["fade", "fade-up", "fade-down", "fade-left", "fade-right", "blur", "scale"],
  },
  { type: "number", prop: "stagger", label: "Stagger (s)", min: 0.02, max: 0.3, step: 0.02 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.1, max: 1.5, step: 0.05 },
  { type: "number", prop: "distance", label: "Distance (px)", min: 0, max: 60, step: 4 },
];

const features = ["Tree-shakable entries", "Accessible by default", "Token-based theming", "Reduced-motion aware"];

function Preview({ props }: { props: DemoProps }) {
  return (
    <Stagger {...props} as="ul" className="flex w-72 flex-col gap-2">
      {features.map((feature) => (
        <StaggerItem
          key={feature}
          as="li"
          className="rounded-pui-md border border-pui-border bg-pui-surface px-4 py-2 text-sm text-pui-surface-foreground"
        >
          {feature}
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function Mini() {
  return (
    <Stagger trigger="mount" className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <StaggerItem key={i} preset="scale" className="size-6 rounded-pui-sm bg-pui-primary/70" />
      ))}
    </Stagger>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Stagger",
      { as: "ul", ...props },
      { ...defaults, as: "div" },
      '<StaggerItem as="li">First</StaggerItem>\n<StaggerItem as="li">Second</StaggerItem>',
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<StaggerProps>()([
    { name: "as", type: '"div" | "ul" | "ol" | "section"', default: '"div"', description: "Root tag; lists get the list reset." },
    { name: "preset", type: "RevealPreset", default: '"fade-up"', description: "Inherited by items (StaggerItem preset overrides)." },
    { name: "stagger", type: "number", default: "0.06", description: "Seconds between items." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first item." },
    { name: "duration", type: "number", default: "0.45", description: "Seconds per item." },
    { name: "distance", type: "number", default: "16", description: "Travel in px for directional presets." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the sequence runs." },
    { name: "once", type: "boolean", default: "true", description: "Animate only the first time." },
    { name: "inViewMargin", type: "string", default: '"0px 0px -10% 0px"', description: "IntersectionObserver rootMargin." },
  ]),
  a11y: ['Use as="ul" with StaggerItem as="li" to keep list semantics.'],
  reducedMotion: "Items fade in over 150ms without movement or stagger.",
};

export default item;
