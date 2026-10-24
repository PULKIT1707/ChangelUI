import { Button, EmptyState, Input, type EmptyStateProps, type EmptyStateVariant } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  variant: EmptyStateVariant;
  size: NonNullable<EmptyStateProps["size"]>;
  bordered: boolean;
  query: string;
};
const defaults: DemoProps = { variant: "no-data", size: "md", bordered: true, query: "quarterly report" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["no-data", "no-results", "error"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "boolean", prop: "bordered", label: "Bordered" },
  { type: "text", prop: "query", label: "Query (no-results)", maxLength: 40 },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="w-full max-w-lg">
      <EmptyState
        variant={props.variant}
        size={props.size}
        bordered={props.bordered}
        query={props.variant === "no-results" ? props.query : undefined}
        onClearFilters={() => undefined}
        onRetry={() => undefined}
        title={props.variant === "no-data" ? "No projects yet" : undefined}
        description={props.variant === "no-data" ? "Create a project to start tracking deploys, previews and logs." : undefined}
        actions={
          props.variant === "no-data" ? (
            <>
              <Button size="sm">New project</Button>
              <Button size="sm" variant="ghost" tone="neutral">
                Import
              </Button>
            </>
          ) : undefined
        }
        footer={props.variant === "error" ? "Error ID 7f3a-21 · status page" : undefined}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <EmptyState size="sm" title="No projects yet" description="Create one to get started." />
    </div>
  );
}
const people = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus Torvalds"];
/** Live search: the list empties into a no-results state that echoes the query. */
function SearchDemo() {
  const [q, setQ] = useState("hopper x");
  const hits = people.filter((p) => p.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <Input aria-label="Search people" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {hits.map((p) => (
            <li key={p} className="rounded-pui-md px-2 py-1.5 text-sm">
              {p}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState size="sm" variant="no-results" query={q.trim()} onClearFilters={() => setQ("")} clearLabel="Clear search" />
      )}
    </div>
  );
}
/** Table body: an error with retry that recovers to data. */
function TableDemo() {
  const [state, setState] = useState<"error" | "loading" | "ok">("error");
  const retry = () => {
    setState("loading");
    window.setTimeout(() => setState("ok"), 900);
  };
  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <div className="grid grid-cols-3 border-b border-pui-border bg-pui-muted/50 px-4 py-2 text-xs font-medium text-pui-muted-foreground">
        <span>Invoice</span>
        <span>Customer</span>
        <span className="text-end">Amount</span>
      </div>
      {state === "ok" ? (
        <div className="flex flex-col">
          {[
            ["INV-0412", "Acme Co", "$1,200.00"],
            ["INV-0413", "Globex", "$860.00"],
          ].map(([a, b, c]) => (
            <div key={a} className="grid grid-cols-3 border-b border-pui-border px-4 py-2.5 text-sm last:border-0">
              <span className="font-pui-mono text-xs">{a}</span>
              <span>{b}</span>
              <span className="text-end tabular-nums">{c}</span>
            </div>
          ))}
          <Button size="sm" variant="ghost" tone="neutral" className="m-2 self-start" onClick={() => setState("error")}>
            Simulate failure
          </Button>
        </div>
      ) : (
        <EmptyState
          size="sm"
          variant="error"
          title={state === "loading" ? "Retrying…" : "Couldn't load invoices"}
          description="The billing service didn't respond in time."
          onRetry={state === "loading" ? undefined : retry}
        />
      )}
    </div>
  );
}
/** Custom icon and copy for a first-run inbox. */
function InboxDemo() {
  return (
    <div className="mx-auto w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-background">
      <EmptyState
        title="Inbox zero"
        description="You're caught up. New mentions and assignments land here."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-full">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        }
        actions={
          <Button size="sm" variant="soft">
            Notification settings
          </Button>
        }
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = [`variant="${props.variant}"`];
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.bordered) attrs.push("bordered");
    if (props.variant === "no-results") attrs.push(`query={query}`, "onClearFilters={clearFilters}");
    if (props.variant === "error") attrs.push("onRetry={refetch}");
    if (props.variant === "no-data") attrs.push('title="No projects yet"', 'actions={<Button size="sm">New project</Button>}');
    return `<EmptyState\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<EmptyStateProps>()([
    { name: "variant", type: '"no-data" | "no-results" | "error"', default: '"no-data"', description: "Icon, default copy and tone." },
    { name: "title", type: "ReactNode", default: "per variant", description: "Heading; no-results echoes the query." },
    { name: "description", type: "ReactNode", default: "per variant", description: "Supporting text." },
    { name: "icon", type: "ReactNode", description: "Replaces the variant icon on the front card." },
    { name: "query", type: "string", description: "Search text that found nothing." },
    { name: "onClearFilters", type: "() => void", description: 'Shows "Clear filters" (no-results).' },
    { name: "clearLabel", type: "string", default: '"Clear filters"', description: "Clear button text." },
    { name: "onRetry", type: "() => void", description: 'Shows "Try again" (error).' },
    { name: "retryLabel", type: "string", default: '"Try again"', description: "Retry button text." },
    { name: "actions", type: "ReactNode", description: "Your buttons, after the built-in ones." },
    { name: "footer", type: "ReactNode", description: "Small print under the actions." },
    { name: "titleAs", type: '"h2" | "h3" | "h4" | "p"', default: '"h3"', description: "Heading element for the outline." },
    { name: "bordered", type: "boolean", default: "false", description: "Dashed outline." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Inline (sm) or page-level (md)." },
  ]),
  a11y: [
    "The title is a real heading (titleAs picks the level) and names the container.",
    'no-results and error use role="status", so screen readers hear when a search or load comes back empty.',
    "The illustration is decorative (aria-hidden); every action is a labelled button.",
  ],
  reducedMotion: "The card fan and pop-in are skipped; hover lift is off.",
  examples: [
    { title: "Live search", description: "Type to filter; the empty state echoes the query and clears it.", Demo: SearchDemo },
    { title: "Table error", description: "Retry recovers to rows.", Demo: TableDemo },
    { title: "Custom icon", description: "First-run inbox with your own copy.", Demo: InboxDemo, wide: true },
  ],
};
export default item;
