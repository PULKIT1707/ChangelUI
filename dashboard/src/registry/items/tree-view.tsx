import { Badge, TreeView, type TreeNode, type TreeViewProps } from "changelui";
import { useMemo, useState } from "react";
import { CodeIcon, FileIcon, FolderIcon, ImageIcon, LayersIcon, UserIcon, UsersIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  multiSelect: boolean;
  guides: boolean;
  size: NonNullable<TreeViewProps["size"]>;
  indent: number;
};

const defaults: DemoProps = { multiSelect: false, guides: true, size: "md", indent: 16 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "multiSelect", label: "Multi-select" },
  { type: "boolean", prop: "guides", label: "Indent guides" },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "number", prop: "indent", label: "Indent (px)", min: 10, max: 28, step: 2 },
];

const folder = (open: boolean) => <FolderIcon filled={open} className="text-pui-primary" />;
const code = <CodeIcon className="text-pui-info-text" />;
const file = <FileIcon className="text-pui-muted-foreground" />;

function project(): TreeNode[] {
  return [
    {
      id: "src",
      label: "src",
      icon: folder(true),
      children: [
        {
          id: "components",
          label: "components",
          icon: folder(true),
          meta: "4",
          children: [
            { id: "button.tsx", label: "button.tsx", icon: code },
            { id: "stepper.tsx", label: "stepper.tsx", icon: code, meta: <Badge tone="success" size="sm">new</Badge> },
            { id: "tree-view.tsx", label: "tree-view.tsx", icon: code, meta: <Badge tone="success" size="sm">new</Badge> },
            { id: "table.tsx", label: "table.tsx", icon: code },
          ],
        },
        {
          id: "lib",
          label: "lib",
          icon: folder(false),
          children: [
            { id: "motion.ts", label: "motion.ts", icon: code },
            { id: "color-convert.ts", label: "color-convert.ts", icon: code },
          ],
        },
        { id: "index.ts", label: "index.ts", icon: code },
      ],
    },
    {
      id: "public",
      label: "public",
      icon: folder(false),
      children: [
        { id: "og.png", label: "og.png", icon: <ImageIcon className="text-pui-warning-text" /> },
        { id: "favicon.svg", label: "favicon.svg", icon: <ImageIcon className="text-pui-warning-text" /> },
      ],
    },
    { id: "legacy", label: "legacy (read-only)", icon: folder(false), disabled: true, children: [{ id: "old.js", label: "old.js" }] },
    { id: "package.json", label: "package.json", icon: file },
    { id: "README.md", label: "README.md", icon: file },
  ];
}

function Preview({ props }: { props: DemoProps }) {
  const items = useMemo(project, []);
  const [selected, setSelected] = useState<string[]>(["stepper.tsx"]);
  const [expanded, setExpanded] = useState<string[]>(["src", "components"]);
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="rounded-pui-lg border border-pui-border bg-pui-surface p-1.5">
        <TreeView
          label="Project files"
          items={items}
          selected={selected}
          onSelectedChange={(ids) => setSelected(props.multiSelect ? ids : ids.slice(-1))}
          expanded={expanded}
          onExpandedChange={setExpanded}
          multiSelect={props.multiSelect}
          guides={props.guides}
          size={props.size}
          indent={props.indent}
          onActivate={(node) => setOpened(String(node.textValue ?? node.label))}
        />
      </div>
      <div className="flex flex-col gap-2 rounded-pui-lg border border-dashed border-pui-border p-4 text-sm text-pui-muted-foreground">
        <span>
          Selected: <span className="font-mono text-pui-foreground">{selected.join(", ") || "none"}</span>
        </span>
        <span>
          Expanded: <span className="font-mono text-pui-foreground">{expanded.length}</span> folders
        </span>
        <span>
          Opened (Enter / double-click): <span className="font-mono text-pui-foreground">{opened ?? "nothing yet"}</span>
        </span>
        <span className="mt-auto text-xs">Try arrows, Home/End, * and typing a name.</span>
      </div>
    </div>
  );
}

function Mini() {
  const items = useMemo(project, []);
  return (
    <div aria-hidden="true" className="pointer-events-none w-52 rounded-pui-lg border border-pui-border bg-pui-surface p-1">
      <TreeView items={items.slice(0, 2)} defaultExpanded={["src", "components"]} defaultSelected={["stepper.tsx"]} size="sm" tabIndex={-1} />
    </div>
  );
}

const org: TreeNode[] = [
  {
    id: "ceo",
    label: "Grace Hopper",
    textValue: "Grace Hopper",
    icon: <UserIcon />,
    meta: "CEO",
    children: [
      {
        id: "eng",
        label: "Engineering",
        icon: <UsersIcon />,
        meta: "42",
        children: [
          { id: "platform", label: "Platform", icon: <LayersIcon />, meta: "12" },
          { id: "design-systems", label: "Design systems", icon: <LayersIcon />, meta: "6" },
          { id: "mobile", label: "Mobile", icon: <LayersIcon />, meta: "9" },
        ],
      },
      {
        id: "design",
        label: "Design",
        icon: <UsersIcon />,
        meta: "11",
        children: [
          { id: "brand", label: "Brand", icon: <LayersIcon />, meta: "4" },
          { id: "product-design", label: "Product design", icon: <LayersIcon />, meta: "7" },
        ],
      },
      { id: "ops", label: "Operations", icon: <UsersIcon />, meta: "8" },
    ],
  },
];

