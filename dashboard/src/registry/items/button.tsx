import { Button, type ButtonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<ButtonProps["variant"]>;
  tone: NonNullable<ButtonProps["tone"]>;
  size: NonNullable<ButtonProps["size"]>;
  loading: boolean;
  disabled: boolean;
  fullWidth: boolean;
  label: string;
};

const defaults: DemoProps = {
  variant: "solid",
  tone: "primary",
  size: "md",
  loading: false,
  disabled: false,
  fullWidth: false,
  label: "Get started",
};
const variants = ["solid", "outline", "ghost", "soft", "link"] as const;

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { label, ...rest } = props;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <Button {...rest} trailingIcon={<Arrow />} loadingText="Working">
        {label}
      </Button>
      <div className="flex flex-wrap justify-center gap-2">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} tone={props.tone} size={props.size}>
            {variant}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex gap-2">
      <Button size="sm">Primary</Button>
      <Button size="sm" variant="outline" tone="neutral">
        Outline
      </Button>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: variants },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "boolean", prop: "loading", label: "Loading" },
    { type: "boolean", prop: "disabled", label: "Disabled" },
    { type: "boolean", prop: "fullWidth", label: "Full width" },
    { type: "text", prop: "label", label: "Label", maxLength: 40 },
  ],
  snippet: ({ label, ...props }) =>
    toJsx<Record<string, unknown>>(
      "Button",
      props,
      { variant: "solid", tone: "primary", size: "md", loading: false, disabled: false, fullWidth: false },
      label,
    ),
  propsTable: propDocs<ButtonProps>()([
    { name: "variant", type: '"solid" | "outline" | "ghost" | "soft" | "link"', default: '"solid"', description: "Visual treatment." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "32 / 36 / 44 px high." },
    { name: "loading", type: "boolean", default: "false", description: "aria-busy + aria-disabled, suppresses onClick, shows a Spinner." },
    { name: "loadingText", type: "ReactNode", description: "Replaces the label while loading." },
    { name: "leadingIcon", type: "ReactNode", description: "Icon before the label." },
    { name: "trailingIcon", type: "ReactNode", description: "Icon after the label." },
    { name: "fullWidth", type: "boolean", default: "false", description: "Stretch to the container width." },
    { name: "asChild", type: "boolean", default: "false", description: "Render the single child (for example a link) with button styles." },
    { name: "type", type: '"button" | "submit" | "reset"', default: '"button"', description: "Native button type." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Activate" }],
  a11y: [
    "Loading keeps focus and announces busy state; clicks are ignored.",
    "asChild + disabled sets aria-disabled and tabIndex -1 and prevents clicks.",
  ],
  reducedMotion: "No press scale.",
};

export default item;
