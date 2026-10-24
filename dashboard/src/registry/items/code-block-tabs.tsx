import { CodeBlockTabs, type CodeBlockTabsProps, type CodeTab } from "changelui";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  lineNumbers: boolean;
  stripPrompts: boolean;
  fileName: boolean;
};
const defaults: DemoProps = { lineNumbers: false, stripPrompts: true, fileName: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "lineNumbers", label: "Line numbers" },
  { type: "boolean", prop: "stripPrompts", label: "Copy without $ prompts" },
  { type: "boolean", prop: "fileName", label: "File name" },
];
const install = (pkg: string): CodeTab[] => [
  { label: "npm", language: "bash", code: `$ npm install ${pkg}` },
  { label: "pnpm", language: "bash", code: `$ pnpm add ${pkg}` },
  { label: "yarn", language: "bash", code: `$ yarn add ${pkg}` },
  { label: "bun", language: "bash", code: `$ bun add ${pkg}` },
];
const RUN: CodeTab[] = [
  { label: "npm", language: "bash", code: "# start the dev server\n$ npm run dev\n  VITE ready in 412 ms\n  ➜  Local: http://127.0.0.1:5173/" },
  { label: "pnpm", language: "bash", code: "# start the dev server\n$ pnpm dev\n  VITE ready in 398 ms\n  ➜  Local: http://127.0.0.1:5173/" },
  { label: "yarn", language: "bash", code: "# start the dev server\n$ yarn dev\n  VITE ready in 405 ms\n  ➜  Local: http://127.0.0.1:5173/" },
  { label: "bun", language: "bash", code: "# start the dev server\n$ bun run dev\n  VITE ready in 361 ms\n  ➜  Local: http://127.0.0.1:5173/" },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-medium text-pui-muted-foreground">1. Install</p>
        <CodeBlockTabs group="docs-pm" tabs={install("changelui motion")} lineNumbers={props.lineNumbers} stripPrompts={props.stripPrompts} fileName={props.fileName ? "Terminal" : undefined} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-medium text-pui-muted-foreground">2. Run it · same tab, picked once</p>
        <CodeBlockTabs group="docs-pm" tabs={RUN} lineNumbers={props.lineNumbers} stripPrompts={props.stripPrompts} highlight={[2]} />
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <CodeBlockTabs tabs={install("changelui")} />
    </div>
  );
}
const COMPONENT: CodeTab[] = [
  {
    label: "TypeScript",
    value: "ts",
    fileName: "price-tag.tsx",
    highlight: [3, 4],
    code: `import { formatMoney } from "./money";\n\nexport function PriceTag({ cents }: { cents: number }) {\n  return <span className="tabular-nums">{formatMoney(cents)}</span>;\n}`,
  },
  {
    label: "JavaScript",
    value: "js",
    fileName: "price-tag.jsx",
    highlight: [3, 4],
    code: `import { formatMoney } from "./money";\n\nexport function PriceTag({ cents }) {\n  return <span className="tabular-nums">{formatMoney(cents)}</span>;\n}`,
  },
];
/** Language tabs with per-tab file names and highlighted lines. */
function LanguageDemo() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <CodeBlockTabs group="docs-lang" tabs={COMPONENT} lineNumbers label="Language" />
    </div>
  );
}
/** A second install block elsewhere on the page follows the pick made above. */
function SyncedDemo() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <CodeBlockTabs group="docs-pm" tabs={install("@tanstack/react-table")} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<CodeBlockTabs\n  group="package-manager"\n  tabs={[\n    { label: "npm", language: "bash", code: "$ npm install changelui" },\n    { label: "pnpm", language: "bash", code: "$ pnpm add changelui" },\n  ]}${props.lineNumbers ? "\n  lineNumbers" : ""}${props.stripPrompts ? "" : "\n  stripPrompts={false}"}${props.fileName ? '\n  fileName="Terminal"' : ""}\n/>`,
  propsTable: propDocs<CodeBlockTabsProps>()([
    { name: "tabs", type: "CodeTab[]", required: true, description: "{ label, value?, code, language?, fileName?, highlight? }." },
    { name: "group", type: "string", description: "Blocks with the same group share the pick on the page and across visits." },
    { name: "value", type: "string", description: "Controlled tab value." },
    { name: "defaultValue", type: "string", description: "Initial tab when nothing is stored for the group." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called when the reader picks a tab." },
    { name: "fileName", type: "string", description: "Header file name (a tab's fileName wins)." },
    { name: "highlight", type: "number[]", description: "1-based lines to highlight in every tab." },
    { name: "lineNumbers", type: "boolean", default: "false", description: "Show a line-number gutter." },
    { name: "stripPrompts", type: "boolean", default: "true", description: "Copy shell code without $ prompts and output lines." },
    { name: "label", type: "string", default: '"Code variants"', description: "Accessible name of the tab list." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous / next tab" },
    { keys: "Home / End", action: "First / last tab" },
  ],
  a11y: [
    "WAI-ARIA tabs with one tab stop; the code panel is focusable so long lines can be scrolled with the keyboard.",
    "Prompts and line numbers are aria-hidden and unselectable; Copy names the active tab and announces its result.",
  ],
  reducedMotion: "The active tab pill jumps instead of gliding.",
  examples: [
    { title: "Languages", description: "Per-tab file names and highlighted lines.", Demo: LanguageDemo },
    { title: "Synced elsewhere", description: "Shares the docs-pm group with the preview: switch there and this follows.", Demo: SyncedDemo },
  ],
};
export default item;
