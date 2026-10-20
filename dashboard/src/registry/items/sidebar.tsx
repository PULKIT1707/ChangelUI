import {
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  Kbd,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarSub,
  SidebarTrigger,
  useSidebar,
  type SidebarItemProps,
  type SidebarProps,
  type SidebarProviderProps,
} from "changelui";
import { motion } from "motion/react";
import { useState } from "react";
import {
  BellIcon,
  BookmarkIcon,
  ChartIcon,
  ClockIcon,
  CodeIcon,
  FolderIcon,
  HelpIcon,
  HomeIcon,
  InboxIcon,
  LayersIcon,
  PlusGlyph,
  SearchIcon,
  SlidersIcon,
  SparkIcon,
  StarGlyph,
  UsersIcon,
} from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  collapsible: "icon" | "offcanvas" | "none";
  side: "left" | "right";
  variant: "sidebar" | "floating";
  defaultOpen: boolean;
  width: number;
};

const defaults: DemoProps = { collapsible: "icon", side: "left", variant: "sidebar", defaultOpen: true, width: 240 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "collapsible", label: "Collapsible", options: ["icon", "offcanvas", "none"] },
  { type: "select", prop: "side", label: "Side", options: ["left", "right"] },
  { type: "select", prop: "variant", label: "Variant", options: ["sidebar", "floating"] },
  { type: "boolean", prop: "defaultOpen", label: "Open on load" },
  { type: "number", prop: "width", label: "Width (px)", min: 200, max: 320, step: 10 },
];

const titles: Record<string, string> = {
  home: "Home",
  inbox: "Inbox",
  components: "Components",
  charts: "Charts",
  themes: "Themes",
  calendar: "Calendar",
  analytics: "Analytics",
  members: "Members",
  settings: "Settings",
};

