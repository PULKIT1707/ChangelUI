import { cn, type ClassValue } from "changelui";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type CnDemoProps = { base: string; override: string };

const defaults: CnDemoProps = {
  base: "px-2 py-1 rounded-pui-sm bg-pui-muted",
  override: "px-4 rounded-pui-lg",
};

function Preview({ props }: { props: CnDemoProps }) {
  const merged = cn(props.base, props.override);
  return (
    <div className="flex w-full max-w-md flex-col gap-3 text-sm">
      <code className="rounded-pui-md bg-pui-muted px-3 py-2 font-mono text-xs">
        cn({JSON.stringify(props.base)}, {JSON.stringify(props.override)})
      </code>
      <code className="rounded-pui-md border border-pui-border px-3 py-2 font-mono text-xs" data-testid="cn-result">
        {JSON.stringify(merged)}
      </code>
      <span className={cn("self-start", merged)}>Merged classes applied</span>
    </div>
  );
}

function Mini() {
  return (
    <code className="rounded-pui-sm bg-pui-muted px-2 py-1 font-mono text-xs">{cn("p-2", "p-4")}</code>
  );
}

const item: ItemModule<CnDemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "text", prop: "base", label: "First input", maxLength: 60 },
    { type: "text", prop: "override", label: "Second input", maxLength: 60 },
  ],
  snippet: (props) =>
    `import { cn } from "changelui/cn";\n\ncn(${JSON.stringify(props.base)}, ${JSON.stringify(props.override)});`,
  propsTable: propDocs<{ inputs: ClassValue[] }>()([
    {
      name: "inputs",
      type: "ClassValue[]",
      description:
        "Class strings, arrays, objects or falsy values (clsx). Conflicting Tailwind classes resolve to the last one, including pui-* theme keys.",
      required: true,
    },
  ]),
  a11y: ["Pure function; no rendering or accessibility impact."],
};

export default item;
