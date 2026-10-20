import { Badge, cn, Input, Kbd } from "changelui";
import { springs } from "@pui-src/lib/motion";
import { usePrefersReducedMotion } from "@pui-src/lib/use-reduced-motion";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CATEGORIES, type Category } from "../../../scripts/entries";
import { CATEGORY_LABELS } from "../lib/nav";
import { groupByTag } from "../lib/tags";
import { registryMeta } from "../registry/meta";
import { categoryHref, docHref, homeHref, itemHref, templatesHref, type Route } from "../router";

interface NavLink {
  key: string;
  href: string;
  label: string;
  /** Lowercased text the filter matches against. */
  haystack: string;
  isNew?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  /** The group's overview page (category pages); absent for "Getting started". */
  href?: string;
  count?: number;
  /** Sub-groups by primary tag; a single sub-group renders without a heading. */
  sections: { label: string | null; links: NavLink[] }[];
}

const doc = (key: string, href: string, label: string, isNew?: boolean): NavLink => ({
  key,
  href,
  label,
  haystack: `${label} docs guide`.toLowerCase(),
  isNew,
});

const START: NavGroup = {
  key: "start",
  label: "Getting started",
  sections: [
    {
      label: null,
      links: [
        doc("home", homeHref(), "Introduction"),
        doc("docs/installation", docHref("installation"), "Installation"),
        doc("docs/theming", docHref("theming"), "Theming"),
        doc("docs/themes", docHref("themes"), "Themes", true),
        { ...doc("templates", templatesHref(), "Templates", true), haystack: "templates blocks sections hero pricing faq landing copy" },
      ],
    },
  ],
};

function categoryGroup(category: Category): NavGroup | null {
  const metas = registryMeta.filter((meta) => meta.category === category);
  if (metas.length === 0) return null; // a new category shows up once it has an item
  const sections = groupByTag(category, metas).map((group) => ({
    label: group.tag,
    links: group.items.map((meta) => ({
      key: `item/${meta.slug}`,
      href: itemHref(category, meta.slug),
      label: meta.title,
      haystack: [meta.title, meta.slug, group.tag, ...meta.keywords].join(" ").toLowerCase(),
      isNew: meta.isNew,
    })),
  }));
  const grouped = sections.length === 1 ? sections.map((section) => ({ ...section, label: null })) : sections;
  // Charts open with the chart chooser (#/charts), so "which chart do I need?" is one click away.
  const overview: NavGroup["sections"] =
    category === "charts"
      ? [
          {
            label: null,
            links: [
              {
                key: "category/charts",
                href: categoryHref(category),
                label: "Chart chooser",
                haystack: "chart chooser gallery which chart intent overview",
              },
            ],
          },
        ]
      : [];
  return {
    key: category,
    label: CATEGORY_LABELS[category],
    href: categoryHref(category),
    count: metas.length,
    sections: [...overview, ...grouped],
  };
}

const GROUPS: NavGroup[] = [START, ...CATEGORIES.flatMap((category) => categoryGroup(category) ?? [])];

function activeKey(route: Route): string | null {
  if (route.kind === "home") return "home";
  if (route.kind === "docs") return `docs/${route.slug}`;
  if (route.kind === "item") return `item/${route.slug}`;
  if (route.kind === "category") return `category/${route.category}`;
  if (route.kind === "templates" || route.kind === "template") return "templates";
  return null;
}

/** The group holding the active page, so a collapsed group opens when you land on one of its pages. */
function activeGroup(route: Route): string | null {
  if (route.kind === "home" || route.kind === "docs" || route.kind === "templates" || route.kind === "template") return START.key;
  if (route.kind === "item" || route.kind === "category") return route.category;
  return null;
}

const COLLAPSED_KEY = "pui-dashboard-nav-collapsed";

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const known = new Set(GROUPS.map((group) => group.key));
    return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string" && known.has(key)) : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(collapsed: Set<string>): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Blocked storage: the open/closed state simply is not remembered.
  }
}

function filterGroups(query: string): NavGroup[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return GROUPS;
  const matches = (link: NavLink) => terms.every((term) => link.haystack.includes(term));
  return GROUPS.flatMap((group) => {
    const sections = group.sections
      .map((section) => ({ ...section, links: section.links.filter(matches) }))
      .filter((section) => section.links.length > 0);
    return sections.length > 0 ? [{ ...group, sections }] : [];
  });
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

function Chevron({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{ rotate: open ? 90 : 0 }}
      transition={reduced ? { duration: 0 } : springs.snappy}
    >
      <path d="m6 4 4 4-4 4" />
    </motion.svg>
  );
}

export interface NavContentProps {
  route: Route;
  /** Namespaces the sliding pill so the sidebar and the drawer never animate into each other. */
  layoutGroup: string;
  onNavigate?: () => void;
  /** "/" focuses the filter (the always-mounted desktop sidebar only). */
  filterShortcut?: boolean;
  /** Background of the sticky filter bar, matching the surface it sits on. */
  filterClassName?: string;
  className?: string;
}

/**
 * Sidebar navigation shared by the desktop sidebar and the mobile drawer (roadmap I-3): a sticky
 * filter, collapsible groups whose open state persists in localStorage, and tag sub-groups per
 * category. Filtering opens every group with a match; the active page's group always opens.
 */
