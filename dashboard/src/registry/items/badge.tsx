import { Badge, type BadgeProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<BadgeProps["variant"]>;
  tone: NonNullable<BadgeProps["tone"]>;
  size: NonNullable<BadgeProps["size"]>;
  dot: boolean;
  pulse: boolean;
  label: string;
};

const defaults: DemoProps = { variant: "soft", tone: "success", size: "sm", dot: true, pulse: true, label: "Live" };
const tones = ["neutral", "primary", "success", "warning", "danger", "info"] as const;

function Preview({ props }: { props: DemoProps }) {
  const { label, ...rest } = props;
  return (
    <div className="flex flex-col items-center gap-4">
      <Badge {...rest}>{label}</Badge>
      <div className="flex flex-wrap justify-center gap-2">
        {tones.map((tone) => (
          <Badge key={tone} tone={tone} variant={props.variant} size={props.size}>
            {tone}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex gap-2">
      <Badge tone="success" dot>
        Live
      </Badge>
      <Badge tone="primary" variant="solid">
        New
      </Badge>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["solid", "soft", "outline"] },
    { type: "select", prop: "tone", label: "Tone", options: tones },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
    { type: "boolean", prop: "dot", label: "Dot" },
    { type: "boolean", prop: "pulse", label: "Pulse" },
    { type: "text", prop: "label", label: "Label", maxLength: 24 },
  ],
  snippet: ({ label, ...props }) =>
    toJsx<Record<string, unknown>>("Badge", props, { variant: "soft", tone: "neutral", size: "sm", dot: false, pulse: false }, label),
  propsTable: propDocs<BadgeProps>()([
    { name: "variant", type: '"solid" | "soft" | "outline"', default: '"soft"', description: "Visual treatment." },
    { name: "tone", type: "Tone", default: '"neutral"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md"', default: '"sm"', description: "Height and text size." },
    { name: "dot", type: "boolean", default: "false", description: "Leading status dot." },
    { name: "pulse", type: "boolean", default: "false", description: "The dot pings (motion-safe only)." },
  ]),
  a11y: ["The dot is decorative; put the meaning in the label text."],
  reducedMotion: "The dot does not ping.",
};

export default item;
