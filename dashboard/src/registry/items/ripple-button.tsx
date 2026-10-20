import { RippleButton, type RippleButtonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<RippleButtonProps["variant"]>;
  tone: NonNullable<RippleButtonProps["tone"]>;
  size: NonNullable<RippleButtonProps["size"]>;
  duration: number;
  label: string;
};

const defaults: DemoProps = { variant: "solid", tone: "primary", size: "lg", duration: 0.6, label: "Click me" };

function Preview({ props }: { props: DemoProps }) {
  const { label, ...rest } = props;
  return <RippleButton {...rest}>{label}</RippleButton>;
}

function Mini() {
  return <RippleButton size="sm">Ripple</RippleButton>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["solid", "outline", "ghost", "soft"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 2, step: 0.1 },
    { type: "text", prop: "label", label: "Label", maxLength: 30 },
  ],
  snippet: ({ label, ...props }) =>
    toJsx<Record<string, unknown>>("RippleButton", props, { variant: "solid", tone: "primary", size: "md", duration: 0.6 }, label),
  propsTable: propDocs<RippleButtonProps>()([
    { name: "rippleColor", type: "string", default: '"currentColor"', description: "Ripple color at 25% opacity." },
    { name: "duration", type: "number", default: "0.6", description: "Seconds per ripple." },
    { name: "variant", type: "ButtonVariant", default: '"solid"', description: "All Button props apply, except asChild." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Activate (ripple from the center)" }],
  a11y: ["Ripples are aria-hidden decoration."],
  reducedMotion: "No ripple.",
};

export default item;
