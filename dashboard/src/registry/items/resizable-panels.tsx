import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanels,
  TreeView,
  useResizablePanel,
  type ResizablePanelsProps,
  type TreeNode,
} from "changelui";
import { useState, type ReactNode } from "react";
import { ChartIcon, CodeIcon, FileIcon, FolderIcon, HomeIcon, InboxIcon, SearchIcon, SlidersIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  direction: NonNullable<ResizablePanelsProps["direction"]>;
  withGrip: boolean;
  collapsible: boolean;
  minSize: number;
  keyboardStep: number;
};

const defaults: DemoProps = { direction: "horizontal", withGrip: true, collapsible: true, minSize: 18, keyboardStep: 10 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "direction", label: "Direction", options: ["horizontal", "vertical"] },
  { type: "boolean", prop: "withGrip", label: "Grip" },
  { type: "boolean", prop: "collapsible", label: "First panel collapsible" },
  { type: "number", prop: "minSize", label: "Min size (%)", min: 5, max: 40, step: 1 },
  { type: "number", prop: "keyboardStep", label: "Keyboard step (px)", min: 4, max: 40, step: 2 },
];

const files: TreeNode[] = [
  {
    id: "src",
    label: "src",
    icon: <FolderIcon filled className="text-pui-primary" />,
    children: [
      { id: "app.tsx", label: "app.tsx", icon: <CodeIcon className="text-pui-info-text" /> },
      { id: "panels.tsx", label: "panels.tsx", icon: <CodeIcon className="text-pui-info-text" /> },
    ],
  },
  { id: "readme", label: "README.md", icon: <FileIcon className="text-pui-muted-foreground" /> },
];

function Pane({ title, children, className = "" }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`flex h-full min-w-0 flex-col gap-2 overflow-hidden p-3 ${className}`}>
      <span className="truncate text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

const codeLines = [
  "export function App() {",
  "  return (",
  "    <ResizablePanels>",
  "      <ResizablePanel defaultSize={25} />",
  "      <ResizableHandle withGrip />",
  "      <ResizablePanel />",
  "    </ResizablePanels>",
  "  );",
  "}",
];

function Preview({ props }: { props: DemoProps }) {
  const [layout, setLayout] = useState<number[]>([]);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      <div className="h-80 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
        <ResizablePanels key={`${props.direction}-${props.collapsible}-${props.minSize}`} direction={props.direction} keyboardStep={props.keyboardStep} onLayout={setLayout}>
          <ResizablePanel defaultSize={26} minSize={props.minSize} collapsible={props.collapsible} collapsedSize={0}>
            <Pane title="Explorer">
              <TreeView items={files} defaultExpanded={["src"]} defaultSelected={["panels.tsx"]} size="sm" label="Files" />
            </Pane>
          </ResizablePanel>
          <ResizableHandle withGrip={props.withGrip} aria-label="Resize explorer" />
          <ResizablePanel minSize={30}>
            <ResizablePanels direction={props.direction === "horizontal" ? "vertical" : "horizontal"}>
              <ResizablePanel defaultSize={65} minSize={20}>
                <Pane title="panels.tsx">
                  <pre className="m-0 overflow-hidden font-mono text-xs leading-5 text-pui-foreground">
                    {codeLines.map((l, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-4 shrink-0 text-end text-pui-muted-foreground">{i + 1}</span>
                        <span className="whitespace-pre">{l}</span>
                      </div>
                    ))}
                  </pre>
                </Pane>
              </ResizablePanel>
              <ResizableHandle withGrip={props.withGrip} aria-label="Resize terminal" />
              <ResizablePanel minSize={15} collapsible>
                <Pane title="Terminal" className="bg-pui-muted/40">
                  <code className="font-mono text-xs text-pui-success-text">✓ built in 412ms</code>
                </Pane>
              </ResizablePanel>
            </ResizablePanels>
          </ResizablePanel>
        </ResizablePanels>
      </div>
      <span className="font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        {layout.length ? `layout: [${layout.map((n) => n.toFixed(0)).join(", ")}]` : "Drag a handle, or focus it and use arrows, Home/End and Enter."}
      </span>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none h-28 w-56 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface">
      <ResizablePanels>
        <ResizablePanel defaultSize={35}>
          <div className="flex h-full flex-col gap-1.5 p-2">
            <span className="h-1.5 w-3/4 rounded-full bg-pui-muted" />
            <span className="h-1.5 w-1/2 rounded-full bg-pui-muted" />
            <span className="h-1.5 w-2/3 rounded-full bg-pui-muted" />
          </div>
        </ResizablePanel>
        <ResizableHandle withGrip />
        <ResizablePanel>
          <div className="h-full bg-pui-primary/8 p-2">
            <span className="block h-full rounded-pui-sm border border-dashed border-pui-primary/30" />
          </div>
        </ResizablePanel>
      </ResizablePanels>
    </div>
  );
}

const nav = [
  { label: "Home", icon: HomeIcon },
  { label: "Inbox", icon: InboxIcon },
  { label: "Analytics", icon: ChartIcon },
  { label: "Search", icon: SearchIcon },
  { label: "Settings", icon: SlidersIcon },
];

