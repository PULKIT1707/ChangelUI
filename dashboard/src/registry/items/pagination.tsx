import { Badge, Pagination, SegmentedControl, SegmentedControlItem, type PaginationProps } from "changelui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  count: number;
  siblings: number;
  boundaries: number;
  mode: "pages" | "compact";
  size: "sm" | "md" | "lg";
  variant: "soft" | "outline" | "ghost";
  showPrevNext: boolean;
  showFirstLast: boolean;
  jumpOnEllipsis: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  count: 20,
  siblings: 1,
  boundaries: 1,
  mode: "pages",
  size: "md",
  variant: "soft",
  showPrevNext: true,
  showFirstLast: false,
  jumpOnEllipsis: true,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Pages", min: 1, max: 60, step: 1 },
  { type: "number", prop: "siblings", label: "Siblings", min: 0, max: 3, step: 1 },
  { type: "number", prop: "boundaries", label: "Boundaries", min: 1, max: 3, step: 1 },
  { type: "select", prop: "mode", label: "Mode", options: ["pages", "compact"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "variant", label: "Variant", options: ["soft", "outline", "ghost"] },
  { type: "boolean", prop: "showPrevNext", label: "Prev / next" },
  { type: "boolean", prop: "showFirstLast", label: "First / last" },
  { type: "boolean", prop: "jumpOnEllipsis", label: "Ellipsis jumps" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  const [page, setPage] = useState(7);
  const current = Math.min(page, props.count);
  const per = 10;
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Pagination {...props} page={current} onPageChange={setPage} />
      <p className="m-0 text-xs tabular-nums text-pui-muted-foreground" aria-live="polite">
        Showing {(current - 1) * per + 1}–{current * per} of {props.count * per} results
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <Pagination count={9} defaultPage={4} size="sm" tabIndex={-1} />
    </div>
  );
}

const people = Array.from({ length: 47 }, (_, i) => {
  const first = ["Ana", "Kenji", "Lea", "Omar", "Priya", "Jonas", "Maya", "Tomás", "Zoe", "Ibrahim"][i % 10] ?? "Ana";
  const last = ["Ruiz", "Sato", "Novak", "Haddad", "Iyer", "Berg", "Okafor", "Silva", "Park", "Diallo"][(i * 7) % 10] ?? "Ruiz";
  const roles = ["Engineer", "Designer", "PM", "Research", "Support"];
  const states = ["Active", "Invited", "Active", "Active", "Paused"];
  return { id: 1000 + i, name: `${first} ${last}`, role: roles[i % 5] ?? "Engineer", state: states[(i * 3) % 5] ?? "Active" };
});

