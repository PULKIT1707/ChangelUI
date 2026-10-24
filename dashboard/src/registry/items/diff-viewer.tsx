import { DiffViewer, type DiffView, type DiffViewerProps } from "changelui";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  view: DiffView;
  context: number;
  wordDiff: boolean;
  lineNumbers: boolean;
};
const defaults: DemoProps = { view: "unified", context: 2, wordDiff: true, lineNumbers: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "view", label: "View", options: ["unified", "split"] },
  { type: "number", prop: "context", label: "Context lines", min: 0, max: 6, step: 1 },
  { type: "boolean", prop: "wordDiff", label: "Word highlights" },
  { type: "boolean", prop: "lineNumbers", label: "Line numbers" },
];
const configBefore = `service:
  name: checkout-api
  region: eu-west
  replicas: 2
  image: registry.example.com/checkout:1.8.2

resources:
  cpu: 500m
  memory: 512Mi

health:
  path: /healthz
  interval: 30s
  timeout: 5s

env:
  LOG_LEVEL: info
  FEATURE_EXPRESS_PAY: "false"
  CACHE_TTL: 60
`;
const configAfter = `service:
  name: checkout-api
  region: eu-west
  replicas: 4
  image: registry.example.com/checkout:1.9.0

resources:
  cpu: 500m
  memory: 1Gi

health:
  path: /healthz
  interval: 30s
  timeout: 5s

env:
  LOG_LEVEL: info
  FEATURE_EXPRESS_PAY: "true"
  CACHE_TTL: 60
  RETRY_BUDGET: 3
`;
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="w-full max-w-3xl">
      <DiffViewer
        key={props.context}
        oldValue={configBefore}
        newValue={configAfter}
        fileName="deploy/checkout.yaml"
        view={props.view}
        context={props.context}
        wordDiff={props.wordDiff}
        lineNumbers={props.lineNumbers}
        viewToggle={false}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <DiffViewer oldValue={"replicas: 2\nmemory: 512Mi\nlog: info"} newValue={"replicas: 4\nmemory: 1Gi\nlog: info"} viewToggle={false} fileName="app.yaml" />
    </div>
  );
}
/** Prose: word highlights make copy edits obvious. */
function CopyDemo() {
  return (
    <DiffViewer
      fileName="pricing-page.md"
      wordDiff
      lineNumbers={false}
      oldValue={`# Simple pricing for growing teams

Start free, then pay $12 per seat each month.
Cancel anytime from your billing settings.
All plans include email support.`}
      newValue={`# Simple pricing for growing teams

Start free, then pay $10 per seat each month, billed yearly.
Cancel anytime from your billing settings.
All plans include priority email and chat support.`}
    />
  );
}
/** Code in split view. */
function CodeDemo() {
  return (
    <DiffViewer
      fileName="src/lib/retry.ts"
      defaultView="split"
      context={1}
      oldValue={`export async function retry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
    }
  }
}`}
      newValue={`export async function retry(fn, attempts = 3, baseMs = 200) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(baseMs * 2 ** i);
    }
  }
}`}
    />
  );
}
/** Audit log entry: compact settings change without the header. */
function AuditDemo() {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs text-pui-muted-foreground">
        <span className="font-medium text-pui-foreground">Riley Chen</span> changed workspace settings · 2 hours ago
      </p>
      <DiffViewer
        header={false}
        oldValue={`{\n  "sso": false,\n  "sessionHours": 24,\n  "allowedDomains": ["example.com"]\n}`}
        newValue={`{\n  "sso": true,\n  "sessionHours": 12,\n  "allowedDomains": ["example.com", "example.org"]\n}`}
        label="Workspace settings change"
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["oldValue={before}", "newValue={after}", 'fileName="deploy/checkout.yaml"'];
    if (props.view !== "unified") attrs.push(`defaultView="${props.view}"`);
    if (props.context !== 3) attrs.push(`context={${props.context}}`);
    if (!props.wordDiff) attrs.push("wordDiff={false}");
    if (!props.lineNumbers) attrs.push("lineNumbers={false}");
    return `<DiffViewer\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<DiffViewerProps>()([
    { name: "oldValue", type: "string", required: true, description: "Text before the change." },
    { name: "newValue", type: "string", required: true, description: "Text after the change." },
    { name: "view", type: '"unified" | "split"', description: "Controlled layout." },
    { name: "defaultView", type: '"unified" | "split"', default: '"unified"', description: "Initial layout." },
    { name: "onViewChange", type: "(view) => void", description: "Called when the header toggle changes the layout." },
    { name: "context", type: "number", default: "3", description: "Unchanged lines kept around each change; longer runs collapse." },
    { name: "fileName", type: "ReactNode", description: "Shown in the header and used in the table name." },
    { name: "wordDiff", type: "boolean", default: "true", description: "Highlight the changed words inside paired lines." },
    { name: "lineNumbers", type: "boolean", default: "true", description: "Old and new line number gutters." },
    { name: "header", type: "boolean", default: "true", description: "File name, +/− stats and the layout toggle." },
    { name: "viewToggle", type: "boolean", default: "true", description: "Show the Unified / Split toggle." },
    { name: "label", type: "string", default: '"Changes"', description: "Accessible name for the diff table." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Reach the layout toggle and each “Show N unchanged lines” button" },
    { keys: "Enter / Space", action: "Expand collapsed lines (focus stays in the diff)" },
    { keys: "← / →", action: "Switch Unified / Split" },
  ],
  a11y: [
    "A real table with a caption; added and removed lines start with hidden “Added:” / “Removed:” text, so color is never the only cue.",
    "Line numbers and +/− signs are decorative and hidden from screen readers.",
    "Expanding announces how many lines appeared.",
  ],
  reducedMotion: "Expanded lines and the stat bar appear without fading.",
  examples: [
    { title: "Copy edits", description: "Word highlights show exactly what changed in prose.", Demo: CopyDemo },
    { title: "Audit log", description: "Header off, inline in an activity entry.", Demo: AuditDemo },
    { title: "Split code review", description: "Side by side with one context line.", Demo: CodeDemo, wide: true },
  ],
};
export default item;