function RailNav() {
  const panel = useResizablePanel();
  const rail = panel.size < 16;
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1 p-2">
      {nav.map(({ label, icon: Icon }, i) => (
        <a
          key={label}
          href="#/components/resizable-panels"
          aria-current={i === 1 ? "page" : undefined}
          title={rail ? label : undefined}
          onClick={(e) => e.preventDefault()}
          className={`flex h-9 items-center gap-3 rounded-pui-md px-2.5 text-sm ${i === 1 ? "bg-pui-primary/12 text-pui-primary-text" : "text-pui-foreground hover:bg-pui-muted"} ${rail ? "justify-center" : ""}`}
        >
          <Icon className="size-4 shrink-0" />
          {rail ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
        </a>
      ))}
      <button
        type="button"
        onClick={panel.toggle}
        className="mt-auto h-8 rounded-pui-md text-xs text-pui-muted-foreground hover:bg-pui-muted"
      >
        {panel.collapsed ? "»" : "« Collapse"}
      </button>
    </nav>
  );
}

/** Collapse to an icon rail: collapsedSize keeps 10% and useResizablePanel switches the layout. */
function RailDemo() {
  return (
    <div className="h-64 w-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <ResizablePanels>
        <ResizablePanel defaultSize={28} minSize={22} maxSize={40} collapsible collapsedSize={10}>
          <RailNav />
        </ResizablePanel>
        <ResizableHandle aria-label="Resize navigation" />
        <ResizablePanel>
          <Pane title="Inbox">
            {["Design review at 3pm", "Your export is ready", "New comment on Stepper"].map((m) => (
              <div key={m} className="truncate rounded-pui-md border border-pui-border px-3 py-2 text-sm">
                {m}
              </div>
            ))}
          </Pane>
        </ResizablePanel>
      </ResizablePanels>
    </div>
  );
}

/** Three columns with min/max constraints, like a mail client. */
function ThreeColumnDemo() {
  return (
    <div className="h-56 w-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <ResizablePanels>
        <ResizablePanel defaultSize={22} minSize={15} maxSize={30}>
          <Pane title="Folders" />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={33} minSize={20}>
          <Pane title="Messages" className="bg-pui-muted/30" />
        </ResizablePanel>
        <ResizableHandle withGrip />
        <ResizablePanel minSize={30}>
          <Pane title="Reading pane" />
        </ResizablePanel>
      </ResizablePanels>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => `<ResizablePanels${p.direction !== "horizontal" ? ` direction="${p.direction}"` : ""}${p.keyboardStep !== 10 ? ` keyboardStep={${p.keyboardStep}}` : ""} onLayout={save}>
  <ResizablePanel defaultSize={26} minSize={${p.minSize}}${p.collapsible ? " collapsible" : ""}>
    <Explorer />
  </ResizablePanel>
  <ResizableHandle${p.withGrip ? " withGrip" : ""} aria-label="Resize explorer" />
  <ResizablePanel minSize={30}>
    <Editor />
  </ResizablePanel>
</ResizablePanels>`,
  propsTable: propDocs<ResizablePanelsProps & {
    defaultSize: unknown;
    minSize: unknown;
    maxSize: unknown;
    collapsible: unknown;
    collapsedSize: unknown;
    defaultCollapsed: unknown;
    onCollapsedChange: unknown;
    withGrip: unknown;
  }>()([
    { name: "direction", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "ResizablePanels: side by side or stacked." },
    { name: "onLayout", type: "(sizes: number[]) => void", description: "ResizablePanels: percent sizes after each committed resize (persist them and pass back as defaultSize)." },
    { name: "keyboardStep", type: "number", default: "10", description: "ResizablePanels: arrow-key step in px (Shift ×5)." },
    { name: "defaultSize", type: "number", description: "ResizablePanel: initial percent; the server renders it. Unset panels share the rest." },
    { name: "minSize", type: "number", default: "10", description: "ResizablePanel: minimum percent." },
    { name: "maxSize", type: "number", default: "100", description: "ResizablePanel: maximum percent." },
    { name: "collapsible", type: "boolean", default: "false", description: "ResizablePanel: collapses when dragged below half its min size, or with Enter / double-click." },
    { name: "collapsedSize", type: "number", default: "0", description: "ResizablePanel: percent when collapsed (an icon rail)." },
    { name: "defaultCollapsed", type: "boolean", default: "false", description: "ResizablePanel: start collapsed." },
    { name: "onCollapsedChange", type: "(collapsed: boolean) => void", description: "ResizablePanel: collapse changes." },
    { name: "withGrip", type: "boolean", default: "false", description: "ResizableHandle: grip pill in the middle." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Move the focused handle by keyboardStep px (Shift ×5)" },
    { keys: "Home / End", action: "Shrink the previous panel to its min (or collapse) / grow it to its max" },
    { keys: "Enter", action: "Collapse or expand the adjacent collapsible panel" },
  ],
  a11y: [
    "Handles are focusable role=separator elements with aria-valuenow/min/max (percent of the previous panel) and aria-controls.",
    "The separator orientation is perpendicular to the group (vertical between side-by-side panels).",
    "useResizablePanel() exposes size and collapse state, e.g. to swap labels for an icon rail.",
    "Arrow keys mirror in right-to-left layouts.",
  ],
  reducedMotion: "Collapse and expand jump instead of animating on springs.heavy; the handle doesn't thicken with a transition.",
  examples: [
    { title: "Icon rail", description: "collapsedSize keeps a rail; the nav reads useResizablePanel().", Demo: RailDemo, wide: true },
    { title: "Three columns", description: "Min and max sizes on every pane.", Demo: ThreeColumnDemo, wide: true },
  ],
};

export default item;
