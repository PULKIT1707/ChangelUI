import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Switch,
  type CollapsibleContentProps,
  type CollapsibleProps,
} from "changelui";
import { useState } from "react";
import { CodeIcon, FileIcon, FolderIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  defaultOpen: boolean;
  forceMount: boolean;
  duration: number;
  disabled: boolean;
};

const defaults: DemoProps = { defaultOpen: false, forceMount: false, duration: 0.25, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "defaultOpen", label: "Open on load" },
  { type: "boolean", prop: "forceMount", label: "Force mount" },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.1, max: 0.8, step: 0.05 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 text-pui-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

const starred = ["changelui/components", "changelui/charts", "changelui/themes"];

function Preview({ props }: { props: DemoProps }) {
  // key: toggling "Open on load" remounts so the new initial state applies.
  return <StarredRepos key={String(props.defaultOpen)} {...props} />;
}

function StarredRepos(props: DemoProps) {
  const [open, setOpen] = useState(props.defaultOpen);
  return (
    <div className="w-full max-w-sm">
      <Collapsible open={open} onOpenChange={setOpen} disabled={props.disabled} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-sm font-medium text-pui-foreground">@pulls starred 4 repositories</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={open ? "Hide repositories" : "Show all repositories"}>
              <Chevron open={open} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 font-mono text-xs text-pui-surface-foreground">
          changelui/motion-presets
        </div>
        <CollapsibleContent forceMount={props.forceMount} duration={props.duration} className="flex flex-col gap-2">
          {starred.map((repo) => (
            <div
              key={repo}
              className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 font-mono text-xs text-pui-surface-foreground"
            >
              {repo}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-48 flex-col gap-1.5">
      <div className="flex items-center justify-between rounded-pui-md border border-pui-border bg-pui-surface px-2.5 py-1.5 text-xs text-pui-surface-foreground">
        Advanced settings <Chevron open />
      </div>
      <div className="h-2 w-3/4 rounded-full bg-pui-muted" />
      <div className="h-2 w-1/2 rounded-full bg-pui-muted" />
    </div>
  );
}

type Node = { name: string; children?: Node[] };
const tree: Node[] = [
  {
    name: "src",
    children: [
      { name: "components", children: [{ name: "collapsible.tsx" }, { name: "sidebar.tsx" }, { name: "pagination.tsx" }] },
      { name: "lib", children: [{ name: "motion.ts" }, { name: "menu-context.ts" }] },
      { name: "index.ts" },
    ],
  },
  { name: "package.json" },
  { name: "README.md" },
];

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const pad = { paddingInlineStart: `${depth * 14 + 6}px` };
  if (!node.children) {
    return (
      <div style={pad} className="flex h-7 items-center gap-2 rounded-pui-sm text-xs text-pui-muted-foreground">
        {node.name.endsWith(".tsx") || node.name.endsWith(".ts") ? <CodeIcon className="size-3.5" /> : <FileIcon className="size-3.5" />}
        {node.name}
      </div>
    );
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        style={pad}
        className="flex h-7 w-full items-center gap-2 rounded-pui-sm pe-2 text-start text-xs font-medium text-pui-foreground hover:bg-pui-muted/60"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`} fill="currentColor">
          <path d="M6 4l4 4-4 4z" />
        </svg>
        <FolderIcon filled={open} className="size-3.5 text-pui-primary" />
        {node.name}
      </CollapsibleTrigger>
      <CollapsibleContent duration={0.2}>
        {node.children.map((child) => (
          <TreeNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** A file tree built from nested Collapsibles; each folder animates its own height. */
function FileTreeDemo() {
  return (
    <div className="w-full rounded-pui-lg border border-pui-border bg-pui-surface p-2">
      {tree.map((node) => (
        <TreeNode key={node.name} node={node} depth={0} />
      ))}
    </div>
  );
}

/** A settings form whose advanced section stays mounted (forceMount), so its values survive closing. */
function AdvancedSettingsDemo() {
  const [open, setOpen] = useState(false);
  const [beta, setBeta] = useState(true);
  return (
    <form className="flex w-full flex-col gap-3 rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground" onSubmit={(e) => e.preventDefault()}>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Project name</span>
        <input
          defaultValue="Aurora"
          className="h-9 rounded-pui-md border border-pui-input bg-pui-background px-3 text-sm text-pui-foreground outline-none focus-visible:ring-2 focus-visible:ring-pui-ring"
        />
      </label>
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-pui-md border border-pui-border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-pui-md px-3 py-2 text-sm font-medium hover:bg-pui-muted/50">
          <span className="flex items-center gap-2">
            Advanced
            <Badge tone="primary" size="sm">
              2 options
            </Badge>
          </span>
          <Chevron open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount>
          <div className="flex flex-col gap-3 border-t border-pui-border p-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>Beta features</span>
              <Switch checked={beta} onCheckedChange={setBeta} aria-label="Beta features" />
            </label>
            <label className="flex flex-col gap-1">
              <span>Region</span>
              <select className="h-9 rounded-pui-md border border-pui-input bg-pui-background px-2 text-sm text-pui-foreground">
                <option>Frankfurt</option>
                <option>Oregon</option>
                <option>Tokyo</option>
              </select>
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <p className="m-0 text-xs text-pui-muted-foreground">Beta features stay {beta ? "on" : "off"} even while the section is closed.</p>
    </form>
  );
}

const release = [
  "Sidebar with icon rail, nested groups and a mobile drawer",
  "Context menu that opens at the pointer",
  "Pagination with a sliding active pill",
  "Hover cards for user and link previews",
  "Breadcrumbs that collapse into a menu",
];

/** "Show more" text: the preview stays, the rest slides open below it. */
function ReadMoreDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex w-full flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <span className="font-medium">v1.1 release notes</span>
      <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-pui-muted-foreground">
        {release.slice(0, 2).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <CollapsibleContent>
        <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-pui-muted-foreground">
          {release.slice(2).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </CollapsibleContent>
      <CollapsibleTrigger className="self-start text-sm font-medium text-pui-primary underline-offset-4 hover:underline">
        {open ? "Show less" : `Show ${release.length - 2} more`}
      </CollapsibleTrigger>
    </Collapsible>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const root = [p.defaultOpen ? "defaultOpen" : "", p.disabled ? "disabled" : ""].filter(Boolean).join(" ");
    const content = [p.forceMount ? "forceMount" : "", p.duration !== 0.25 ? `duration={${p.duration}}` : ""].filter(Boolean).join(" ");
    return `<Collapsible${root ? ` ${root}` : ""}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm">Show all</Button>
  </CollapsibleTrigger>
  <CollapsibleContent${content ? ` ${content}` : ""}>
    {repositories.map((repo) => <Repo key={repo} name={repo} />)}
  </CollapsibleContent>
</Collapsible>`;
  },
  propsTable: propDocs<CollapsibleProps & CollapsibleContentProps>()([
    { name: "open", type: "boolean", description: "Root: controlled open state (defaultOpen, onOpenChange)." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Root: initial state; rendered on the server." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Root: called when the trigger toggles." },
    { name: "disabled", type: "boolean", default: "false", description: "Root: the trigger stops toggling." },
    { name: "asChild", type: "boolean", default: "false", description: "Root and Trigger: render the single child element instead." },
    { name: "forceMount", type: "boolean", default: "false", description: "Content: stay mounted while closed (hidden from layout, focus and AT)." },
    { name: "duration", type: "number", default: "0.25", description: "Content: height animation length in seconds." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Toggle the content from the trigger" }],
  a11y: [
    "The trigger is a button with aria-expanded and aria-controls pointing at the content.",
    "The content is a region labelled by its trigger.",
    "With forceMount the closed content is visibility:hidden and aria-hidden, so it leaves the tab order.",
    "useCollapsibleState() reads the open state for custom icons.",
  ],
  reducedMotion: "The content opens and closes instantly.",
  examples: [
    { title: "File tree", description: "Nested Collapsibles, each folder with its own height animation.", Demo: FileTreeDemo },
    { title: "Advanced settings", description: "forceMount keeps form values while the section is closed.", Demo: AdvancedSettingsDemo },
    { title: "Read more", description: "The preview stays, the rest slides open under it.", Demo: ReadMoreDemo, wide: true },
  ],
};

export default item;
