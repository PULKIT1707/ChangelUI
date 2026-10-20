import {
  Avatar,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  type BreadcrumbItemProps,
  type BreadcrumbProps,
} from "changelui";
import { useState } from "react";
import { FileIcon, FolderIcon, HomeIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  maxItems: number;
  itemsBeforeCollapse: number;
  itemsAfterCollapse: number;
  collapse: "menu" | "expand";
  separator: "chevron" | "slash" | "dot";
  size: "sm" | "md";
  icons: boolean;
};

const defaults: DemoProps = {
  maxItems: 4,
  itemsBeforeCollapse: 1,
  itemsAfterCollapse: 2,
  collapse: "menu",
  separator: "chevron",
  size: "md",
  icons: true,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "maxItems", label: "Max items (0 = never)", min: 0, max: 7, step: 1 },
  { type: "number", prop: "itemsBeforeCollapse", label: "Before ellipsis", min: 0, max: 3, step: 1 },
  { type: "number", prop: "itemsAfterCollapse", label: "After ellipsis", min: 1, max: 3, step: 1 },
  { type: "select", prop: "collapse", label: "Collapse", options: ["menu", "expand"] },
  { type: "select", prop: "separator", label: "Separator", options: ["chevron", "slash", "dot"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "boolean", prop: "icons", label: "Home icon" },
];

const separators = {
  chevron: undefined,
  slash: <span className="px-0.5 text-pui-muted-foreground/60">/</span>,
  dot: <span className="size-1 rounded-full bg-pui-muted-foreground/50" />,
};

const trail = ["Home", "Workspace", "Design system", "Components", "Navigation", "Breadcrumb"];

const noJump = (event: React.MouseEvent) => event.preventDefault();

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <Breadcrumb
        key={props.collapse}
        maxItems={props.maxItems}
        itemsBeforeCollapse={props.itemsBeforeCollapse}
        itemsAfterCollapse={props.itemsAfterCollapse}
        collapse={props.collapse}
        separator={separators[props.separator]}
        size={props.size}
      >
        {trail.map((label, i) =>
          i === trail.length - 1 ? (
            <BreadcrumbItem key={label} current>
              {label}
            </BreadcrumbItem>
          ) : (
            <BreadcrumbItem
              key={label}
              href={`#${label.toLowerCase().replace(/\s/g, "-")}`}
              onClick={noJump}
              icon={i === 0 && props.icons ? <HomeIcon /> : undefined}
            >
              {label}
            </BreadcrumbItem>
          ),
        )}
      </Breadcrumb>
      <p className="m-0 text-xs text-pui-muted-foreground">
        {trail.length} items · collapses past {props.maxItems || "∞"}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex items-center gap-1.5 text-xs text-pui-muted-foreground">
      <HomeIcon className="size-3.5" />
      <span>›</span>
      <span className="rounded-pui-sm bg-pui-muted px-1">···</span>
      <span>›</span>
      <span>Components</span>
      <span>›</span>
      <span className="font-medium text-pui-foreground">Breadcrumb</span>
    </div>
  );
}

type Dir = { name: string; children?: Dir[] };
const fs: Dir = {
  name: "Drive",
  children: [
    {
      name: "Projects",
      children: [
        {
          name: "ChangelUI",
          children: [
            { name: "Assets", children: [{ name: "Icons", children: [{ name: "logo.svg" }, { name: "mark.svg" }] }, { name: "cover.png" }] },
            { name: "Docs", children: [{ name: "theming.md" }, { name: "motion.md" }] },
            { name: "README.md" },
          ],
        },
        { name: "Side quests", children: [{ name: "notes.md" }] },
      ],
    },
    { name: "Photos", children: [{ name: "lisbon.jpg" }] },
  ],
};

