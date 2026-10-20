import { Kbd, type KbdProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { size: NonNullable<KbdProps["size"]>; keys: string };

const defaults: DemoProps = { size: "sm", keys: "⌘ K" };

function Preview({ props }: { props: DemoProps }) {
  const keys = props.keys.split(" ").filter(Boolean);
  return (
    <p className="flex items-center gap-1.5 text-sm text-pui-muted-foreground">
      Press
      {keys.map((key, i) => (
        <Kbd key={`${key}-${i}`} size={props.size}>
          {key}
        </Kbd>
      ))}
      to search
    </p>
  );
}

function Mini() {
  return (
    <span className="flex gap-1">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </span>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
    { type: "text", prop: "keys", label: "Keys (space separated)", maxLength: 20 },
  ],
  snippet: (props) =>
    props.keys
      .split(" ")
      .filter(Boolean)
      .map((key) => toJsx<Record<string, unknown>>("Kbd", { size: props.size }, { size: "sm" }, key).replace(/\n\s*/g, ""))
      .join("\n"),
  propsTable: propDocs<KbdProps>()([{ name: "size", type: '"sm" | "md"', default: '"sm"', description: "Height and text size." }]),
  a11y: ["Renders a native <kbd>; spell out platform symbols in surrounding text when needed."],
};

export default item;
