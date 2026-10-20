import { CopyButton, type CopyButtonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  value: string;
  showLabel: boolean;
  variant: NonNullable<CopyButtonProps["variant"]>;
  size: NonNullable<CopyButtonProps["size"]>;
  timeoutMs: number;
};

const defaults: DemoProps = { value: "npm install changelui", showLabel: false, variant: "ghost", size: "md", timeoutMs: 2000 };

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface py-1 pl-3 pr-1">
      <code className="font-mono text-xs">{props.value}</code>
      <CopyButton {...props} />
    </div>
  );
}

function Mini() {
  return <CopyButton value="changelui" variant="outline" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "text", prop: "value", label: "Value", maxLength: 60 },
    { type: "boolean", prop: "showLabel", label: "Show label" },
    { type: "select", prop: "variant", label: "Variant", options: ["solid", "outline", "ghost", "soft"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "number", prop: "timeoutMs", label: "Timeout (ms)", min: 500, max: 5000, step: 500 },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>("CopyButton", props, { showLabel: false, variant: "ghost", size: "md", timeoutMs: 2000 }),
  propsTable: propDocs<CopyButtonProps>()([
    { name: "value", type: "string | (() => string)", description: "Text to copy, or a function called at click time.", required: true },
    { name: "timeoutMs", type: "number", default: "2000", description: "How long the copied or error state shows." },
    { name: "label", type: "string", default: '"Copy"', description: "Idle accessible name." },
    { name: "copiedLabel", type: "string", default: '"Copied"', description: "Name and announcement after a copy." },
    { name: "errorLabel", type: "string", default: '"Copy failed"', description: "Name and announcement on failure." },
    { name: "showLabel", type: "boolean", default: "false", description: "Icon plus text in a Button layout." },
    { name: "onCopied", type: "(value: string) => void", description: "Called after a successful copy." },
    { name: "onCopyError", type: "(error: Error) => void", description: "Called when every copy path fails." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Copy" }],
  a11y: ["The accessible name follows the state.", 'A sr-only role="status" node announces the result.'],
  reducedMotion: "The icon swap fades without scaling.",
};

export default item;
