import { Separator, type SeparatorProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { orientation: NonNullable<SeparatorProps["orientation"]>; decorative: boolean; label: string };

const defaults: DemoProps = { orientation: "horizontal", decorative: true, label: "OR" };

function Preview({ props }: { props: DemoProps }) {
  if (props.orientation === "vertical") {
    return (
      <div className="flex h-8 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" decorative={props.decorative} />
        <span>Components</span>
        <Separator orientation="vertical" decorative={props.decorative} />
        <span>Blog</span>
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-sm">
      <span>Continue with email</span>
      <Separator decorative={props.decorative} label={props.label || undefined} />
      <span>Continue with SSO</span>
    </div>
  );
}

function Mini() {
  return <Separator label="OR" className="w-40" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
    { type: "boolean", prop: "decorative", label: "Decorative" },
    { type: "text", prop: "label", label: "Label", maxLength: 20 },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Separator",
      { ...props, label: props.label && props.orientation === "horizontal" ? props.label : undefined },
      { orientation: "horizontal", decorative: true },
    ),
  propsTable: propDocs<SeparatorProps>()([
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Direction." },
    { name: "decorative", type: "boolean", default: "true", description: 'true: role="none"; false: role="separator" + aria-orientation.' },
    { name: "label", type: "ReactNode", description: "Centered text, horizontal only." },
  ]),
  a11y: ["Use decorative={false} when the divider separates meaningful sections."],
};

export default item;