export function NavContent({ route, layoutGroup, onNavigate, filterShortcut = false, filterClassName, className }: NavContentProps) {
  const active = activeKey(route);
  const currentGroup = activeGroup(route);
  const reduced = usePrefersReducedMotion();
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // Landing on a page inside a collapsed group opens that group (adjusting state during render).
  const [openedFor, setOpenedFor] = useState(currentGroup);
  if (openedFor !== currentGroup) {
    setOpenedFor(currentGroup);
    if (currentGroup !== null && collapsed.has(currentGroup)) {
      const next = new Set(collapsed);
      next.delete(currentGroup);
      setCollapsed(next);
      writeCollapsed(next);
    }
  }

  const filtering = query.trim() !== "";
  const groups = filterGroups(query);
  const matchCount = groups.reduce((sum, group) => sum + group.sections.reduce((n, section) => n + section.links.length, 0), 0);

  useEffect(() => {
    if (active === null) return;
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    if (!filterShortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return; // hidden below lg
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterShortcut]);

  const toggle = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
    writeCollapsed(next);
  };

  const onFilterKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      event.stopPropagation(); // keep the drawer open while clearing
      setQuery("");
    } else if (event.key === "ArrowDown") {
      const first = listRef.current?.querySelector<HTMLAnchorElement>("a[data-nav-link]");
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "Enter" && filtering) {
      const first = listRef.current?.querySelector<HTMLAnchorElement>("a[data-nav-link]");
      if (first) {
        event.preventDefault();
        setQuery("");
        first.click();
      }
    }
  };

  const transition = reduced ? { duration: 0 } : springs.smooth;

  return (
    <LayoutGroup id={layoutGroup}>
      <div className={cn("flex flex-col", className)}>
        <div className={cn("sticky top-0 z-10 -mx-1 px-1 pb-3 pt-1", filterClassName)}>
          <Input
            ref={inputRef}
            type="search"
            size="sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onFilterKey}
            placeholder="Filter…"
            aria-label="Filter navigation"
            aria-describedby={`${baseId}-status`}
            autoComplete="off"
            spellCheck={false}
            leadingIcon={<SearchIcon />}
            trailingIcon={filterShortcut && !filtering ? <Kbd className="pointer-events-none">/</Kbd> : undefined}
            wrapperClassName="w-full"
          />
          <p id={`${baseId}-status`} aria-live="polite" className="sr-only">
            {filtering ? `${matchCount} ${matchCount === 1 ? "match" : "matches"}` : ""}
          </p>
        </div>

        <div ref={listRef} className="flex flex-col gap-4">
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-pui-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
          ) : null}
          {groups.map((group) => {
            const open = filtering || !collapsed.has(group.key);
            const panelId = `${baseId}-${group.key}`;
            const categoryActive = active === `category/${group.key}`;
            return (
              <section key={group.key} aria-labelledby={`${panelId}-label`}>
                <div className="flex items-center gap-1">
                  <h2 className="min-w-0 flex-1">
                    <button
                      type="button"
                      id={`${panelId}-label`}
                      aria-expanded={open}
                      aria-controls={panelId}
                      disabled={filtering}
                      onClick={() => toggle(group.key)}
                      className="flex w-full items-center gap-1.5 rounded-pui-md px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground transition-colors hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring disabled:cursor-default disabled:hover:text-pui-muted-foreground"
                    >
                      <Chevron open={open} reduced={reduced} />
                      <span className="truncate">{group.label}</span>
                    </button>
                  </h2>
                  {group.href !== undefined && group.count !== undefined ? (
                    <a
                      href={group.href}
                      onClick={onNavigate}
                      aria-current={categoryActive ? "page" : undefined}
                      aria-label={`All ${group.label.toLowerCase()}, ${group.count} items`}
                      title={`All ${group.label.toLowerCase()}`}
                      className={cn(
                        "shrink-0 rounded-pui-full px-2 py-0.5 text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring",
                        categoryActive
                          ? "bg-pui-primary text-pui-primary-foreground"
                          : "text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground",
                      )}
                    >
                      {group.count}
                    </a>
                  ) : null}
                </div>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      key="panel"
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={transition}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 pt-1">
                        {group.sections.map((section, sectionIndex) => (
                          <div key={section.label ?? `all-${sectionIndex}`}>
                            {section.label !== null ? (
                              <h3 className="flex items-center gap-2 px-3 pb-0.5 pt-1 text-xs font-medium text-pui-muted-foreground">
                                <span aria-hidden="true" className="h-px w-2 bg-pui-border" />
                                {section.label}
                              </h3>
                            ) : null}
                            <ul className="flex flex-col gap-0.5">
                              {section.links.map((link) => {
                                const current = link.key === active;
                                return (
                                  <li key={link.key}>
                                    <a
                                      href={link.href}
                                      data-nav-link=""
                                      aria-current={current ? "page" : undefined}
                                      onClick={onNavigate}
                                      className={cn(
                                        "relative isolate flex items-center justify-between gap-2 rounded-pui-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring",
                                        current ? "font-medium text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                                      )}
                                    >
                                      {current ? (
                                        <motion.span
                                          layoutId="sidebar-active"
                                          transition={reduced ? { duration: 0 } : springs.snappy}
                                          aria-hidden="true"
                                          className="absolute inset-0 -z-10 rounded-pui-md bg-pui-muted"
                                        />
                                      ) : null}
                                      <span className="truncate">{link.label}</span>
                                      {link.isNew ? (
                                        <Badge tone="primary" size="sm">
                                          New
                                        </Badge>
                                      ) : null}
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}
