import {
  Alert,
  Badge,
  Button,
  CopyButton,
  GridPattern,
  IconButton,
  ScrollProgress,
  SegmentedControl,
  SegmentedControlItem,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  Tooltip,
} from "changelui";
import { cn } from "@pui-src/lib/cn";
import { useLatestRef } from "@pui-src/lib/use-latest-ref";
import { useEffect, useRef, useState } from "react";
import { ENTRIES } from "../../../scripts/entries";
import { CodeBlock } from "../components/code-block";
import { ControlsPanel } from "../components/controls-panel";
import { DemoErrorBoundary } from "../components/demo-error-boundary";
import { PropsTable } from "../components/props-table";
import { analytics } from "../lib/analytics/client";
import type { ValueType } from "../lib/analytics/events";
import { CATEGORY_LABELS } from "../lib/nav";
import { loadItemSources, type ItemSources } from "../lib/sources";
import { wrapJsx } from "../lib/to-jsx";
import { registry } from "../registry";
import type { ControlSpec, ItemModule, RegistryEntry } from "../registry/types";
import { homeHref, itemHref, navigate, type Tab } from "../router";

type Values = Record<string, unknown>;

/** control_changed is sent at most once per component + prop in this window (sliders fire per step). */
const CONTROL_THROTTLE_MS = 1500;

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; value: T };

/** Loads once per `attempt` without a synchronous setState in the effect body (design 6). */
function useLoader<T>(load: () => Promise<T>, attempt: number, onError?: () => void): LoadState<T> {
  const [state, setState] = useState<{ attempt: number; value?: T; error?: true } | null>(null);
  const loadRef = useLatestRef(load);
  const onErrorRef = useLatestRef(onError);
  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (value) => {
        if (alive) setState({ attempt, value });
      },
      () => {
        if (!alive) return;
        setState({ attempt, error: true });
        onErrorRef.current?.();
      },
    );
    return () => {
      alive = false;
    };
  }, [attempt, loadRef, onErrorRef]);
  if (state?.attempt !== attempt) return { status: "loading" };
  return state.error ? { status: "error" } : { status: "ready", value: state.value as T };
}

