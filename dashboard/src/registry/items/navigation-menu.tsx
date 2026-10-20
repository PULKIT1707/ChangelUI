import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  type NavigationMenuIndicator,
  type NavigationMenuProps,
} from "changelui";
import type { ReactNode } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { indicator: string; delayMs: number; closeDelayMs: number; arrow: boolean };

const defaults: DemoProps = { indicator: "pill", delayMs: 150, closeDelayMs: 250, arrow: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "indicator", label: "Indicator", options: ["pill", "underline", "none"] },
  { type: "number", prop: "delayMs", label: "Open delay (ms)", min: 0, max: 600, step: 50 },
  { type: "number", prop: "closeDelayMs", label: "Close delay (ms)", min: 50, max: 800, step: 50 },
  { type: "boolean", prop: "arrow", label: "Arrow" },
];

function Glyph({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "info" }) {
  const tones = {
    primary: "bg-pui-primary/12 text-pui-primary-text",
    success: "bg-pui-success/12 text-pui-success-text",
    warning: "bg-pui-warning/14 text-pui-warning-text",
    info: "bg-pui-info/12 text-pui-info-text",
  } as const;
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-pui-md ${tones[tone]}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

function Entry({ title, body, glyph, tone, href = "#" }: { title: string; body: string; glyph: ReactNode; tone?: "primary" | "success" | "warning" | "info"; href?: string }) {
  return (
    <NavigationMenuLink href={href} onClick={(event) => event.preventDefault()} className="flex-row items-start gap-3">
      <Glyph tone={tone}>{glyph}</Glyph>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-xs leading-snug text-pui-muted-foreground">{body}</span>
      </span>
    </NavigationMenuLink>
  );
}

function SiteNav(props: Partial<NavigationMenuProps>) {
  return (
    <NavigationMenu {...props} label="Product site">
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[30rem] max-w-full grid-cols-1 gap-1 sm:grid-cols-2">
              <Entry title="Analytics" body="Dashboards that update as events arrive." glyph={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />} />
              <Entry title="Automations" body="Trigger workflows from any signal." tone="warning" glyph={<path d="M13 2 4 14h7l-1 8 9-12h-7Z" />} />
              <Entry title="Storage" body="Versioned files with instant previews." tone="info" glyph={<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5Z" />} />
              <Entry title="Security" body="SSO, audit logs and fine-grained roles." tone="success" glyph={<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z" />} />
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="solutions">
          <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[22rem] max-w-full grid-cols-2 gap-x-2 gap-y-0.5 p-1">
              <span className="col-span-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-pui-muted-foreground">By team</span>
              {["Engineering", "Design", "Marketing", "Support", "Sales", "Finance"].map((team) => (
                <NavigationMenuLink key={team} href="#" onClick={(event) => event.preventDefault()} className="py-2">
                  {team}
                </NavigationMenuLink>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="developers">
          <NavigationMenuTrigger>Developers</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="flex w-[26rem] max-w-full gap-2">
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="flex w-40 shrink-0 flex-col justify-end gap-1 rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 p-4 text-sm text-pui-primary-foreground no-underline outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
              >
                <span className="font-semibold">API v3 is here</span>
                <span className="text-xs opacity-85">Streaming, webhooks and typed SDKs.</span>
              </a>
              <div className="flex flex-1 flex-col">
                {[
                  ["Docs", "Guides and references"],
                  ["Changelog", "What shipped this week"],
                  ["Status", "Uptime and incidents"],
                ].map(([title, body]) => (
                  <NavigationMenuLink key={title} href="#" onClick={(event) => event.preventDefault()} className="py-2">
                    <span className="font-medium">{title}</span>
                    <span className="text-xs text-pui-muted-foreground">{body}</span>
                  </NavigationMenuLink>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" onClick={(event) => event.preventDefault()}>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" active onClick={(event) => event.preventDefault()}>
            Blog
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex min-h-[23rem] w-full justify-center pt-2">
      <SiteNav
        indicator={props.indicator as NavigationMenuIndicator}
        delayMs={props.delayMs}
        closeDelayMs={props.closeDelayMs}
        arrow={props.arrow}
      />
    </div>
  );
}

function HeaderDemo() {
  return (
    <div className="flex min-h-[22rem] w-full flex-col">
      <header className="flex items-center justify-between gap-4 rounded-pui-xl border border-pui-border bg-pui-surface px-4 py-2 shadow-pui-sm">
        <span className="flex items-center gap-2 text-sm font-semibold text-pui-surface-foreground">
          <span className="size-5 rounded-pui-md bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3" aria-hidden="true" />
          Acme
        </span>
        <SiteNav indicator="underline" arrow={false} />
        <span className="hidden text-xs text-pui-muted-foreground sm:inline">Sign in</span>
      </header>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="flex w-40 flex-col items-center gap-1.5">
      <div className="flex gap-1 text-[10px] font-medium text-pui-muted-foreground">
        <span className="rounded-pui-sm bg-pui-muted px-1.5 py-0.5 text-pui-foreground">Products</span>
        <span className="px-1.5 py-0.5">Solutions</span>
        <span className="px-1.5 py-0.5">Pricing</span>
      </div>
      <div className="grid w-36 grid-cols-2 gap-1 rounded-pui-md border border-pui-border bg-pui-surface p-1.5 shadow-pui-md">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="size-3 rounded-pui-sm bg-pui-primary/20" />
            <span className="h-1.5 flex-1 rounded-pui-full bg-pui-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ indicator, delayMs, closeDelayMs, arrow }) => {
    const rootProps = [
      indicator !== "pill" ? `indicator="${indicator}"` : "",
      delayMs !== 150 ? `delayMs={${delayMs}}` : "",
      closeDelayMs !== 250 ? `closeDelayMs={${closeDelayMs}}` : "",
      arrow ? "" : "arrow={false}",
    ]
      .filter(Boolean)
      .join(" ");
    return [
      `<NavigationMenu${rootProps ? ` ${rootProps}` : ""}>`,
      "  <NavigationMenuList>",
      '    <NavigationMenuItem value="products">',
      "      <NavigationMenuTrigger>Products</NavigationMenuTrigger>",
      "      <NavigationMenuContent>",
      '        <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>',
      '        <NavigationMenuLink href="/automations">Automations</NavigationMenuLink>',
      "      </NavigationMenuContent>",
      "    </NavigationMenuItem>",
      "    <NavigationMenuItem>",
      '      <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>',
      "    </NavigationMenuItem>",
      "  </NavigationMenuList>",
      "</NavigationMenu>",
    ].join("\n");
  },
  propsTable: propDocs<NavigationMenuProps>()([
    { name: "value", type: "string", description: 'Controlled open item ("" when closed).' },
    { name: "defaultValue", type: "string", default: '""', description: "Initially open item." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called when an item opens or the menu closes." },
    { name: "delayMs", type: "number", default: "150", description: "Hover time before the first panel opens; switching is instant." },
    { name: "closeDelayMs", type: "number", default: "250", description: "Grace period after the pointer leaves." },
    { name: "indicator", type: '"pill" | "underline" | "none"', default: '"pill"', description: "Highlight that slides between items." },
    { name: "arrow", type: "boolean", default: "true", description: "Caret on the panel pointing at the open trigger." },
    { name: "viewportClassName", type: "string", description: "Classes for the floating panel surface." },
    { name: "label", type: "string", default: '"Main"', description: "Accessible name of the nav landmark." },
  ]).concat([
    { name: "NavigationMenuItem value", type: "string", description: "Identifies the item; generated when omitted." },
    { name: "NavigationMenuLink active", type: "boolean", default: "false", description: 'Current page: aria-current="page".' },
    { name: "NavigationMenuLink asChild", type: "boolean", default: "false", description: "Render your router's link as the child." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Toggle the focused trigger's panel" },
    { keys: "ArrowDown", action: "Open the panel and move into it" },
    { keys: "Tab", action: "From an open trigger, into its panel; out of the last link, on to the next item" },
    { keys: "ArrowLeft / ArrowRight", action: "Move between top-level items" },
    { keys: "Escape", action: "Close and return focus to the trigger" },
  ],
  a11y: [
    "A labelled nav landmark using the disclosure pattern, not role=menu: triggers are buttons with aria-expanded and aria-controls.",
    "Panels are regions labelled by their trigger; links stay real links, with aria-current on the active page.",
    "Top-level links render on the server; panels mount only when opened.",
  ],
  reducedMotion: "No sliding: the highlight, panel size and position jump into place and content only fades.",
  examples: [{ title: "In a header", description: "Underline indicator, no arrow.", Demo: HeaderDemo, wide: true }],
};

export default item;
