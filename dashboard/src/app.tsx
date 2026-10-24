import { Skeleton } from "changelui";
import { useLatestRef } from "@pui-src/lib/use-latest-ref";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CommandPalette } from "./components/command-palette";
import { ConsentBanner } from "./components/consent-banner";
import { Sidebar } from "./components/sidebar";
import { TopBar } from "./components/top-bar";
import { analytics } from "./lib/analytics/client";
import { pageviewProps } from "./lib/analytics/route-props";
import { NotFound } from "./pages/not-found";
import { getItem } from "./registry";
import { getTemplate } from "./registry/templates";
import { routeKey, routeTitle, useRoute, type Route } from "./router";

// Code-split pages (roadmap I-2): the shell loads first and each page is its own chunk, so the
// first load stays flat as the catalog grows. Every page chunk is prefetched once the browser is idle.
const pageLoaders = {
  home: () => import("./pages/home"),
  category: () => import("./pages/category"),
  charts: () => import("./pages/charts"),
  item: () => import("./pages/item-page"),
  installation: () => import("./pages/installation"),
  theming: () => import("./pages/theming"),
  themes: () => import("./pages/themes"),
  privacy: () => import("./pages/privacy"),
  templates: () => import("./pages/templates"),
  picks: () => import("./pages/picks"),
};

const Home = lazy(() => pageLoaders.home().then((m) => ({ default: m.Home })));
const CategoryPage = lazy(() => pageLoaders.category().then((m) => ({ default: m.CategoryPage })));
const ChartsPage = lazy(() => pageLoaders.charts().then((m) => ({ default: m.ChartsPage })));
const ItemPage = lazy(() => pageLoaders.item().then((m) => ({ default: m.ItemPage })));
const Installation = lazy(() => pageLoaders.installation().then((m) => ({ default: m.Installation })));
const Theming = lazy(() => pageLoaders.theming().then((m) => ({ default: m.Theming })));
const Themes = lazy(() => pageLoaders.themes().then((m) => ({ default: m.Themes })));
const Privacy = lazy(() => pageLoaders.privacy().then((m) => ({ default: m.Privacy })));
const TemplatesPage = lazy(() => pageLoaders.templates().then((m) => ({ default: m.TemplatesPage })));
const PicksPage = lazy(() => pageLoaders.picks().then((m) => ({ default: m.PicksPage })));
const TemplatePage = lazy(() => pageLoaders.templates().then((m) => ({ default: m.TemplatePage })));

function prefetchPages(): () => void {
  const run = () => {
    for (const load of Object.values(pageLoaders)) void load().catch(() => undefined);
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
}

/** Suspense fallback: a quiet page-shaped skeleton (no h1, so focus waits for the real page). */
function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 px-4 pb-16 pt-10 sm:px-8 sm:pt-14">
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </div>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.kind) {
    case "home":
      return <Home filter={route.filter} />;
    case "category":
      if (route.category === "charts") return <ChartsPage key="charts" intent={route.intent ?? null} />;
      return <CategoryPage key={route.category} category={route.category} tag={route.tag} />;
    case "docs":
      if (route.slug === "themes") return <Themes />;
      if (route.slug === "privacy") return <Privacy />;
      return route.slug === "installation" ? <Installation /> : <Theming />;
    case "item": {
      const entry = getItem(route.category, route.slug);
      return entry ? <ItemPage key={entry.slug} entry={entry} tab={route.tab} /> : <NotFound />;
    }
    case "templates":
      return <TemplatesPage group={route.group} />;
    case "template": {
      const entry = getTemplate(route.slug);
      return entry ? <TemplatePage key={entry.slug} entry={entry} tab={route.tab} /> : <NotFound />;
    }
    case "picks":
      return <PicksPage filter={route.filter} />;
    case "notFound":
      return <NotFound />;
  }
}

/** True when the element sits in a subtree Suspense hid with an inline `display: none`. */
function hiddenBySuspense(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node.id !== "content"; node = node.parentElement) {
    if (node.style.display === "none") return true;
  }
  return false;
}

/**
 * Focuses the page h1. A lazy page may still be loading, so this waits (up to 5s) for the heading
 * to appear under #content. Returns a cleanup.
 */
function focusHeadingWhenReady(): () => void {
  const focus = () => {
    // While a lazy page loads, Suspense keeps the previous page in the DOM but hidden (display: none),
    // so only a rendered h1 counts.
    const heading = [...document.querySelectorAll<HTMLElement>("#content h1")].find((el) => !hiddenBySuspense(el));
    if (!heading) return false;
    heading.focus({ preventScroll: true });
    return true;
  };
  if (focus()) return () => undefined;
  const content = document.getElementById("content");
  if (!content || typeof MutationObserver === "undefined") return () => undefined;
  const observer = new MutationObserver(() => {
    if (focus()) stop();
  });
  const timer = window.setTimeout(() => stop(), 5000);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
  }
  observer.observe(content, { childList: true, subtree: true });
  return stop;
}

/** Dashboard shell (design 10.3): skip link, top bar, sidebar at lg+, main and the command palette. */
export function App() {
  const route = useRoute();
  const key = routeKey(route);
  const title = routeTitle(route);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const lastKey = useRef(key);
  const routeRef = useLatestRef(route);

  useEffect(() => prefetchPages(), []);

  // One pageview per page (routeKey), so ?tab, ?filter and ?tag changes are not counted again.
  useEffect(() => analytics.pageview(pageviewProps(routeRef.current)), [key, routeRef]);

  // On navigation: scroll to the top, update the title and move focus to the page h1. The initial
  // page keeps focus where it is, so the skip link stays the first tab stop. ?tab, ?filter and ?tag
  // changes keep the same key and do not move focus.
  useEffect(() => {
    document.title = `${title} · ChangelUI`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    window.scrollTo({ top: 0 });
    return focusHeadingWhenReady();
  }, [key, title]);

  return (
    <>
      <a
        href="#content"
        onClick={(event) => {
          // A plain #content would change the hash and hit the router.
          event.preventDefault();
          document.getElementById("content")?.focus();
        }}
        className="sr-only z-50 rounded-pui-md bg-pui-primary px-3 py-2 text-sm font-medium text-pui-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <ConsentBanner />
      <TopBar route={route} onSearch={() => setPaletteOpen(true)} themeToggleRef={themeToggleRef} />
      <Sidebar route={route} />
      <div className="lg:pl-[260px]">
        <main id="content" tabIndex={-1} className="min-w-0 pb-[var(--pui-consent-offset,0px)] outline-none">
          <Suspense fallback={<PageSkeleton />}>
            <Page route={route} />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} themeToggleRef={themeToggleRef} />
    </>
  );
}
