/**
 * 404: Lost in space. A glitching "404" over a starfield that drifts toward the pointer and jumps
 * to warp speed while you hover or focus the way home. A quick search filters the most visited
 * pages, and the link list stays useful for keyboard and screen reader users.
 *
 * Copy-only template. It is responsive to its container (container queries). Replace POPULAR with
 * your own routes. Wrap your app in <MotionConfig reducedMotion="user">; under reduced motion the
 * stars hold still and the glitch is off.
 */
import { Button } from "changelui/button";
import { GlitchText } from "changelui/glitch-text";
import { Input } from "changelui/input";
import { Kbd } from "changelui/kbd";
import { Starfield } from "changelui/starfield";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";

const POPULAR = [
  { title: "Documentation", path: "/docs", body: "Guides and API reference" },
  { title: "Pricing", path: "/pricing", body: "Plans for every team size" },
  { title: "Changelog", path: "/changelog", body: "What shipped recently" },
  { title: "Status", path: "/status", body: "Uptime and incidents" },
  { title: "Contact support", path: "/support", body: "Talk to a human" },
  { title: "Blog", path: "/blog", body: "Stories from the team" },
];

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-pui-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export default function NotFound() {
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const [warp, setWarp] = useState(false);
  const [query, setQuery] = useState("");
  const [reported, setReported] = useState(false);
  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return POPULAR;
    return POPULAR.filter((page) => fold(`${page.title} ${page.path} ${page.body}`).includes(q));
  }, [query]);

  const warpOn = () => setWarp(true);
  const warpOff = () => setWarp(false);

  return (
    <section className="@container relative isolate min-h-[640px] overflow-hidden bg-pui-background text-pui-foreground">
      <Starfield warp={warp} density={0.0011} mask="radial" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-radial from-transparent from-30% to-pui-background" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 px-5 py-20 text-center @3xl:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pui-primary-text">Error 404</p>
        <h1 className="flex flex-col items-center gap-4">
          <GlitchText trigger="loop" intervalMs={2600} intensity={1.4} className="text-8xl font-black leading-none tracking-tighter @xl:text-[10rem]">
            404
          </GlitchText>
          <span className="text-balance text-2xl font-bold tracking-tight @xl:text-3xl">This page drifted out of orbit</span>
        </h1>
        <p className="max-w-md text-pretty text-pui-muted-foreground">
          The link may be old or the page moved. Head back home, or search for where you meant to go.
        </p>

        <div className="flex w-full flex-col justify-center gap-3 @md:w-auto @md:flex-row">
          <Button
            size="lg"
            leadingIcon={<HomeIcon />}
            onPointerEnter={warpOn}
            onPointerLeave={warpOff}
            onFocus={warpOn}
            onBlur={warpOff}
            className="w-full @md:w-auto"
          >
            Take me home
          </Button>
          <Button
            size="lg"
            variant="outline"
            tone="neutral"
            className="w-full bg-pui-background/60 @md:w-auto"
            onClick={() => setReported(true)}
          >
            {reported ? "Thanks, we're on it" : "Report a broken link"}
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {reported ? "Broken link reported. Thank you." : ""}
        </p>

        <div className="w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface/80 p-3 text-start shadow-pui-lg backdrop-blur-sm">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search pages
          </label>
          <Input
            id={`${id}-search`}
            type="search"
            placeholder="Search pages…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            leadingIcon={<SearchIcon />}
            trailingIcon={<Kbd size="sm">esc</Kbd>}
            aria-controls={`${id}-results`}
          />
          <p className="sr-only" aria-live="polite">
            {query ? `${results.length} ${results.length === 1 ? "page" : "pages"} found` : ""}
          </p>
          <ul id={`${id}-results`} aria-label="Popular pages" className="mt-2 flex max-h-56 flex-col overflow-y-auto">
            <AnimatePresence initial={false} mode="popLayout">
              {results.map((page) => (
                <motion.li
                  key={page.path}
                  layout={!reduced}
                  initial={{ opacity: 0, y: reduced ? 0 : -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: reduced ? 0.15 : 0.2 }}
                >
                  <a
                    href={page.path}
                    onClick={(event) => event.preventDefault()}
                    className="group flex items-center gap-3 rounded-pui-md px-3 py-2 text-sm text-pui-foreground no-underline hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{page.title}</span>
                      <span className="truncate text-xs text-pui-muted-foreground">{page.body}</span>
                    </span>
                    <code className="hidden font-pui-mono text-xs text-pui-muted-foreground @md:inline">{page.path}</code>
                    <ArrowIcon />
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-pui-muted-foreground">
                Nothing matches "{query}". Try <span className="font-medium text-pui-foreground">docs</span> or{" "}
                <span className="font-medium text-pui-foreground">pricing</span>.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
