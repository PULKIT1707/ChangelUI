import { useCopyToClipboard, type UseCopyToClipboardOptions } from "changelui";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { text: string; timeoutMs: number };

function Preview({ props }: { props: DemoProps }) {
  const { copy, copied, error } = useCopyToClipboard({ timeoutMs: props.timeoutMs });
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => void copy(props.text)}
        className="rounded-pui-md border border-pui-input px-4 py-2 font-medium outline-pui-ring hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {copied ? "Copied" : error ? "Copy failed" : "Copy text"}
      </button>
      <code className="font-mono text-xs text-pui-muted-foreground">{props.text}</code>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">copy() → copied</span>;
}

const defaults: DemoProps = { text: "npm install changelui", timeoutMs: 2000 };

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "text", prop: "text", label: "Text", maxLength: 60 },
    { type: "number", prop: "timeoutMs", label: "Timeout (ms)", min: 500, max: 5000, step: 500 },
  ],
  snippet: (props) =>
    `const { copy, copied } = useCopyToClipboard(${props.timeoutMs === 2000 ? "" : `{ timeoutMs: ${props.timeoutMs} }`});\n\n<button onClick={() => copy(${JSON.stringify(props.text)})}>{copied ? "Copied" : "Copy"}</button>`,
  propsTable: propDocs<UseCopyToClipboardOptions>()([
    { name: "timeoutMs", type: "number", default: "2000", description: "How long copied and error stay set." },
  ]),
  a11y: ["Announce the result yourself, for example with a role=status region."],
};

export default item;
