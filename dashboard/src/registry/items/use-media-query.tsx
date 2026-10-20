import { useMediaQuery, type UseMediaQueryOptions } from "changelui";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { query: string };

function Preview({ props }: { props: DemoProps }) {
  const matches = useMediaQuery(props.query);
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <code className="font-mono text-xs text-pui-muted-foreground">{props.query}</code>
      <span
        data-state={matches ? "active" : "inactive"}
        className="rounded-pui-full px-3 py-1 font-medium data-[state=active]:bg-pui-success data-[state=active]:text-pui-success-foreground data-[state=inactive]:bg-pui-muted"
      >
        {matches ? "matches" : "does not match"}
      </span>
    </div>
  );
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">(min-width: 640px)</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults: { query: "(min-width: 640px)" },
  controls: [{ type: "text", prop: "query", label: "Query", maxLength: 60 }],
  snippet: (props) => `const matches = useMediaQuery(${JSON.stringify(props.query)});`,
  propsTable: [
    { name: "query", type: "string", description: "A CSS media query.", required: true },
    ...propDocs<UseMediaQueryOptions>()([
      { name: "defaultValue", type: "boolean", default: "false", description: "Server value, and the value without matchMedia." },
    ]),
  ],
};

export default item;
