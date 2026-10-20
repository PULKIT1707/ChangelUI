import {
  Alert,
  Badge,
  Button,
  CopyButton,
  GridPattern,
  IconButton,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Skeleton,
  SpotlightCard,
  Tooltip,
  THEME_PRESETS,
  useElementSize,
} from "changelui";
import { cn } from "@pui-src/lib/cn";
import { useLatestRef } from "@pui-src/lib/use-latest-ref";
import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { CodeBlock } from "../components/code-block";
import { PlayAllSwitch } from "../components/bento-grid";
import { CATEGORY_LABELS, INSTALL_COMMAND } from "../lib/nav";
import { tagSlug } from "../lib/tags";
import { registryMeta } from "../registry/meta";
import { TEMPLATE_GROUPS, templates, templateUses, type TemplateEntry } from "../registry/templates";
import { homeHref, itemHref, navigate, templateHref, templatesHref, type Tab } from "../router";

// ---------------------------------------------------------------------------------------------
// Loading

const loadedModules = new Map<string, ComponentType>();
const loadedSources = new Map<string, string>();

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; value: T };

/** Loads once per `attempt` and caches by key, without a synchronous setState in the effect body. */
function useCachedLoad<T>(key: string, cache: Map<string, T>, load: () => Promise<T>, attempt = 0, enabled = true): LoadState<T> {
  const [state, setState] = useState<{ key: string; attempt: number; value?: T; error?: true } | null>(null);
  const loadRef = useLatestRef(load);
  const cached = cache.get(key);
  useEffect(() => {
    if (!enabled || cached !== undefined) return;
    let alive = true;
    loadRef.current().then(
      (value) => {
        cache.set(key, value);
        if (alive) setState({ key, attempt, value });
      },
      () => {
        if (alive) setState({ key, attempt, error: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [key, attempt, enabled, cached, cache, loadRef]);
  if (cached !== undefined) return { status: "ready", value: cached };
  if (state?.key !== key || state.attempt !== attempt) return { status: "loading" };
  return state.error ? { status: "error" } : { status: "ready", value: state.value as T };
}

function useTemplateModule(entry: TemplateEntry, attempt = 0, enabled = true) {
  return useCachedLoad(entry.slug, loadedModules, entry.load, attempt, enabled);
}

function useTemplateSource(entry: TemplateEntry, attempt = 0) {
  return useCachedLoad(entry.slug, loadedSources, entry.loadSource, attempt);
}

// ---------------------------------------------------------------------------------------------
// Frame: renders a template at a logical width and scales it down to fit (the real layout at that
// width, since templates respond to their container, not the viewport).

function ScaledFrame({ width, children, className }: { width: number | null; children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const outer = useElementSize(outerRef);
  const inner = useElementSize(innerRef, { box: "border-box" });
  const scale = width !== null && outer.width > 0 ? Math.min(1, outer.width / width) : 1;
  const shownWidth = width === null ? undefined : width * scale;
  return (
    <div ref={outerRef} className={cn("w-full min-w-0", className)}>
      <div
        style={{ width: shownWidth, height: inner.height > 0 ? inner.height * scale : undefined }}
        className="relative mx-auto overflow-hidden"
      >
        <div
          ref={innerRef}
          style={{ width: width ?? "100%", transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** A theme-preset island: preset null follows the site. */
function PresetIsland({ preset, children }: { preset: string | null; children: ReactNode }) {
  return (
    <div data-pui-theme={preset ?? undefined} className="bg-pui-background font-pui-sans text-pui-foreground">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Gallery

function TemplateThumb({ entry, playing }: { entry: TemplateEntry; playing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // Mount within 200px of the viewport, unmount once far away again.
        setNear(entries.some((item) => item.isIntersecting));
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const state = useTemplateModule(entry, 0, near);
  const Template = near && state.status === "ready" ? state.value : null;
  return (
    <div
      ref={ref}
      inert
      aria-hidden="true"
      data-poster={playing ? "playing" : "paused"}
      className="pointer-events-none relative aspect-[16/10] select-none overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background"
    >
      {Template ? (
        <MotionConfig reducedMotion={playing ? "user" : "always"}>
          <ScaledFrame width={1280}>
            <PresetIsland preset={null}>
              <Template />
            </PresetIsland>
          </ScaledFrame>
        </MotionConfig>
      ) : (
        <div className="flex size-full flex-col gap-3 p-6">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-auto h-20 w-full" />
        </div>
      )}
    </div>
  );
}

function TemplateCard({ entry, playAll }: { entry: TemplateEntry; playAll: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Stretched-link card: the live thumbnail renders the template's own links and buttons, so it
  // must never sit inside an <a>. It stays inert + aria-hidden beside the one real link (the
  // title), whose ::after covers the whole card for pointer clicks.
  return (
    <li
      className="group relative h-full list-none rounded-pui-xl has-[a[data-card-link]:focus-visible]:outline-2 has-[a[data-card-link]:focus-visible]:outline-offset-2 has-[a[data-card-link]:focus-visible]:outline-pui-ring"
      data-testid="template-card"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <SpotlightCard className="flex h-full flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-3 transition-[box-shadow,translate] duration-(--pui-duration-base) group-hover:-translate-y-0.5 group-hover:shadow-pui-lg motion-reduce:transition-none">
        <TemplateThumb entry={entry} playing={playAll || hovered || focused} />
        <div className="flex flex-col gap-1 px-1 pb-1">
          <div className="flex items-center justify-between gap-2">
            <a
              href={templateHref(entry.slug)}
              data-card-link=""
              onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
              onBlur={() => setFocused(false)}
              className="truncate font-semibold text-pui-surface-foreground no-underline outline-hidden after:absolute after:inset-0 after:z-10 after:rounded-pui-xl after:content-['']"
            >
              {entry.title}
            </a>
            <Badge size="sm" variant="soft" tone="neutral">
              {entry.group}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm text-pui-muted-foreground">{entry.description}</p>
        </div>
      </SpotlightCard>
    </li>
  );
}

export function TemplatesPage({ group }: { group: string | null }) {
  const [playAll, setPlayAll] = useState(false);
  const groups = TEMPLATE_GROUPS.filter((name) => templates.some((entry) => entry.group === name));
  const selected = groups.find((name) => tagSlug(name) === group) ?? null;
  const shown = selected ? templates.filter((entry) => entry.group === selected) : templates;
  return (
    <div className="flex flex-col gap-10 pb-16">
      <section className="relative isolate overflow-hidden border-b border-pui-border px-4 pb-10 pt-10 sm:px-8 sm:pt-14">
        <GridPattern mask="none" className="-z-10 [mask-image:radial-gradient(60%_80%_at_15%_0%,black,transparent)]" />
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-pui-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={homeHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
                Home
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-pui-foreground">
              Templates
            </li>
          </ol>
        </nav>
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl">
          Templates
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-pui-muted-foreground sm:text-lg">
          Ready-made page sections built only from library pieces. Preview them at any width and in any theme preset, then copy the
          single file into your app. Templates are not part of the npm package.
        </p>
        <p className="mt-2 text-sm tabular-nums text-pui-muted-foreground">
          {templates.length} templates in {groups.length} groups
        </p>
      </section>
      <div className="flex flex-col gap-8 px-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <SegmentedControl
              aria-label="Filter templates by group"
              value={selected ? tagSlug(selected) : "all"}
              onValueChange={(next) => navigate(templatesHref(next === "all" ? null : next))}
              size="sm"
            >
              <SegmentedControlItem value="all">
                All <span className="ms-1 tabular-nums text-pui-muted-foreground">{templates.length}</span>
              </SegmentedControlItem>
              {groups.map((name) => (
                <SegmentedControlItem key={name} value={tagSlug(name)}>
                  {name}{" "}
                  <span className="ms-1 tabular-nums text-pui-muted-foreground">
                    {templates.filter((entry) => entry.group === name).length}
                  </span>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <p aria-live="polite" className="text-sm tabular-nums text-pui-muted-foreground">
              {shown.length} {shown.length === 1 ? "template" : "templates"}
            </p>
            <PlayAllSwitch checked={playAll} onCheckedChange={setPlayAll} />
          </div>
        </div>
        <ul aria-label="Templates" className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((entry) => (
            <TemplateCard key={entry.slug} entry={entry} playAll={playAll} />
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Detail

type WidthMode = "fill" | "1280" | "768" | "375";

const WIDTHS: { value: WidthMode; label: string; icon: ReactNode }[] = [
  {
    value: "fill",
    label: "Fill",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" />
      </svg>
    ),
  },
  {
    value: "1280",
    label: "Desktop",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
        <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
        <path d="M5.5 14h5M8 11.5V14" />
      </svg>
    ),
  },
  {
    value: "768",
    label: "Tablet",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
        <path d="M7 12.5h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "375",
    label: "Mobile",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4.5" y="1.5" width="7" height="13" rx="1.5" />
        <path d="M7.25 12.5h1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SITE = "site";

const presetLabel = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function Swatch({ preset }: { preset: string | null }) {
  return (
    <span
      aria-hidden="true"
      data-pui-theme={preset ?? undefined}
      className="inline-flex size-3.5 shrink-0 overflow-hidden rounded-pui-full border border-pui-border"
    >
      <span className="h-full w-1/2 bg-pui-primary" />
      <span className="h-full w-1/2 bg-pui-gradient-2" />
    </span>
  );
}

function ErrorAlert({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      tone="danger"
      title="Could not load this template"
      action={
        <Button size="sm" variant="outline" tone="danger" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      The chunk failed to load. Check your connection, then retry.
    </Alert>
  );
}

function PreviewPane({ entry, width, preset }: { entry: TemplateEntry; width: WidthMode; preset: string | null }) {
  const [attempt, setAttempt] = useState(0);
  const [replay, setReplay] = useState(0);
  const state = useTemplateModule(entry, attempt);
  const logical = width === "fill" ? null : Number(width);
  const Template = state.status === "ready" ? state.value : null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="sr-only">Preview</h2>
      <div
        role="region"
        aria-label={`${entry.title} preview`}
        data-testid="template-stage"
        className="relative isolate overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/40 p-2 sm:p-4"
      >
        <GridPattern mask="radial" className="-z-10 opacity-50" />
        <div
          className={cn(
            "mx-auto overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background shadow-pui-lg transition-[max-width] duration-(--pui-duration-page) ease-pui-out motion-reduce:transition-none",
          )}
          style={{ maxWidth: logical === null ? "100%" : `${logical}px` }}
        >
          <div className="flex items-center gap-3 border-b border-pui-border bg-pui-surface px-3 py-2">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="size-2.5 rounded-pui-full bg-pui-danger/70" />
              <span className="size-2.5 rounded-pui-full bg-pui-warning/70" />
              <span className="size-2.5 rounded-pui-full bg-pui-success/70" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-pui-md bg-pui-muted px-2.5 py-0.5 text-center font-mono text-[11px] text-pui-muted-foreground">
              {entry.file}
              {logical !== null ? ` · ${logical}px` : ""}
            </span>
            <Tooltip content="Replay">
              <IconButton aria-label="Replay template" variant="ghost" tone="neutral" size="sm" onClick={() => setReplay((n) => n + 1)}>
                <ReplayIcon />
              </IconButton>
            </Tooltip>
          </div>
          {state.status === "error" ? (
            <div className="p-6">
              <ErrorAlert onRetry={() => setAttempt((n) => n + 1)} />
            </div>
          ) : state.status === "loading" ? (
            <div role="status" aria-busy="true" className="flex min-h-96 flex-col items-center justify-center gap-4 p-10">
              <span className="sr-only">Loading template</span>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-3/4 max-w-xl" />
              <Skeleton className="h-4 w-1/2 max-w-md" />
            </div>
          ) : Template ? (
            <MotionConfig reducedMotion="user">
              <ScaledFrame width={logical}>
                <PresetIsland preset={preset}>
                  <Template key={replay} />
                </PresetIsland>
              </ScaledFrame>
            </MotionConfig>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CodePane({ entry }: { entry: TemplateEntry }) {
  const [attempt, setAttempt] = useState(0);
  const state = useTemplateSource(entry, attempt);
  if (state.status === "error") return <ErrorAlert onRetry={() => setAttempt((n) => n + 1)} />;
  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading source</span>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  const source = state.value;
  const uses = templateUses(source).flatMap((name) => {
    const meta = registryMeta.find((m) => m.slug === name);
    return meta ? [meta] : [];
  });
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="template-uses" className="flex flex-col gap-3">
        <h2 id="template-uses" className="text-lg font-semibold tracking-tight">
          Library items used <span className="ms-1 text-sm font-normal tabular-nums text-pui-muted-foreground">{uses.length}</span>
        </h2>
        <ul className="flex flex-wrap gap-2">
          {uses.map((meta) => (
            <li key={meta.slug}>
              <a
                href={itemHref(meta.category, meta.slug)}
                className="inline-flex items-center gap-1.5 rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1 text-sm transition-colors hover:border-pui-primary/50 hover:text-pui-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
              >
                {meta.title}
                <span className="text-xs text-pui-muted-foreground">{CATEGORY_LABELS[meta.category]}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="template-setup" className="flex flex-col gap-3">
        <h2 id="template-setup" className="text-lg font-semibold tracking-tight">
          Setup
        </h2>
        <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm text-pui-muted-foreground marker:text-pui-muted-foreground">
          <li>Install the library and Motion, and import the styles once (see Installation).</li>
          <li>
            Copy the file below to <code className="rounded-pui-sm bg-pui-muted px-1 font-mono text-pui-foreground">{entry.file.replace("templates/", "src/sections/")}</code> and edit the copy.
          </li>
          <li>Render it anywhere: it adapts to its container width, so it also works in narrow columns.</li>
        </ol>
        <CodeBlock code={INSTALL_COMMAND} copyLabel="Copy install command" />
      </section>
      <section aria-labelledby="template-source" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="template-source" className="text-lg font-semibold tracking-tight">
            <span className="font-mono text-base">{entry.file}</span>
          </h2>
          <CopyButton value={source} label="Copy template source" showLabel size="sm" variant="outline" tone="neutral" />
        </div>
        <CodeBlock code={source} copy={false} data-testid="template-source" />
      </section>
    </div>
  );
}

export function TemplatePage({ entry, tab }: { entry: TemplateEntry; tab: Tab }) {
  const [width, setWidth] = useState<WidthMode>("fill");
  const [preset, setPreset] = useState<string>(SITE);
  const index = templates.findIndex((t) => t.slug === entry.slug);
  const prev = index > 0 ? templates[index - 1] : undefined;
  const next = index < templates.length - 1 ? templates[index + 1] : undefined;
  return (
    <div className="flex flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="text-sm text-pui-muted-foreground">
        <ol className="flex items-center gap-1.5">
          <li>
            <a href={homeHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
              Home
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a href={templatesHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
              Templates
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-pui-foreground">
            {entry.title}
          </li>
        </ol>
      </nav>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl">
            {entry.title}
          </h1>
          <Badge variant="soft" tone="neutral">
            {entry.group}
          </Badge>
          <Badge variant="outline" tone="primary">
            Copy-only
          </Badge>
        </div>
        <p className="max-w-3xl text-pretty text-pui-muted-foreground sm:text-lg">{entry.description}</p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl aria-label="View" value={tab} onValueChange={(value) => navigate(templateHref(entry.slug, value as Tab))}>
          <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
          <SegmentedControlItem value="code">Code</SegmentedControlItem>
        </SegmentedControl>
        {tab === "preview" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <SegmentedControl aria-label="Preview width" value={width} onValueChange={(value) => setWidth(value as WidthMode)} size="sm">
                {WIDTHS.map((option) => (
                  <SegmentedControlItem key={option.value} value={option.value} icon={option.icon}>
                    {option.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
            <Select value={preset} onValueChange={setPreset} size="sm">
              <SelectTrigger aria-label="Theme preset" className="w-40" />
              <SelectContent align="end">
                <SelectItem value={SITE} icon={<Swatch preset={null} />}>
                  Site theme
                </SelectItem>
                {THEME_PRESETS.map((name) => (
                  <SelectItem key={name} value={name} icon={<Swatch preset={name} />}>
                    {presetLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {tab === "preview" ? (
        <PreviewPane entry={entry} width={width} preset={preset === SITE ? null : preset} />
      ) : (
        <CodePane entry={entry} />
      )}

      <nav aria-label="More templates" className="mt-4 grid gap-3 border-t border-pui-border pt-6 sm:grid-cols-2">
        {prev ? (
          <a
            href={templateHref(prev.slug)}
            className="group flex flex-col rounded-pui-lg border border-pui-border p-4 transition-colors hover:border-pui-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <span className="text-xs text-pui-muted-foreground">Previous</span>
            <span className="font-medium group-hover:text-pui-primary-text">← {prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a
            href={templateHref(next.slug)}
            className="group flex flex-col items-end rounded-pui-lg border border-pui-border p-4 text-end transition-colors hover:border-pui-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <span className="text-xs text-pui-muted-foreground">Next</span>
            <span className="font-medium group-hover:text-pui-primary-text">{next.title} →</span>
          </a>
        ) : null}
      </nav>
    </div>
  );
}
