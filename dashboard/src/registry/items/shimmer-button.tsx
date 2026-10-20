import { ShimmerButton, type ShimmerButtonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<ShimmerButtonProps["size"]>;
  duration: number;
  shimmerSize: string;
  radius: string;
  label: string;
};

const defaults: DemoProps = { size: "md", duration: 3, shimmerSize: "0.05em", radius: "9999px", label: "Get early access" };

function Preview({ props }: { props: DemoProps }) {
  const { label, ...rest } = props;
  return <ShimmerButton {...rest}>{label}</ShimmerButton>;
}

function Mini() {
  return <ShimmerButton size="sm">Shimmer</ShimmerButton>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "number", prop: "duration", label: "Duration (s)", min: 1, max: 8, step: 0.5 },
    { type: "select", prop: "shimmerSize", label: "Shimmer size", options: ["0.05em", "0.1em", "0.15em"] },
    { type: "select", prop: "radius", label: "Radius", options: ["9999px", "12px", "4px"] },
    { type: "text", prop: "label", label: "Label", maxLength: 30 },
  ],
  snippet: ({ label, ...props }) => toJsx<Record<string, unknown>>("ShimmerButton", props, { ...defaults, label: undefined }, label),
  propsTable: propDocs<ShimmerButtonProps>()([
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height and padding." },
    { name: "shimmerColor", type: "string", default: '"var(--pui-shimmer)"', description: "Shimmer color." },
    { name: "shimmerSize", type: "string", default: '"0.05em"', description: "Width of the shimmering edge." },
    { name: "background", type: "string", default: '"var(--pui-shimmer-bg)"', description: "Button background." },
    { name: "radius", type: "string", default: '"9999px"', description: "Corner radius." },
    { name: "duration", type: "number", default: "3", description: "Seconds per sweep." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Activate" }],
  a11y: ["The shimmer layers are aria-hidden; the label is the accessible name."],
  reducedMotion: "Static button with no shimmer.",
};

export default item;