function ErrorAlert({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Alert
      tone="danger"
      title={title}
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

function PreviewTab({
  entry,
  module,
  values,
  setValues,
}: {
  entry: RegistryEntry;
  module: ItemModule;
  values: Values;
  setValues: (next: Values | null) => void;
}) {
  const [replay, setReplay] = useState(0);
  const lastControl = useRef(new Map<string, number>());
  const { Preview } = module;
  const controls = module.controls as ControlSpec<Values>[];
  // Only the prop and its control kind are sent, never the value.
  const trackControl = (component: string, prop: string, valueType: ValueType) => {
    const key = `${component}:${prop}`;
    const now = Date.now();
    const last = lastControl.current.get(key);
    if (last !== undefined && now - last < CONTROL_THROTTLE_MS) return;
    lastControl.current.set(key, now);
    analytics.track("control_changed", { component, prop, value_type: valueType });
  };
  // Long one-line tags go one prop per line (Prettier style), so nothing runs under the copy button.
  const snippet = wrapJsx(module.snippet(values));
  const isChart = entry.category === "charts";
  return (
    <div className="flex flex-col gap-4">
      {/* Demo headings (h3 in cards) need an h2 above them for a valid heading order. */}
      <h2 className="sr-only">Preview</h2>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          role="region"
          aria-label="Preview"
          data-testid="preview-stage"
          className={cn(
            // Every demo starts at the top with the same padding and the stage grows with tall
            // demos; centering inside a stage stretched by a tall controls panel left a large gap
            // above the demo and pushed its bottom out of view.
            "relative isolate flex min-h-[320px] min-w-0 items-start justify-center overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background p-4 sm:p-6",
            // Keep content clear of the replay button (chart demo headers sit in the top row).
            isChart && entry.replayable ? "[&_[data-chart-demo-head]]:pe-9" : null,
          )}
        >
          <GridPattern mask="radial" className="-z-10 opacity-60" />
          {entry.replayable ? (
            <Tooltip content="Replay animation">
              <IconButton
                aria-label="Replay animation"
                variant="ghost"
                tone="neutral"
                size="sm"
                onClick={() => setReplay((n) => n + 1)}
                className="absolute right-2 top-2 z-10"
              >
                <ReplayIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <div data-testid="preview-root" className="flex w-full min-w-0 items-start justify-center">
            <DemoErrorBoundary component={entry.slug}>
              <Preview key={replay} props={values} />
            </DemoErrorBoundary>
          </div>
        </div>
        <ControlsPanel
          controls={controls}
          values={values}
          onChange={(prop, value) => {
            setValues({ ...values, [prop]: value });
            const spec = controls.find((c) => c.prop === prop);
            if (spec) trackControl(entry.slug, prop, spec.type);
          }}
          onReset={() => {
            setValues(null);
            analytics.track("controls_reset", { component: entry.slug });
          }}
        />
      </div>
      <CodeBlock
        code={snippet}
        copyLabel="Copy snippet"
        data-testid="snippet"
        analytics={{ snippet: "usage", surface: "item_page", component: entry.slug }}
      />
      {module.examples && module.examples.length > 0 ? (
        <section aria-labelledby="examples-heading" className="flex flex-col gap-4 pt-4">
          <h2 id="examples-heading" className="text-xl font-semibold tracking-tight">
            Examples
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {module.examples.map(({ title, description, Demo, wide }) => (
              <div
                key={title}
                className={`flex min-w-0 flex-col gap-3 rounded-pui-lg border border-pui-border bg-pui-background p-4 sm:p-5${wide ? " lg:col-span-2" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  {description ? <p className="text-xs text-pui-muted-foreground">{description}</p> : null}
                </div>
                <DemoErrorBoundary component={entry.slug}>
                  <Demo />
                </DemoErrorBoundary>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CodeTab({ component, state, onRetry }: { component: string; state: LoadState<ItemSources>; onRetry: () => void }) {
  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "error") return <ErrorAlert title="Couldn't load source" onRetry={onRetry} />;
  const { ordered, npm } = state.value;
  const first = ordered[0]?.path ?? "";
  const install = npm.length > 0 ? `npm install ${npm.join(" ")}` : null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pui-muted-foreground">
        Copy the item file{ordered.length > 1 ? " and the files it imports (Also copy)" : ""}. Imports are relative, so
        keep the <code className="font-mono text-pui-foreground">src/</code> layout or rewrite the paths.
      </p>
      <Tabs defaultValue={first}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Source files" variant="pill" size="sm">
            {ordered.map((file) => (
              <TabsTrigger key={file.path} value={file.path}>
                {file.path.replace(/^src\//, "")}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {ordered.map((file, index) => (
          <TabsContent key={file.path} value={file.path} className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-pui-muted-foreground">
                {index === 0 ? file.path : `Also copy: ${file.path}`}
              </span>
              <CopyButton
                value={file.source}
                label={`Copy ${file.path}`}
                size="sm"
                variant="outline"
                tone="neutral"
                data-testid="copy-source"
                onCopied={() => analytics.track("code_copied", { component, snippet_kind: "source", surface: "item_page" })}
              />
            </div>
            <CodeBlock code={file.source} copy={false} data-testid="source-code" />
          </TabsContent>
        ))}
      </Tabs>
      {install ? (
        <div className="flex items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface py-1.5 pe-1.5 ps-4 font-mono text-sm">
          <span className="text-pui-muted-foreground">npm deps:</span>
          <code className="min-w-0 flex-1 truncate">{install}</code>
          <CopyButton
            value={install}
            label="Copy npm install command"
            size="sm"
            variant="ghost"
            tone="neutral"
            onCopied={() => analytics.track("code_copied", { component, snippet_kind: "install", surface: "item_page" })}
          />
        </div>
      ) : (
        <p className="text-sm text-pui-muted-foreground">No npm dependencies beyond React.</p>
      )}
    </div>
  );
}

export function ItemPage({ entry, tab }: { entry: RegistryEntry; tab: Tab }) {
  const lib = ENTRIES.find((e) => e.name === entry.slug);
  const file = lib?.file ?? `src/${entry.category}/${entry.slug}.tsx`;
  const [moduleAttempt, setModuleAttempt] = useState(0);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [values, setValues] = useState<Values | null>(null);
  const [importFrom, setImportFrom] = useState<"package" | "subpath">("package");
  const moduleState = useLoader(
    () => entry.load().then((m) => m.default),
    moduleAttempt,
    () => analytics.track("demo_error", { component: entry.slug, phase: "load", error_name: "ChunkLoadError", error_message: "" }),
  );
  const sourceState = useLoader(() => loadItemSources(file), sourceAttempt, () => toast.danger("Couldn't load source"));
  const itemModule = moduleState.status === "ready" ? moduleState.value : null;
  const usesMotion = sourceState.status === "ready" && sourceState.value.npm.includes("motion");

  const siblings = registry.filter((r) => r.category === entry.category);
  const index = siblings.findIndex((r) => r.slug === entry.slug);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index < siblings.length - 1 ? siblings[index + 1] : undefined;
  // Long export lists go one per line (Prettier style) so the line never runs under the copy button.
  const oneLine = `{ ${entry.exports.join(", ")} }`;
  const subpathLength = `import ${oneLine} from "changelui/${entry.slug}";`.length;
  const names = subpathLength > 80 ? `{\n${entry.exports.map((name) => `  ${name},`).join("\n")}\n}` : oneLine;
  const importLine = `import ${names} from "changelui";`;
  const subpathLine = `import ${names} from "changelui/${entry.slug}";`;

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-10">
      <ScrollProgress className="top-14" />
      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-pui-muted-foreground">
            <li>
              <a href={homeHref(entry.category)} className="hover:text-pui-foreground hover:underline">
                {CATEGORY_LABELS[entry.category]}
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-pui-foreground">
              {entry.title}
            </li>
          </ol>
        </nav>
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          {entry.title}
        </h1>
        <p className="max-w-2xl text-pretty text-base text-pui-muted-foreground">{entry.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" tone="neutral" className="font-mono">
            changelui/{entry.slug}
          </Badge>
          {usesMotion ? (
            <Badge variant="soft" tone="info">
              Motion
            </Badge>
          ) : null}
          {lib?.client ? (
            <Badge variant="soft" tone="neutral">
              Client
            </Badge>
          ) : null}
          {entry.isNew ? (
            <Badge variant="soft" tone="primary">
              New
            </Badge>
          ) : null}
        </div>
        {/* One import block with a package/subpath switch, so long export lists don't stack twice. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl
              aria-label="Import from"
              size="sm"
              value={importFrom}
              onValueChange={(v) => setImportFrom(v === "subpath" ? "subpath" : "package")}
            >
              <SegmentedControlItem value="package">Package</SegmentedControlItem>
              <SegmentedControlItem value="subpath">Subpath</SegmentedControlItem>
            </SegmentedControl>
            <p className="text-xs text-pui-muted-foreground">
              {importFrom === "package" ? "Everything from one entry, tree-shaken by your bundler." : "Only this item's own entry file."}
            </p>
          </div>
          {importFrom === "package" ? (
            <CodeBlock
              code={importLine}
              copyLabel="Copy import"
              data-testid="import-line"
              analytics={{ snippet: "import", surface: "item_page", component: entry.slug }}
            />
          ) : (
            <CodeBlock
              code={subpathLine}
              copyLabel="Copy subpath import"
              data-testid="subpath-import-line"
              analytics={{ snippet: "import", surface: "item_page", component: entry.slug }}
            />
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => navigate(itemHref(entry.category, entry.slug, value as Tab))}>
        <TabsList aria-label="View" variant="underline">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="pt-6">
          {itemModule ? (
            <PreviewTab entry={entry} module={itemModule} values={values ?? itemModule.defaults} setValues={setValues} />
          ) : moduleState.status === "error" ? (
            <ErrorAlert title="Couldn't load the preview" onRetry={() => setModuleAttempt((n) => n + 1)} />
          ) : (
            <Skeleton className="h-80 w-full rounded-pui-lg" />
          )}
        </TabsContent>
        <TabsContent value="code" className="pt-6">
          <CodeTab component={entry.slug} state={sourceState} onRetry={() => setSourceAttempt((n) => n + 1)} />
        </TabsContent>
      </Tabs>

      {itemModule ? (
        <>
          <section aria-labelledby="api-heading" className="flex flex-col gap-4">
            <h2 id="api-heading" className="text-xl font-semibold tracking-tight">
              API
            </h2>
            <PropsTable title={entry.exports[0] ?? entry.title} docs={itemModule.propsTable} />
          </section>
          {itemModule.keyboard && itemModule.keyboard.length > 0 ? (
            <section aria-labelledby="keyboard-heading" className="flex flex-col gap-4">
              <h2 id="keyboard-heading" className="text-xl font-semibold tracking-tight">
                Keyboard
              </h2>
              <table className="w-full border-collapse overflow-hidden rounded-pui-lg text-left text-sm">
                <caption className="sr-only">Keyboard interactions</caption>
                <thead className="bg-pui-muted text-xs uppercase tracking-wide text-pui-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Keys
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemModule.keyboard.map((row) => (
                    <tr key={row.keys} className="border-t border-pui-border">
                      {/* Long key lists wrap below sm, so the table fits a 360px viewport (AC-29). */}
                      <th scope="row" className="px-3 py-2 font-mono text-[13px] font-medium sm:whitespace-nowrap">
                        {row.keys}
                      </th>
                      <td className="px-3 py-2 text-pui-muted-foreground">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {itemModule.a11y && itemModule.a11y.length > 0 ? (
            <section aria-labelledby="a11y-heading" className="flex flex-col gap-3">
              <h2 id="a11y-heading" className="text-xl font-semibold tracking-tight">
                Accessibility
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-pui-muted-foreground">
                {itemModule.a11y.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {itemModule.reducedMotion ? (
            <section aria-labelledby="motion-heading" className="flex flex-col gap-3">
              <h2 id="motion-heading" className="text-xl font-semibold tracking-tight">
                Reduced motion
              </h2>
              <p className="text-sm text-pui-muted-foreground">{itemModule.reducedMotion}</p>
            </section>
          ) : null}
        </>
      ) : null}

      <nav aria-label="Previous and next" className="grid gap-3 border-t border-pui-border pt-6 sm:grid-cols-2">
        {prev ? (
          <a
            href={itemHref(prev.category, prev.slug)}
            rel="prev"
            className="flex flex-col rounded-pui-lg border border-pui-border p-4 transition-colors hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <span className="text-xs text-pui-muted-foreground">Previous</span>
            <span className="font-medium">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a
            href={itemHref(next.category, next.slug)}
            rel="next"
            className="flex flex-col rounded-pui-lg border border-pui-border p-4 text-right transition-colors hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring sm:col-start-2"
          >
            <span className="text-xs text-pui-muted-foreground">Next</span>
            <span className="font-medium">{next.title}</span>
          </a>
        ) : null}
      </nav>
    </article>
  );
}