/** Multi-select with Shift-click ranges and Cmd/Ctrl-click toggles, feeding a permissions summary. */
function PermissionsDemo() {
  const [selected, setSelected] = useState<string[]>(["platform", "design-systems"]);
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-pui-lg border border-pui-border bg-pui-surface p-1.5">
        <TreeView label="Teams" items={org} multiSelect defaultExpanded={["ceo", "eng", "design"]} selected={selected} onSelectedChange={setSelected} />
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground">
        {selected.length} team{selected.length === 1 ? "" : "s"} get access. Shift-click selects a range, Cmd/Ctrl-click toggles.
      </p>
    </div>
  );
}

const outline: TreeNode[] = [
  {
    id: "intro",
    label: "Introduction",
    children: [
      { id: "why", label: "Why another library" },
      { id: "install", label: "Installation" },
    ],
  },
  {
    id: "guides",
    label: "Guides",
    children: [
      { id: "theming", label: "Theming", children: [{ id: "presets", label: "Presets" }, { id: "tokens", label: "Tokens" }] },
      { id: "motion", label: "Motion" },
    ],
  },
  { id: "api", label: "API reference" },
];

/** A docs outline with custom labels: no icons, numbered sections and a reading-progress dot. */
function OutlineDemo() {
  const [selected, setSelected] = useState<string[]>(["presets"]);
  return (
    <div className="w-full rounded-pui-lg border border-pui-border bg-pui-surface p-1.5">
      <TreeView
        label="Docs outline"
        items={outline}
        size="sm"
        indent={14}
        defaultExpanded={["guides", "theming"]}
        selected={selected}
        onSelectedChange={setSelected}
        renderLabel={(node, state) => (
          <span className="flex items-center gap-2">
            <span className={state.depth === 1 ? "font-semibold" : ""}>{node.label}</span>
            {state.selected ? <span aria-hidden="true" className="size-1.5 rounded-full bg-pui-primary" /> : null}
          </span>
        )}
      />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      'label="Project files"',
      "items={items}",
      "selected={selected}",
      "onSelectedChange={setSelected}",
      'defaultExpanded={["src"]}',
      p.multiSelect ? "multiSelect" : "",
      !p.guides ? "guides={false}" : "",
      p.size !== "md" ? `size="${p.size}"` : "",
      p.indent !== 16 ? `indent={${p.indent}}` : "",
      "onActivate={(node) => open(node.id)}",
    ].filter(Boolean);
    return `const items: TreeNode[] = [
  { id: "src", label: "src", icon: <FolderIcon />, children: [
    { id: "button.tsx", label: "button.tsx", icon: <CodeIcon /> },
  ] },
  { id: "package.json", label: "package.json" },
];

<TreeView
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<TreeViewProps>()([
    { name: "items", type: "TreeNode[]", required: true, description: "Nested nodes: { id, label, textValue?, icon?, meta?, children?, disabled? }." },
    { name: "selected", type: "string[]", description: "Selected ids (defaultSelected, onSelectedChange)." },
    { name: "expanded", type: "string[]", description: "Expanded parent ids (defaultExpanded, onExpandedChange); defaults render on the server." },
    { name: "multiSelect", type: "boolean", default: "false", description: "Cmd/Ctrl-click and Space toggle, Shift-click and Shift+arrows select ranges, Cmd/Ctrl+A selects all." },
    { name: "onActivate", type: "(node: TreeNode) => void", description: "Enter or double-click (open a file, navigate)." },
    { name: "guides", type: "boolean", default: "true", description: "Indentation guides; the active group's guide is tinted." },
    { name: "indent", type: "number", default: "16", description: "Indent per level in px." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Row height 28 / 32 px." },
    { name: "label", type: "string", description: "Accessible name of the tree." },
    { name: "renderLabel", type: "(node, { selected, expanded, depth }) => ReactNode", description: "Custom label content." },
  ]),
  keyboard: [
    { keys: "ArrowDown / ArrowUp", action: "Next / previous visible node" },
    { keys: "ArrowRight", action: "Expand, or move to the first child" },
    { keys: "ArrowLeft", action: "Collapse, or move to the parent" },
    { keys: "Home / End", action: "First / last visible node" },
    { keys: "Enter", action: "Select and activate" },
    { keys: "Space", action: "Select (toggle with multiSelect)" },
    { keys: "*", action: "Expand all siblings" },
    { keys: "a–z", action: "Typeahead to the next matching node" },
  ],
  a11y: [
    "APG tree: role=tree with treeitems carrying aria-level, aria-posinset, aria-setsize, aria-expanded and aria-selected.",
    "Expanded children sit in a role=group owned by their parent (aria-owns).",
    "One roving tab stop: Tab enters at the focused or selected node.",
    "aria-multiselectable is set in multi-select mode; disabled nodes are aria-disabled.",
  ],
  reducedMotion: "Groups open and close instantly, chevrons snap, and the selection pill doesn't slide.",
  examples: [
    { title: "Team permissions", description: "Multi-select with ranges and toggles.", Demo: PermissionsDemo },
    { title: "Docs outline", description: "renderLabel for icon-free, typographic rows.", Demo: OutlineDemo },
  ],
};

export default item;