/** Drill into folders; new crumbs slide in and the trail collapses as it grows. */
function ExplorerDemo() {
  const [path, setPath] = useState<string[]>(["Drive", "Projects"]);
  let dir: Dir = fs;
  for (const name of path.slice(1)) dir = dir.children?.find((c) => c.name === name) ?? dir;
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface">
      <div className="border-b border-pui-border bg-pui-muted/30 px-3 py-2.5">
        <Breadcrumb maxItems={4} itemsAfterCollapse={2} size="sm">
          {path.map((name, i) =>
            i === path.length - 1 ? (
              <BreadcrumbItem key={path.slice(0, i + 1).join("/")} current icon={i === 0 ? <HomeIcon /> : undefined}>
                {name}
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem
                key={path.slice(0, i + 1).join("/")}
                href="#"
                icon={i === 0 ? <HomeIcon /> : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setPath(path.slice(0, i + 1));
                }}
              >
                {name}
              </BreadcrumbItem>
            ),
          )}
        </Breadcrumb>
      </div>
      <ul className="m-0 flex list-none flex-col p-1.5">
        {dir.children?.map((child) => (
          <li key={child.name}>
            <button
              type="button"
              disabled={!child.children}
              onClick={() => setPath([...path, child.name])}
              className="flex w-full items-center gap-2.5 rounded-pui-md px-2.5 py-2 text-start text-sm text-pui-surface-foreground enabled:cursor-pointer enabled:hover:bg-pui-muted/60 disabled:text-pui-muted-foreground focus-visible:outline-2 focus-visible:outline-pui-ring"
            >
              {child.children ? <FolderIcon filled className="size-4 text-pui-primary" /> : <FileIcon className="size-4" />}
              <span className="flex-1 truncate">{child.name}</span>
              {child.children ? <span className="text-xs text-pui-muted-foreground">{child.children.length} items</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const teams = ["ChangelUI", "Acme Labs", "Side quests"];
const projects = ["components", "charts", "dashboard"];

function Switcher({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Switch ${label}`}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-pui-sm text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-pui-ring"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 6 3-3 3 3M5 10l3 3 3-3" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange} aria-label={label}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o}>
              {o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Scope switcher: crumbs paired with menus to jump to a sibling team or project. */
function ScopeSwitcherDemo() {
  const [team, setTeam] = useState("ChangelUI");
  const [project, setProject] = useState("components");
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-pui-xl border border-pui-border bg-pui-surface px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1">
        <Breadcrumb separator={<span className="px-0.5 text-pui-muted-foreground/50">/</span>} maxItems={0}>
          <BreadcrumbItem href="#" onClick={noJump} icon={<Avatar name={team} size="xs" />}>
            {team}
          </BreadcrumbItem>
          <BreadcrumbItem href="#" onClick={noJump}>
            {project}
          </BreadcrumbItem>
          <BreadcrumbItem current>Deployments</BreadcrumbItem>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Switcher value={team} options={teams} onChange={setTeam} label="Team" />
        <Switcher value={project} options={projects} onChange={setProject} label="Project" />
        <Badge size="sm" tone="success" dot>
          Live
        </Badge>
      </div>
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
      p.maxItems !== 4 ? `maxItems={${p.maxItems}}` : "",
      p.itemsBeforeCollapse !== 1 ? `itemsBeforeCollapse={${p.itemsBeforeCollapse}}` : "",
      p.itemsAfterCollapse !== 2 ? `itemsAfterCollapse={${p.itemsAfterCollapse}}` : "",
      p.collapse !== "menu" ? `collapse="${p.collapse}"` : "",
      p.separator === "slash" ? 'separator="/"' : p.separator === "dot" ? "separator={<Dot />}" : "",
      p.size !== "md" ? `size="${p.size}"` : "",
    ].filter(Boolean);
    return `<Breadcrumb${attrs.length ? ` ${attrs.join(" ")}` : ""}>
  <BreadcrumbItem href="/"${p.icons ? " icon={<HomeIcon />}" : ""}>Home</BreadcrumbItem>
  <BreadcrumbItem href="/workspace">Workspace</BreadcrumbItem>
  <BreadcrumbItem href="/design-system">Design system</BreadcrumbItem>
  <BreadcrumbItem href="/components">Components</BreadcrumbItem>
  <BreadcrumbItem href="/navigation">Navigation</BreadcrumbItem>
  <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
</Breadcrumb>

// Router links
<BreadcrumbItem asChild>
  <Link to="/docs">Docs</Link>
</BreadcrumbItem>`;
  },
  propsTable: propDocs<BreadcrumbProps & BreadcrumbItemProps>()([
    { name: "maxItems", type: "number", default: "4", description: "Collapse the middle past this many items; 0 never collapses." },
    { name: "itemsBeforeCollapse", type: "number", default: "1", description: "Items kept before the ellipsis." },
    { name: "itemsAfterCollapse", type: "number", default: "2", description: "Items kept after the ellipsis." },
    { name: "collapse", type: '"menu" | "expand"', default: '"menu"', description: "Hidden items in a dropdown, or revealed inline on click." },
    { name: "separator", type: "ReactNode", default: "chevron", description: "Between items (mirrored in RTL)." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Text size and gaps." },
    { name: "label", type: "string", default: '"Breadcrumb"', description: "Landmark name." },
    { name: "expandLabel", type: "(hidden: number) => string", description: "Ellipsis button name. Default `Show ${n} more`." },
    { name: "current", type: "boolean", default: "false", description: "Item: the current page (text with aria-current)." },
    { name: "icon", type: "ReactNode", description: "Item: leading icon (also shown in the ellipsis menu)." },
    { name: "asChild", type: "boolean", default: "false", description: "Item: render the child (a router Link) as the link." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move between crumbs and the ellipsis button" },
    { keys: "Enter / Space", action: "On the ellipsis: open the menu (menu) or reveal the hidden crumbs (expand)" },
  ],
  a11y: [
    'A nav landmark named "Breadcrumb" with an ordered list; separators are aria-hidden.',
    'The current page is plain text with aria-current="page".',
    "The ellipsis is a button named after the hidden count; expand mode moves focus to the first revealed crumb.",
    "Collapse uses the static maxItems, so server and client render the same list.",
  ],
  reducedMotion: "Crumbs appear and disappear with a short fade instead of sliding.",
  examples: [
    { title: "File explorer", description: "Drill into folders; crumbs slide in and the trail collapses as it grows.", Demo: ExplorerDemo },
    { title: "Scope switcher", description: "Crumbs paired with menus to jump to a sibling team or project.", Demo: ScopeSwitcherDemo },
  ],
};

export default item;
