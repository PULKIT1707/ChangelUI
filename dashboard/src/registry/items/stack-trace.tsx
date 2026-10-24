import { StackTrace, type StackFrame, type StackTraceProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  engine: "chrome" | "node" | "firefox";
  expanded: boolean;
  openable: boolean;
  raw: boolean;
};
const defaults: DemoProps = { engine: "chrome", expanded: false, openable: true, raw: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "engine", label: "Trace format", options: ["chrome", "node", "firefox"] },
  { type: "boolean", prop: "expanded", label: "Library frames open" },
  { type: "boolean", prop: "openable", label: "Open in editor" },
  { type: "boolean", prop: "raw", label: "Start on raw" },
];
const TRACES: Record<DemoProps["engine"], string> = {
  chrome: `TypeError: Cannot read properties of undefined (reading 'map')
    at LineItems (http://localhost:5180/src/cart/line-items.tsx?t=1729711:42:27)
    at renderWithHooks (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js?v=8c1f:5662:22)
    at updateFunctionComponent (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js?v=8c1f:7475:19)
    at beginWork (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js?v=8c1f:8525:18)
    at CartSummary (http://localhost:5180/src/cart/cart-summary.tsx?t=1729711:18:9)
    at performUnitOfWork (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js?v=8c1f:12561:22)
    at workLoopSync (http://localhost:5180/node_modules/.vite/deps/react-dom_client.js?v=8c1f:12424:41)`,
  node: `Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)
    at Client._connectionCallback (/srv/app/node_modules/pg/lib/client.js:132:24)
    at async Pool.connect (/srv/app/node_modules/pg-pool/index.js:45:11)
    at async getInvoices (/srv/app/src/billing/invoices.ts:27:18)
    at async handler (/srv/app/src/routes/invoices.ts:12:20)
    at async Promise.all (index 0)`,
  firefox: `fetchProfile@https://app.example.com/assets/profile-3f9a.js:88:13
loadAccount@https://app.example.com/assets/account-b21c.js:14:5
dispatch@https://app.example.com/assets/vendor/redux-9e0d.js:2:4410
@https://app.example.com/assets/main-77aa.js:3:211`,
};
// Firefox frames have no headline, so the demo treats vendor/ as library code.
const firefoxIsApp = (frame: Omit<StackFrame, "isApp">) => frame.file !== null && !frame.file.includes("/vendor/");
function Preview({ props }: { props: DemoProps }) {
  const [opened, setOpened] = useState("");
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <StackTrace
        key={`${props.engine}-${props.expanded}-${props.raw}`}
        title="Unhandled runtime error"
        trace={TRACES[props.engine]}
        isAppFrame={props.engine === "firefox" ? firefoxIsApp : undefined}
        defaultExpanded={props.expanded}
        defaultRaw={props.raw}
        onOpenFrame={props.openable ? (f) => setOpened(`Would open ${f.file?.replace(/\?.*$/, "") ?? ""}:${f.line ?? ""} in your editor.`) : undefined}
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {opened}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <StackTrace trace={TRACES.node} />
    </div>
  );
}
/** A real Error thrown in the page, passed straight in. */
function LiveErrorDemo() {
  const [error, setError] = useState<Error | null>(null);
  const crash = () => {
    try {
      const order = JSON.parse('{"items": null}') as { items: string[] | null };
      (order.items as string[]).map((x) => x.trim());
    } catch (e) {
      setError(e as Error);
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <button
        type="button"
        onClick={crash}
        className="inline-flex h-8 w-fit cursor-pointer items-center rounded-pui-md border border-pui-border bg-pui-surface px-3 text-xs font-medium text-pui-foreground hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        Throw an error
      </button>
      {error ? <StackTrace trace={error} title="Caught in this page" /> : <p className="m-0 text-xs text-pui-muted-foreground">Throws a TypeError from this demo and renders error.stack.</p>}
    </div>
  );
}
/** Server logs: Node frames, pg internals folded, the query that failed first. */
function ServerDemo() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <StackTrace title="GET /api/invoices · 500" trace={TRACES.node} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<StackTrace\n  title="Unhandled runtime error"\n  trace={error}${props.expanded ? "\n  defaultExpanded" : ""}${props.raw ? "\n  defaultRaw" : ""}${props.openable ? "\n  onOpenFrame={(f) => openInEditor(f.file, f.line)}" : ""}\n/>`,
  propsTable: propDocs<StackTraceProps>()([
    { name: "trace", type: "string | Error", required: true, description: "An Error or stack text from V8, Firefox or Safari." },
    { name: "isAppFrame", type: "(frame) => boolean", default: "not node_modules / node: / internals", description: "Which frames are your code." },
    { name: "onOpenFrame", type: "(frame) => void", description: "Makes app frames buttons, e.g. to open the file in an editor." },
    { name: "defaultExpanded", type: "boolean", default: "false", description: "Library frames start open." },
    { name: "defaultRaw", type: "boolean", default: "false", description: "Start on the raw text." },
    { name: "title", type: "ReactNode", description: "Small label above the error." },
  ]),
  a11y: [
    "A section named by the error; frames are an ordered list, library runs are disclosure buttons with aria-expanded.",
    "The raw view is a focusable, scrollable pre; Raw is a toggle button with aria-pressed and Copy announces its result.",
  ],
  reducedMotion: "Library frames open and close without the height animation.",
  examples: [
    { title: "Live error", description: "Pass a caught Error; its stack is parsed in the browser that threw it.", Demo: LiveErrorDemo },
    { title: "Server log", description: "Node frames with node: internals and pg folded away.", Demo: ServerDemo },
  ],
};
export default item;
