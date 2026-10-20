import { Spinner, type SpinnerProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<SpinnerProps["variant"]>;
  size: NonNullable<SpinnerProps["size"]>;
  label: string;
};

const defaults: DemoProps = { variant: "ring", size: "lg", label: "Loading" };
const variants = ["ring", "dots", "bars", "pulse"] as const;

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Spinner {...props} className="text-pui-primary" />
      <div className="flex items-center gap-6 text-pui-muted-foreground">
        {variants.map((variant) => (
          <Spinner key={variant} variant={variant} size={props.size} label={`Loading (${variant})`} />
        ))}
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex gap-3 text-pui-primary">
      <Spinner />
      <Spinner variant="dots" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: variants },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "text", prop: "label", label: "Label", maxLength: 30 },
  ],
  snippet: (props) => toJsx<Record<string, unknown>>("Spinner", props, { variant: "ring", size: "md", label: "Loading" }),
  propsTable: propDocs<SpinnerProps>()([
    { name: "variant", type: '"ring" | "dots" | "bars" | "pulse"', default: '"ring"', description: "Indicator style." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "16 / 20 / 24 px." },
    { name: "label", type: "string", default: '"Loading"', description: 'sr-only text in a role="status" node.' },
    { name: "decorative", type: "boolean", default: "false", description: "aria-hidden with no role (inside labelled controls)." },
  ]),
  a11y: ['role="status" with a sr-only label unless decorative.', "Color is currentColor."],
  reducedMotion: "Keeps animating (essential feedback) at 1.5 s per cycle.",
};

export default item;
