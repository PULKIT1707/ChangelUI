/**
 * Navbar: Shrink. A sticky site header that is tall and transparent at the top of the page, then
 * shrinks (h-16 to h-12), frosts and scales its logo to 0.9 once you scroll. Scrolling down also
 * folds the announcement bar away; scrolling up brings it back. Mega menus on wide containers, a
 * drawer with the same links on narrow ones, a light/dark toggle and a theme preset picker.
 *
 * Copy-only template. It is responsive to its container (container queries). The preview scrolls
 * its own box; in an app, drop `container` from useScrollDirection to follow the window and render
 * <SiteNavbar /> at the top of your layout. Wrap your app in <MotionConfig reducedMotion="user">.
 */
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "changelui/collapsible";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "changelui/drawer";
import { IconButton } from "changelui/icon-button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "changelui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "changelui/popover";
import { ThemeSwitcher } from "changelui/theme-switcher";
import { ThemeToggle } from "changelui/theme-toggle";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { useScrollDirection } from "changelui/use-scroll-direction";
import { motion } from "motion/react";
import { useRef, useState, type ReactNode, type RefObject } from "react";

interface NavLink {
  title: string;
  body: string;
  icon: ReactNode;
}

const PRODUCT: NavLink[] = [
  { title: "Analytics", body: "Live dashboards from any event stream.", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  { title: "Automations", body: "Trigger workflows from any signal.", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" /> },
  { title: "Storage", body: "Versioned files with instant previews.", icon: <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5Z" /> },
  { title: "Security", body: "SSO, audit logs and fine-grained roles.", icon: <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z" /> },
];

const RESOURCES: NavLink[] = [
  { title: "Documentation", body: "Guides, recipes and the API reference.", icon: <path d="M5 4h10l4 4v12H5zM14 4v5h5" /> },
  { title: "Changelog", body: "What shipped this week.", icon: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> },
  { title: "Community", body: "Ask questions, share what you built.", icon: <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 20v-2a4 4 0 0 0-3-3.9" /> },
];

const prevent = (event: { preventDefault: () => void }) => event.preventDefault();

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-pui-md border border-pui-border bg-pui-surface text-pui-primary-text">
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

function MenuEntry({ link }: { link: NavLink }) {
  return (
    <NavigationMenuLink href="#" onClick={prevent} className="flex-row items-start gap-3">
      <Glyph>{link.icon}</Glyph>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{link.title}</span>
        <span className="text-xs leading-snug text-pui-muted-foreground">{link.body}</span>
      </span>
    </NavigationMenuLink>
  );
}

function Logo({ compact }: { compact: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.a
      href="#"
      onClick={prevent}
      aria-label="Halcyon home"
      animate={{ scale: compact ? 0.9 : 1 }}
      transition={reduced ? { duration: 0 } : springs.smooth}
      className="flex origin-left items-center gap-2 rounded-pui-md font-semibold tracking-tight text-pui-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
    >
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 text-pui-primary-foreground shadow-pui-sm">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M4 15c3-6 13-6 16 0M8 15c1.5-2.5 6.5-2.5 8 0" />
        </svg>
      </span>
      <span className="text-lg">Halcyon</span>
    </motion.a>
  );
}

function PaletteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.4 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
      <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const groups: [string, NavLink[]][] = [
    ["Product", PRODUCT],
    ["Resources", RESOURCES],
  ];
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <IconButton aria-label="Open menu" variant="ghost" tone="neutral">
          <MenuIcon />
        </IconButton>
      </DrawerTrigger>
      <DrawerContent side="right" size="sm">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <nav aria-label="Main" className="flex flex-col gap-1 px-1">
          {groups.map(([label, links]) => (
            <Collapsible key={label} defaultOpen={label === "Product"} className="border-b border-pui-border pb-1">
              <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-pui-md px-3 py-2.5 text-sm font-semibold hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring aria-expanded:[&>svg]:rotate-180">
                {label}
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-pui-muted-foreground transition-transform duration-200 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="flex flex-col pb-2">
                  {links.map((link) => (
                    <li key={link.title}>
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-pui-md px-3 py-2 text-sm text-pui-foreground no-underline hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring"
                      >
                        <Glyph>{link.icon}</Glyph>
                        <span className="flex flex-col">
                          <span className="font-medium">{link.title}</span>
                          <span className="text-xs text-pui-muted-foreground">{link.body}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
          {["Pricing", "Customers"].map((label) => (
            <a
              key={label}
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setOpen(false);
              }}
              className="rounded-pui-md px-3 py-2.5 text-sm font-semibold text-pui-foreground no-underline hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-4 px-1">
          <div className="flex flex-col gap-2">
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-pui-muted-foreground">Theme</span>
            <ThemeSwitcher size="sm" className="flex-wrap px-3" />
          </div>
          <Button fullWidth>Start free</Button>
          <Button fullWidth variant="outline" tone="neutral">
            Sign in
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export interface SiteNavbarProps {
  /** Scroll box to watch. Omit it to follow the window. */
  container?: RefObject<HTMLElement | null>;
}

export function SiteNavbar({ container }: SiteNavbarProps) {
  const direction = useScrollDirection({ container, threshold: 6 });
  const reduced = usePrefersReducedMotion();
  const compact = direction !== "top";
  const hideBar = direction === "down";
  const spring = reduced ? { duration: 0 } : springs.smooth;

  return (
    <header className="@container sticky top-0 z-40">
      <motion.div
        initial={false}
        animate={{ height: hideBar ? 0 : "auto", opacity: hideBar ? 0 : 1 }}
        transition={spring}
        className="overflow-hidden bg-pui-primary text-pui-primary-foreground"
      >
        <p className="flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium @xl:text-sm">
          <Badge size="sm" variant="solid" tone="neutral" className="bg-pui-primary-foreground/15 text-pui-primary-foreground">
            New
          </Badge>
          Workflows 2.0 is live: branching, retries and a visual debugger.
          <a href="#" onClick={prevent} className="hidden font-semibold text-inherit underline underline-offset-2 @xl:inline">
            Read the post
          </a>
        </p>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ height: compact ? 48 : 64 }}
        transition={spring}
        data-state={compact ? "compact" : "expanded"}
        className="flex items-center border-b border-transparent px-4 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300 data-[state=compact]:border-pui-border data-[state=compact]:bg-pui-background/75 data-[state=compact]:shadow-pui-sm data-[state=compact]:backdrop-blur-md motion-reduce:transition-none @3xl:px-6"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <Logo compact={compact} />

          <div className="ms-6 hidden @3xl:block">
            <NavigationMenu label="Main" indicator="pill" arrow>
              <NavigationMenuList>
                <NavigationMenuItem value="product">
                  <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[30rem] max-w-full grid-cols-2 gap-1">
                      {PRODUCT.map((link) => (
                        <MenuEntry key={link.title} link={link} />
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem value="resources">
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="flex w-[28rem] max-w-full gap-2">
                      <a
                        href="#"
                        onClick={prevent}
                        className="flex w-40 shrink-0 flex-col justify-end gap-1 rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 p-4 text-sm text-pui-primary-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
                      >
                        <span className="font-semibold">Halcyon Summit</span>
                        <span className="text-xs opacity-85">Talks, workshops and the roadmap. Free to stream.</span>
                      </a>
                      <div className="flex flex-1 flex-col">
                        {RESOURCES.map((link) => (
                          <MenuEntry key={link.title} link={link} />
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="#" onClick={prevent}>
                    Pricing
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="#" onClick={prevent}>
                    Customers
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="ms-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-1 @3xl:flex">
              <Popover>
                <PopoverTrigger asChild>
                  <IconButton aria-label="Theme preset" variant="ghost" tone="neutral" size="sm">
                    <PaletteIcon />
                  </IconButton>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-pui-muted-foreground">Theme preset</p>
                  <ThemeSwitcher size="sm" />
                </PopoverContent>
              </Popover>
              <ThemeToggle size="sm" variant="ghost" tone="neutral" />
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-pui-border" />
              <Button size="sm" variant="ghost" tone="neutral">
                Sign in
              </Button>
              <Button size="sm">Start free</Button>
            </div>
            <div className="@3xl:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </motion.div>
    </header>
  );
}

/** Preview: a scrollable page so the header has something to shrink against. */
export default function NavbarShrink() {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="@container bg-pui-background text-pui-foreground">
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Page preview, scroll to shrink the header"
        className="relative h-[640px] overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pui-ring"
      >
        <SiteNavbar container={scrollRef} />
        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-16 pb-24 @3xl:px-6">
          <div className="flex max-w-2xl flex-col gap-4">
            <span className="text-sm font-semibold text-pui-primary-text">Scroll this box</span>
            <h1 className="text-balance text-4xl font-bold tracking-tight @3xl:text-5xl">The header shrinks, frosts and gets out of the way.</h1>
            <p className="text-pretty text-pui-muted-foreground">
              Scroll down and the announcement bar folds away while the bar drops to 48px. Scroll up and it returns. The direction hook ignores small
              trackpad jitter and only re-renders when the direction actually changes.
            </p>
          </div>
          <div className="grid gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="flex h-44 flex-col justify-end gap-2 rounded-pui-xl border border-pui-border bg-pui-surface p-5">
                <span className="h-2.5 w-1/3 rounded-full bg-pui-muted" />
                <span className="h-2.5 w-2/3 rounded-full bg-pui-muted" />
                <span className="h-2.5 w-1/2 rounded-full bg-pui-muted" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