function Logo() {
  const { open, isMobile } = useSidebar();
  const showText = open || isMobile;
  return (
    <div className="flex h-10 items-center gap-2.5 overflow-hidden px-1.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-pui-md bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 text-xs font-bold text-white shadow-pui-sm">
        P
      </span>
      <motion.span
        initial={false}
        animate={{ opacity: showText ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        className="flex min-w-0 flex-col whitespace-nowrap leading-tight"
      >
        <span className="text-sm font-semibold text-pui-foreground">ChangelUI</span>
        <span className="text-[11px] text-pui-muted-foreground">Pro workspace</span>
      </motion.span>
    </div>
  );
}

function UserRow() {
  const { open, isMobile } = useSidebar();
  const showText = open || isMobile;
  return (
    <div className="flex items-center gap-2.5 overflow-hidden rounded-pui-md px-1.5 py-1.5">
      <Avatar name="Maya Okafor" size="sm" className="shrink-0" />
      <motion.span initial={false} animate={{ opacity: showText ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex min-w-0 flex-col whitespace-nowrap leading-tight">
        <span className="truncate text-sm font-medium text-pui-foreground">Maya Okafor</span>
        <span className="truncate text-[11px] text-pui-muted-foreground">maya@example.com</span>
      </motion.span>
    </div>
  );
}

function AppShell({ props }: { props: DemoProps }) {
  const [active, setActive] = useState("components");
  const item = (key: string, icon: React.ReactNode, extra: Partial<SidebarItemProps> = {}) => (
    <SidebarItem
      href={`#${key}`}
      icon={icon}
      active={active === key}
      onClick={(e) => {
        e.preventDefault();
        setActive(key);
      }}
      {...extra}
    >
      {titles[key]}
    </SidebarItem>
  );
  const sub = (key: string) => (
    <SidebarItem
      href={`#${key}`}
      active={active === key}
      onClick={(e) => {
        e.preventDefault();
        setActive(key);
      }}
    >
      {titles[key]}
    </SidebarItem>
  );
  return (
    <SidebarProvider
      collapsible={props.collapsible}
      side={props.side}
      defaultOpen={props.defaultOpen}
      width={props.width}
      className="h-[460px] overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background"
    >
      <Sidebar label="Workspace" variant={props.variant}>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Workspace">
            {item("home", <HomeIcon />)}
            {item("inbox", <InboxIcon />, { badge: 12 })}
            <SidebarSub label="Projects" icon={<FolderIcon />} defaultOpen>
              {sub("components")}
              {sub("charts")}
              {sub("themes")}
            </SidebarSub>
            {item("calendar", <ClockIcon />)}
            {item("analytics", <ChartIcon />, { badge: "New" })}
          </SidebarGroup>
          <SidebarGroup
            label="Team"
            action={
              <button
                type="button"
                aria-label="Invite people"
                className="grid size-5 cursor-pointer place-items-center rounded-pui-sm text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-pui-ring"
              >
                <PlusGlyph className="size-3.5" />
              </button>
            }
          >
            {item("members", <UsersIcon />)}
            {item("settings", <SlidersIcon />)}
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <UserRow />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-pui-border px-3">
          <SidebarTrigger />
          <span aria-hidden="true" className="h-4 w-px bg-pui-border" />
          <Breadcrumb size="sm">
            <BreadcrumbItem href="#" onClick={(e) => e.preventDefault()}>
              Workspace
            </BreadcrumbItem>
            <BreadcrumbItem current>{titles[active]}</BreadcrumbItem>
          </Breadcrumb>
        </header>
        <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="grid flex-1 grid-cols-2 gap-3 overflow-auto p-4 sm:grid-cols-3">
          <div className="col-span-2 flex h-28 flex-col justify-end rounded-pui-lg bg-linear-to-br from-pui-primary/15 to-pui-primary/5 p-4 sm:col-span-3">
            <span className="text-lg font-semibold text-pui-foreground">{titles[active]}</span>
            <span className="text-xs text-pui-muted-foreground">Toggle the sidebar from the header button.</span>
          </div>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 rounded-pui-lg border border-pui-border bg-pui-surface" />
          ))}
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Preview({ props }: { props: DemoProps }) {
  // key: structural options remount the shell so defaultOpen applies.
  return (
    <div className="w-full">
      <AppShell key={`${props.defaultOpen}-${props.collapsible}`} props={props} />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex h-28 w-52 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background">
      <div className="flex w-20 flex-col gap-1.5 border-e border-pui-border bg-pui-surface p-2">
        <div className="mb-1 size-4 rounded-pui-sm bg-pui-primary" />
        {[1, 0, 0, 0].map((on, i) => (
          <div key={i} className={`flex h-4 items-center gap-1 rounded-pui-sm px-1 ${on ? "bg-pui-muted" : ""}`}>
            <span className={`size-2 rounded-full ${on ? "bg-pui-primary" : "bg-pui-muted-foreground/40"}`} />
            <span className="h-1.5 flex-1 rounded-full bg-pui-muted-foreground/30" />
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="h-3 w-1/2 rounded-full bg-pui-muted" />
        <div className="flex-1 rounded-pui-md bg-pui-muted/60" />
      </div>
    </div>
  );
}

const railItems = [
  { key: "home", label: "Home", icon: <HomeIcon /> },
  { key: "search", label: "Search", icon: <SearchIcon /> },
  { key: "inbox", label: "Inbox", icon: <InboxIcon />, badge: 3 },
  { key: "starred", label: "Starred", icon: <StarGlyph /> },
  { key: "layers", label: "Layers", icon: <LayersIcon /> },
];

/** Starts as an icon rail: tooltips name each item, badges become dots, the toggle expands it. */
function RailDemo() {
  const [active, setActive] = useState("inbox");
  return (
    <SidebarProvider defaultOpen={false} width={220} className="h-80 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Sidebar label="Rail">
        <SidebarHeader>
          <SidebarTrigger className="self-start" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            {railItems.map((r) => (
              <SidebarItem key={r.key} icon={r.icon} badge={r.badge} active={active === r.key} onClick={() => setActive(r.key)}>
                {r.label}
              </SidebarItem>
            ))}
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarItem icon={<HelpIcon />}>Help</SidebarItem>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="items-center justify-center gap-1 p-4 text-center">
        <span className="text-sm font-medium text-pui-foreground">{railItems.find((r) => r.key === active)?.label}</span>
        <span className="text-xs text-pui-muted-foreground">Hover or tab through the rail for tooltips.</span>
      </SidebarInset>
    </SidebarProvider>
  );
}

const docs = [
  { group: "Getting started", items: ["Introduction", "Installation", "Theming", "Motion"] },
  { group: "Components", items: ["Breadcrumb", "Collapsible", "Context menu", "Hover card", "Pagination", "Sidebar"] },
  { group: "Charts", items: ["Area", "Bar", "Line", "Pie"] },
];

/** A docs sidebar that never collapses: a filter in the header and nested sections. */
function DocsDemo() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Sidebar");
  const q = query.trim().toLowerCase();
  return (
    <SidebarProvider collapsible="none" width={230} className="h-80 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Sidebar label="Documentation">
        <SidebarHeader>
          <label className="flex h-8 items-center gap-2 rounded-pui-md border border-pui-input bg-pui-background px-2 text-xs text-pui-muted-foreground focus-within:ring-2 focus-within:ring-pui-ring">
            <SearchIcon className="size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter docs"
              aria-label="Filter docs"
              className="min-w-0 flex-1 bg-transparent text-pui-foreground outline-none placeholder:text-pui-muted-foreground"
            />
            <Kbd>/</Kbd>
          </label>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            {docs.map((section) => {
              const items = section.items.filter((i) => !q || i.toLowerCase().includes(q));
              if (items.length === 0) return null;
              return (
                <SidebarSub key={section.group} label={section.group} icon={section.group === "Charts" ? <ChartIcon /> : section.group === "Components" ? <CodeIcon /> : <BookmarkIcon />} defaultOpen>
                  {items.map((i) => (
                    <SidebarItem key={i} active={active === i} onClick={() => setActive(i)}>
                      {i}
                    </SidebarItem>
                  ))}
                </SidebarSub>
              );
            })}
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarItem icon={<SparkIcon />} badge="v1.1">
              Changelog
            </SidebarItem>
            <SidebarItem icon={<BellIcon />}>Updates</SidebarItem>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="gap-2 p-5">
        <span className="text-lg font-semibold text-pui-foreground">{active}</span>
        <div className="h-2 w-3/4 rounded-full bg-pui-muted" />
        <div className="h-2 w-2/3 rounded-full bg-pui-muted" />
        <div className="h-2 w-1/2 rounded-full bg-pui-muted" />
      </SidebarInset>
    </SidebarProvider>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const provider = [
      p.collapsible !== "icon" ? `collapsible="${p.collapsible}"` : "",
      p.side !== "left" ? `side="${p.side}"` : "",
      p.defaultOpen ? "" : "defaultOpen={false}",
      p.width !== 260 ? `width={${p.width}}` : "",
      'shortcut="b"',
    ].filter(Boolean);
    return `<SidebarProvider ${provider.join(" ")}>
  <Sidebar label="Workspace"${p.variant !== "sidebar" ? ` variant="${p.variant}"` : ""}>
    <SidebarHeader><Logo /></SidebarHeader>
    <SidebarContent>
      <SidebarGroup label="Workspace">
        <SidebarItem href="/" icon={<HomeIcon />}>Home</SidebarItem>
        <SidebarItem href="/inbox" icon={<InboxIcon />} badge={12}>Inbox</SidebarItem>
        <SidebarSub label="Projects" icon={<FolderIcon />} defaultOpen>
          <SidebarItem href="/components" active>Components</SidebarItem>
          <SidebarItem href="/charts">Charts</SidebarItem>
        </SidebarSub>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter><UserRow /></SidebarFooter>
  </Sidebar>
  <SidebarInset>
    <header><SidebarTrigger /></header>
    {children}
  </SidebarInset>
</SidebarProvider>`;
  },
  propsTable: propDocs<SidebarProviderProps & SidebarProps & SidebarItemProps>()([
    { name: "collapsible", type: '"icon" | "offcanvas" | "none"', default: '"icon"', description: "Provider: collapse to a 56 px icon rail, hide fully, or never collapse." },
    { name: "defaultOpen", type: "boolean", default: "true", description: "Provider: server-rendered state (open, onOpenChange to control)." },
    { name: "side", type: '"left" | "right"', default: '"left"', description: "Provider: edge for the panel and the mobile drawer." },
    { name: "width", type: "number", default: "260", description: "Provider: expanded width in px (collapsedWidth defaults to 56)." },
    { name: "mobileBreakpoint", type: "number", default: "768", description: "Provider: below this viewport width the sidebar is a Drawer; 0 disables." },
    { name: "shortcut", type: "string", description: 'Provider: toggle with Cmd/Ctrl + key, e.g. "b". Off by default.' },
    { name: "label", type: "string", default: '"Sidebar"', description: "Sidebar: nav landmark name." },
    { name: "variant", type: '"sidebar" | "floating"', default: '"sidebar"', description: "Sidebar: flush with a border, or an inset rounded card." },
    { name: "href", type: "string", description: "Item: renders a link (else a button)." },
    { name: "icon", type: "ReactNode", description: "Item: leading icon; the only thing visible on the rail." },
    { name: "active", type: "boolean", default: "false", description: 'Item: the sliding pill and aria-current="page".' },
    { name: "badge", type: "ReactNode", description: "Item: trailing count or tag; a dot on the rail." },
    { name: "tooltip", type: "string", description: "Item: rail tooltip (default: string children)." },
    { name: "asChild", type: "boolean", default: "false", description: "Item: render your router Link as the item." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move through items; the trigger toggles the sidebar" },
    { keys: "Cmd/Ctrl + key", action: "Toggle when shortcut is set" },
    { keys: "Escape", action: "Close the mobile drawer" },
  ],
  a11y: [
    'Sidebar is a nav landmark; active links carry aria-current="page".',
    "SidebarTrigger has aria-expanded and aria-controls; it is named \"Toggle sidebar\" by default.",
    "On the icon rail labels stay in the accessibility tree (only faded), and tooltips name each item for sighted users.",
    "Below the mobile breakpoint the sidebar is a modal Drawer with a focus trap; following a link closes it.",
    "SidebarSub rows are buttons with aria-expanded; on the rail they expand the sidebar first.",
  ],
  reducedMotion: "The width changes instantly, labels show and hide without blur and the active pill jumps.",
  examples: [
    { title: "Icon rail", description: "Starts collapsed: tooltips, badge dots and a toggle in the header.", Demo: RailDemo },
    { title: "Docs navigation", description: 'collapsible="none" with a filter and nested sections.', Demo: DocsDemo },
  ],
};

export default item;