/** A members table: rows per page plus Pagination; rows stagger in on every page change. */
function TableDemo() {
  const [page, setPage] = useState(1);
  const [per, setPer] = useState("5");
  const reduced = useReducedMotion();
  const size = Number(per);
  const count = Math.ceil(people.length / size);
  const current = Math.min(page, count);
  const rows = people.slice((current - 1) * size, current * size);
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-pui-border bg-pui-muted/40 text-start text-xs text-pui-muted-foreground">
            <th className="px-3 py-2 text-start font-medium">Name</th>
            <th className="px-3 py-2 text-start font-medium">Role</th>
            <th className="px-3 py-2 text-end font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={`${current}-${row.id}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: reduced ? 0 : i * 0.03 }}
              className="border-b border-pui-border last:border-b-0"
            >
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 text-pui-muted-foreground">{row.role}</td>
              <td className="px-3 py-2 text-end">
                <Badge size="sm" tone={row.state === "Active" ? "success" : row.state === "Invited" ? "info" : "neutral"}>
                  {row.state}
                </Badge>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pui-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-pui-muted-foreground">
          Rows
          <SegmentedControl
            size="sm"
            aria-label="Rows per page"
            value={per}
            onValueChange={(v) => {
              setPer(v);
              setPage(1);
            }}
          >
            {["5", "10", "20"].map((v) => (
              <SegmentedControlItem key={v} value={v}>
                {v}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <Pagination size="sm" variant="outline" count={count} page={current} onPageChange={setPage} label="Members pages" />
      </div>
    </div>
  );
}

const shots = [
  { title: "Aurora", from: "var(--pui-chart-1)", to: "var(--pui-chart-2)" },
  { title: "Dune", from: "var(--pui-chart-3)", to: "var(--pui-chart-4)" },
  { title: "Lagoon", from: "var(--pui-chart-2)", to: "var(--pui-chart-5)" },
  { title: "Ember", from: "var(--pui-chart-4)", to: "var(--pui-chart-3)" },
  { title: "Nocturne", from: "var(--pui-chart-5)", to: "var(--pui-chart-1)" },
  { title: "Meadow", from: "var(--pui-chart-2)", to: "var(--pui-chart-3)" },
  { title: "Glacier", from: "var(--pui-chart-1)", to: "var(--pui-chart-5)" },
];

/** A gallery with compact mode: the page rolls like an odometer and slides follow the direction. */
function GalleryDemo() {
  const [[page, dir], setState] = useState<[number, number]>([1, 1]);
  const reduced = useReducedMotion();
  const go = (next: number) => setState(([prev]) => [next, next > prev ? 1 : -1]);
  const shot = shots[page - 1] ?? shots[0];
  return (
    <div
      className="flex w-full flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && page < shots.length) go(page + 1);
        if (e.key === "ArrowLeft" && page > 1) go(page - 1);
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={page}
            custom={dir}
            initial={reduced ? { opacity: 0 } : { x: `${dir * 100}%`, opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: `${dir * -40}%`, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute inset-0 flex items-end p-4"
            style={{ background: `linear-gradient(135deg, ${shot?.from}, ${shot?.to})` }}
          >
            <span className="rounded-pui-md bg-black/35 px-2 py-1 text-sm font-medium text-white backdrop-blur">{shot?.title}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center">
        <Pagination mode="compact" count={shots.length} page={page} onPageChange={go} variant="ghost" label="Gallery" previousLabel="Previous photo" nextLabel="Next photo" pageLabel={(p) => `Photo ${p}`} />
      </div>
    </div>
  );
}

/** Links mode for crawlable archives: every page is a real href, and the click still updates state. */
function ArchiveDemo() {
  const [page, setPage] = useState(3);
  const [href, setHref] = useState("/blog/page/3");
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Pagination
        count={42}
        page={page}
        onPageChange={(p) => {
          setPage(p);
          setHref(p === 1 ? "/blog" : `/blog/page/${p}`);
        }}
        getPageHref={(p) => (p === 1 ? "#/blog" : `#/blog/page/${p}`)}
        showFirstLast
        siblings={2}
        variant="outline"
        onClick={(e) => {
          // Keep the dashboard route; a real app lets the link navigate.
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        }}
      />
      <code className="rounded-pui-md bg-pui-muted px-2 py-1 font-mono text-xs text-pui-foreground">{href}</code>
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
      `count={${p.count}}`,
      "page={page}",
      "onPageChange={setPage}",
      p.siblings !== 1 ? `siblings={${p.siblings}}` : "",
      p.boundaries !== 1 ? `boundaries={${p.boundaries}}` : "",
      p.mode !== "pages" ? `mode="${p.mode}"` : "",
      p.size !== "md" ? `size="${p.size}"` : "",
      p.variant !== "soft" ? `variant="${p.variant}"` : "",
      p.showPrevNext ? "" : "showPrevNext={false}",
      p.showFirstLast ? "showFirstLast" : "",
      p.jumpOnEllipsis ? "" : "jumpOnEllipsis={false}",
      p.disabled ? "disabled" : "",
    ].filter(Boolean);
    return `const [page, setPage] = useState(1);

<Pagination ${attrs.join(" ")} />

// Crawlable links
<Pagination count={42} page={page} onPageChange={setPage} getPageHref={(p) => \`/blog/page/\${p}\`} />

// Pure windowing helper
paginationRange(10, 20); // [1, "start-ellipsis", 9, 10, 11, "end-ellipsis", 20]`;
  },
  propsTable: propDocs<PaginationProps>()([
    { name: "count", type: "number", required: true, description: "Total number of pages." },
    { name: "page", type: "number", description: "Current page, 1-based (defaultPage, onPageChange)." },
    { name: "siblings", type: "number", default: "1", description: "Pages on each side of the current one." },
    { name: "boundaries", type: "number", default: "1", description: "Pages always shown at each end." },
    { name: "mode", type: '"pages" | "compact"', default: '"pages"', description: 'Windowed buttons, or "Page 3 of 20" with a rolling number.' },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "32 / 36 / 44 px buttons." },
    { name: "variant", type: '"soft" | "outline" | "ghost"', default: '"soft"', description: "Active pill style." },
    { name: "showPrevNext", type: "boolean", default: "true", description: "Previous and next buttons." },
    { name: "showFirstLast", type: "boolean", default: "false", description: "First and last buttons." },
    { name: "jumpOnEllipsis", type: "boolean", default: "true", description: "Ellipses jump by a window of pages (they show » on hover)." },
    { name: "getPageHref", type: "(page: number) => string", description: "Render pages as links; clicks still call onPageChange." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every control." },
    { name: "previousLabel", type: "string", default: '"Previous page"', description: "Accessible name of the previous button (also nextLabel, firstLabel, lastLabel)." },
    { name: "pageLabel", type: "(page: number) => string", description: "Accessible name of a page button. Default `Page ${p}`." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move between the page controls" },
    { keys: "Enter / Space", action: "Go to the focused page" },
  ],
  a11y: [
    'A nav landmark (label, default "Pagination") with a list of buttons or links.',
    'The current page has aria-current="page"; disabled prev/next use aria-disabled (links drop their href).',
    "Ellipsis buttons say where they go, e.g. \"Forward 3 pages, Page 12\".",
    "Compact mode announces \"Page 3 of 20\" politely while the visible number rolls.",
  ],
  reducedMotion: "The pill jumps to the new page and numbers swap without sliding.",
  examples: [
    { title: "Members table", description: "Rows per page plus a small outline Pagination; rows stagger in.", Demo: TableDemo, wide: true },
    { title: "Gallery", description: "Compact mode with a rolling page number and direction-aware slides.", Demo: GalleryDemo },
    { title: "Blog archive", description: "Links mode with first/last and two siblings.", Demo: ArchiveDemo },
  ],
};

export default item;
